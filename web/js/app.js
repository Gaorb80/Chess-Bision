// Giao diện: lấy PGN (link Lichess / file / dán) → tách bài → kiểm tra → tuỳ chọn → PDF hoặc Word.
// Ba bước dùng chung cột phiếu xem trước. Luật cờ do chess.js tính trong tach_bai.js.

import { tach, TEN_BEN, KIEU_DE, deIn } from "./tach_bai.js";
import { docLink, taiPgn, LoiLichess } from "./lichess.js";
import { ve, TEN_QUAN } from "./so_do.js";
import { dongNuoc } from "./ky_hieu.js";
import { taoPdf } from "./pdf.js";
import { tatCaMau, luuMau, xoaMau, logoThanhDataUrl, dataUrlThanhLogo, capDoChung } from "./mau_phieu.js";

const $ = (id) => document.getElementById(id);
const LUU = "chessbision.tuy-chon";
const PGN_TOI_DA = 20 * 1024 * 1024;   // ký tự; study Lichess lớn nhất chỉ vài trăm KB
const BAI_TOI_DA = 500;                // nhiều hơn thì trang xem trước quá nặng
const DE_DAI = 300;                    // ký tự: dài hơn thì ở 12 thế/trang một ô cao gần nửa trang
const KIEU_GAY = ["trai", "guong", "khong"];
const BO_CUC_MAU = { "2x2": 4, "2x3": 6, "3x4": 12 };

const TEN_THONG_BAO = {
  "full-game": "Bỏ qua (ván đầy đủ)",
  "empty-chapter": "Bỏ qua (chương trống)",
  "duplicate": "Bỏ qua (trùng thế cờ)",
  "illegal": "Bỏ qua (nước đi sai luật)",
  "multi-solution": "Nhiều đáp án",
  "merged-answer": "Đã ghép đáp án",
  "no-moves": "Chưa có đáp án",
  "qua-nhieu": "Quá nhiều bài",
};
const BO_QUA = ["empty-chapter", "full-game", "duplicate"];

let ws = null;            // phiếu vừa tách
let chon = [];            // chon[i]: có in bài i không
let quanSvg = null;
let logo = null;          // { loai, bytes, url } logo CLB đang dùng
let saoTay = false;       // giáo viên đã tự chọn số sao: không tự đổi nữa
let buocDangXem = 1;

const bao = (el, loai, text) => { el.innerHTML = text ? `<div class="tt ${loai}">${text}</div>` : ""; };
const thoat = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const trich = (s, n = 150) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

async function taiQuanSvg() {
  if (!quanSvg) {
    const cap = await Promise.all(TEN_QUAN.map(async (t) => [t, await (await fetch(`tai-nguyen/quan/${t}.svg`)).text()]));
    quanSvg = Object.fromEntries(cap);
  }
  return quanSvg;
}

// ---------- ba bước ----------

function diBuoc(so) {
  if (so > 1 && !ws) { $("o-link").focus(); return; }
  buocDangXem = so;
  $("buoc-1").hidden = so !== 1;
  $("khung-lam").hidden = so === 1;
  $("buoc-2").hidden = so !== 2;
  $("buoc-3").hidden = so !== 3;
  $("nut-tai-dau").hidden = so === 1;
  $("thanh-duoi").hidden = so === 1;
  for (const a of document.querySelectorAll("#buoc-nav a")) {
    const b = +a.dataset.buoc;
    if (b === so) a.setAttribute("aria-current", "step");
    else a.removeAttribute("aria-current");
    a.classList.toggle("xong", so > 1 && b < so);
  }
  capNhatNguon();
  if (so > 1) { veTomTat(); veXemTruoc(); }
  window.scrollTo(0, 0);
}

function capNhatNguon() {
  if (!ws) return;
  const soBai = chon.filter(Boolean).length;
  $("nguon-so").textContent = "1";
  if (buocDangXem === 3) {
    $("nguon-ten").textContent = `${soBai} bài đã chọn`;
    $("nguon-phu").textContent = `${ws.title || "Phiếu bài tập"} · đã đọc từ study Lichess`;
    $("nut-nguon").textContent = "Sửa danh sách";
  } else {
    $("nguon-ten").textContent = ws.title || "Study Lichess";
    $("nguon-phu").textContent = ws.source?.url || ws.source?.file || "PGN đã đọc";
    $("nut-nguon").textContent = "Đổi nguồn";
  }
}

// ---------- tuỳ chọn phiếu ----------

const boCuc = () => document.querySelector("input[name=bo-cuc]:checked")?.value || "2x3";
const moiTrang = () => BO_CUC_MAU[boCuc()] || 6;
const saoChon = () => +$("o-sao").value;
const kieuDe = () => $("o-kieu-de").value;
const bienSoan = () => $("o-bien-soan").value.trim();

// Số trang chỉ là ước tính: pdf.js tự xếp lại khi đề dài; số trang thật hiện ra sau khi tạo tệp.
function soTrang() {
  const soBai = chon.filter(Boolean).length;
  return Math.max(1, Math.ceil(soBai / moiTrang())) + ($("o-dap-an").checked ? 1 : 0);
}

function dongTomTat(nhan, giaTri) {
  return `<div><dt>${thoat(nhan)}</dt><dd>${thoat(giaTri)}</dd></div>`;
}

function veTomTat() {
  if (!ws) return;
  const soBai = chon.filter(Boolean).length;
  const tong = ws.exercises.length;
  const trang = soTrang();
  $("tom-tat").textContent = `${soBai} / ${tong}`;
  $("tom-tat-dem").textContent = `${tong} bài · khoảng ${trang} trang`;
  $("tom-tat-trang").textContent = `Khoảng ${trang} trang A4`;
  $("dem-bai").textContent = soBai;
  $("dem-trang").textContent = trang;

  const sao = saoChon();
  const capDo = $("o-cap-do").value.trim();
  const nhanSao = sao ? `${capDo ? capDo + " " : ""}${"★".repeat(sao)}` : "Không in";
  $("tom-tat-phieu").innerHTML = [
    dongTomTat("Bài in", `${soBai} bài`),
    dongTomTat("Số trang (ước tính)", `${trang} trang A4`),
    dongTomTat("Bố cục", `${moiTrang()} thế / trang`),
    dongTomTat("Cấp độ in", nhanSao),
    dongTomTat("Trang đáp án", $("o-dap-an").checked ? "Kèm ở cuối" : "Không kèm"),
    dongTomTat("Biên soạn", bienSoan() || "—"),
  ].join("");
  tomTatIn();
}

// Dòng nhắc cạnh nút tải: bài chưa có đáp án, đề dài nên in ít thế mỗi trang.
function tomTatIn() {
  if (!ws) return;
  const bai = ws.exercises.filter((_, i) => chon[i]);
  const thieu = bai.filter((e) => !e.solution.length).length;
  const deDai = bai.filter((e) => deIn(e, kieuDe()).length > DE_DAI).length;
  const nhac = [];
  if (thieu) nhac.push(`${thieu} bài đang chọn chưa có đáp án: trang đáp án sẽ ghi “(chưa có đáp án)”.`);
  if (deDai && boCuc() !== "2x2") nhac.push(`${deDai} bài có đề dài: phiếu sẽ tự in ít thế hơn mỗi trang cho đủ chữ; chọn “4 thế mỗi trang” để sơ đồ lớn và nhiều chỗ ghi hơn.`);
  $("nhac-in").innerHTML = nhac.map((t) => `<p>${thoat(t)}</p>`).join("");
  $("nhac-in").hidden = !nhac.length;
}

function veXemTruoc() {
  if (!ws || !quanSvg) return;
  const sap = ws.exercises.filter((_, i) => chon[i]);
  const tren = sap.slice(0, moiTrang());
  const trang = soTrang();
  const ten = $("o-tieu-de").value.trim() || "Phiếu bài tập";
  const sao = "★".repeat(saoChon());
  const capDo = $("o-cap-do").value.trim();
  const dau = tren[0];
  const moTa = `${sap.length} bài · ${dau && dau.side_to_move === "black" ? "Đen" : "Trắng"} đi trước · ${trang} trang`;

  const khoi = tren.length
    ? tren.map((e, i) => `<div class="o">${ve(e.fen, { lat: e.side_to_move === "black", toaDo: boCuc() !== "3x4", quan: quanSvg })}<span>${i + 1}.</span></div>`).join("")
    : `<p class="nho-gon" style="grid-column:1/-1">Chưa chọn bài nào để in.</p>`;

  const lopTheoBoCuc = boCuc() === "3x4" ? "m12" : boCuc() === "2x2" ? "m4" : "m6";
  $("xem-truoc").innerHTML = `
    <div class="phieu-dau">
      <p>Phiếu bài tập cờ vua</p>
      <h3>${thoat(ten)}${sao ? " " + sao : ""}</h3>
      <span>${thoat(capDo ? `Cấp độ ${capDo} · ` : "")}${thoat(moTa)}</span>
    </div>
    <div class="bo-cuc ${lopTheoBoCuc}">${khoi}</div>
    <div class="phieu-chan"><span>${thoat(bienSoan() ? `Biên soạn: ${bienSoan()}` : "ChessBision")}</span><span>Trang 1 / ${trang}</span></div>`;
  $("xem-truoc-trang").textContent = `trang 1 / ${trang}`;
}

// ---------- danh sách bài ----------

const deBai = (e) => (e.task.startsWith(TEN_BEN[e.side_to_move]) ? e.task : `${TEN_BEN[e.side_to_move]} đi. ${e.task}`);

function dapAn(e) {
  if (!e.solution.length) return "(chưa có đáp án)";
  const hoac = e.alt_solutions.length ? ` (hoặc ${e.alt_solutions.join(", ")})` : "";
  return dongNuoc(e.solution, e.side_to_move) + hoac;
}

const oInDe = (e, i) =>
  `<label class="in-de"><input type="checkbox" class="o-in-de" data-i="${i}" ${e.inDe === false ? "" : "checked"}> In đề / bình luận của bài này</label>`;

function theBai(e, i) {
  const svg = ve(e.fen, { lat: e.side_to_move === "black", toaDo: true, quan: quanSvg });
  const sao = e.level ? `<span class="sao" title="Cấp độ ${e.level}">${"★".repeat(e.level)}</span>` : "";
  const dayDu = e.task.length > 150
    ? `<details><summary>Đọc đầy đủ đề</summary><p>${thoat(deBai(e))}</p></details>` : "";
  return `<article class="the" data-i="${i}">
  <div class="dau-the">
    <label><input type="checkbox" class="o-chon" data-i="${i}" ${chon[i] ? "checked" : ""} aria-label="In bài ${i + 1}">
      <span class="so-bai">${i + 1}.</span><span class="ben-c ${e.side_to_move}" title="${TEN_BEN[e.side_to_move]} đi"></span>
      <span class="ten" title="${thoat(e.title)}">${thoat(e.title)}</span></label>${sao}
  </div>
  ${e.solution.length ? "" : `<p class="thieu-dap-an">Chưa có đáp án: đã bỏ chọn, tích lại nếu vẫn muốn in.</p>`}
  ${svg}
  ${oInDe(e, i)}
  <p class="de">${thoat(trich(deBai(e)))}</p>
  ${dayDu}
  <p class="dap-an">Đáp án: ${thoat(dapAn(e))}</p>
</article>`;
}

function dongBai(e, i) {
  const svg = ve(e.fen, { lat: e.side_to_move === "black", toaDo: true, quan: quanSvg });
  const sao = e.level ? `<span class="sao">${"★".repeat(e.level)}</span>` : "";
  const thieu = e.solution.length ? "" : `<span class="thieu" title="Chưa có đáp án">!</span>`;
  return `<div class="dong" data-i="${i}">
  <input type="checkbox" class="o-chon" data-i="${i}" ${chon[i] ? "checked" : ""} aria-label="In bài ${i + 1}">
  <details>
    <summary>
      ${svg}
      <span class="so-bai">${i + 1}.</span>
      <span class="ten">${thoat(e.title)}</span>${sao}${thieu}
      <span class="moc" aria-hidden="true">▾</span>
    </summary>
    <div class="chi-tiet">
      ${svg}
      ${e.solution.length ? "" : `<p class="thieu-dap-an">Chưa có đáp án: đã bỏ chọn, tích lại nếu vẫn muốn in.</p>`}
      ${oInDe(e, i)}
      <p class="de">${thoat(deBai(e))}</p>
      <p class="dap-an">Đáp án: ${thoat(dapAn(e))}</p>
    </div>
  </details>
</div>`;
}

function veThongBao() {
  const ds = ws.notices;
  const dong = (n) => `<li><b>${TEN_THONG_BAO[n.code] || "Lưu ý"}:</b> ${thoat(n.chapter)}. ${thoat(n.message)}</li>`;
  const quanTrong = ds.filter((n) => !BO_QUA.includes(n.code));
  const boQua = ds.filter((n) => BO_QUA.includes(n.code));
  if (!ds.length) {
    $("bao-cao").hidden = true;
    return;
  }
  $("bao-cao").hidden = false;
  $("thong-bao").innerHTML = quanTrong.map(dong).join("") + (boQua.length
    ? `<li class="bo-qua"><details><summary>${boQua.length} chương không thành bài (chương trống, ván đầy đủ hoặc trùng thế cờ)</summary><ul>${boQua.map(dong).join("")}</ul></details></li>`
    : "");
  const dem = {};
  for (const n of ds) {
    const nhan = (TEN_THONG_BAO[n.code] || "Lưu ý").replace(/^Bỏ qua \((.+)\)$/, "$1");
    dem[nhan] = (dem[nhan] || 0) + 1;
  }
  const moTa = Object.entries(dem).map(([nhan, so]) => `${so} ${nhan}`).join(" · ");
  $("bao-cao-tom-tat").innerHTML = `${ds.length} lưu ý khi đọc study<span class="dem-phu"> — ${thoat(moTa)}</span>`;
}

function veDanhSach() {
  $("luoi").innerHTML = ws.exercises.map(theBai).join("");
  $("danh-sach").innerHTML = ws.exercises.map(dongBai).join("");
  veThongBao();
}

function danhSo() {
  for (const [khung, lop] of [["#luoi", ".the"], ["#danh-sach", ".dong"]]) {
    let so = 0;
    for (const el of document.querySelectorAll(`${khung} ${lop}`)) {
      const i = +el.dataset.i;
      el.classList.toggle("bo", !chon[i]);
      el.querySelector(".so-bai").textContent = chon[i] ? `${++so}.` : "–";
    }
  }
  for (const c of document.querySelectorAll(".o-chon")) c.checked = chon[+c.dataset.i];
  if (!saoTay) $("o-sao").value = String(capDoChung(ws.exercises.filter((_, i) => chon[i])));
  veTomTat();
  veXemTruoc();
  capNhatNguon();
}

// ---------- lấy bài ----------

async function moPgn(text, nguon) {
  const tt = $("trang-thai");
  if (text.length > PGN_TOI_DA) {
    bao(tt, "loi", "Nội dung PGN quá lớn (hơn 20 MB). Hãy dùng PGN của một study.");
    return;
  }
  const kq = tach(text, { nguon });
  if (kq.exercises.length > BAI_TOI_DA) {
    kq.notices.unshift({ code: "qua-nhieu", chapter: `${kq.exercises.length} bài`, message: `Chỉ lấy ${BAI_TOI_DA} bài đầu tiên.` });
    kq.exercises = kq.exercises.slice(0, BAI_TOI_DA);
  }
  if (!kq.exercises.length) {
    const ly = kq.notices.length ? " " + kq.notices.slice(0, 3).map((n) => `${thoat(n.chapter)}: ${thoat(n.message)}`).join(" · ") : "";
    bao(tt, "loi", `Không tìm thấy bài nào có thế cờ bắt đầu để in.${ly}`);
    return;
  }
  ws = kq;
  // bài chưa có nước đáp án thì mặc định không in: giáo viên không chấm được từ trang đáp án
  chon = ws.exercises.map((e) => e.solution.length > 0);
  saoTay = false;
  quanSvg = await taiQuanSvg();
  $("cong-cu-cap-do").hidden = !ws.exercises.some((e) => e.level);
  $("o-loc-cap-do").value = "";
  bao(tt, "tot", `Đã đọc ${ws.exercises.length} bài${ws.title ? ` từ “${thoat(ws.title)}”` : ""}.`);
  const luu = docLuu();
  $("o-tieu-de").value = ws.title || "Phiếu bài tập";
  $("o-cap-do").value = "";
  $("o-bien-soan").value = luu.bienSoan || "";
  $("o-sao").value = String(capDoChung(ws.exercises.filter((_, i) => chon[i])));
  veDanhSach();
  danhSo();
  diBuoc(2);
}

async function layTuLink(link) {
  const tt = $("trang-thai");
  const id = docLink(link);
  if (!id) {
    bao(tt, "loi", "Không nhận ra link study Lichess. Link đúng có dạng <b>https://lichess.org/study/</b> rồi 8 ký tự, ví dụ https://lichess.org/study/TqmJP6yk");
    return;
  }
  const nut = $("nut-lay");
  nut.disabled = true;
  bao(tt, "dang", "Đang lấy bài từ Lichess…");
  try {
    const pgn = await taiPgn(id);
    const url = `https://lichess.org/study/${id.study}` + (id.chuong ? `/${id.chuong}` : "");
    await moPgn(pgn, { url });
    history.replaceState(null, "", `?link=${encodeURIComponent(url)}`);
  } catch (e) {
    bao(tt, "loi", e instanceof LoiLichess ? thoat(e.message) : `Có lỗi: ${thoat(e.message)}`);
  } finally {
    nut.disabled = false;
  }
}

async function layTuFile(file) {
  const tt = $("trang-thai");
  if (file.size > PGN_TOI_DA) {
    bao(tt, "loi", "File quá lớn (hơn 20 MB). Hãy chọn file PGN của một study.");
    return;
  }
  try {
    await moPgn(await file.text(), { file: file.name });
  } catch (e) {
    bao(tt, "loi", `Không đọc được file: ${thoat(e.message)}`);
  }
}

async function taiBaiMau() {
  try {
    const text = await (await fetch("vi-du/chieu-het-1-nuoc.pgn")).text();
    await moPgn(text, { file: "Bài mẫu" });
  } catch (e) {
    bao($("trang-thai"), "loi", `Không tải được bài mẫu: ${thoat(e.message)}`);
  }
}

// ---------- chọn bài ----------

function datHet(v) {
  chon = chon.map(() => v);
  danhSo();
}

function locCapDo(v) {
  chon = ws.exercises.map((e) => v === "" || (e.level ?? 0) === +v);
  danhSo();
}

async function xepCapDo() {
  const cap = ws.exercises.map((e, i) => ({ e, c: chon[i], i }));
  cap.sort((a, b) => (a.e.level ?? 9) - (b.e.level ?? 9) || a.i - b.i);
  ws.exercises = cap.map((x) => x.e);
  chon = cap.map((x) => x.c);
  veDanhSach();
  danhSo();
}

// ---------- PDF và Word ----------

let taiNguyen = null;

async function svgThanhPng(svg, canh = 360) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image(canh, canh);
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = canh;
    c.getContext("2d").drawImage(img, 0, 0, canh, canh);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function taiTaiNguyen() {
  if (!taiNguyen) {
    const quan = await taiQuanSvg();
    const [thuong, dam] = await Promise.all(["Regular", "SemiBold"].map(async (k) =>
      new Uint8Array(await (await fetch(`tai-nguyen/phong/BeVietnamPro-${k}.ttf`)).arrayBuffer())));
    const png = {};
    for (const t of TEN_QUAN) png[t] = await svgThanhPng(quan[t].replace(/width="45" height="45"/, 'width="360" height="360"'));
    taiNguyen = { thuong, dam, quan: png };
  }
  return taiNguyen;
}

function tuyChon() {
  return {
    tieuDe: $("o-tieu-de").value.trim(),
    capDo: $("o-cap-do").value.trim(),
    bienSoan: bienSoan(),
    boCuc: boCuc(),
    leGay: KIEU_GAY.includes($("o-le-gay").value) ? $("o-le-gay").value : "trai",
    kieuDe: kieuDe(),
    dapAn: $("o-dap-an").checked,
    sao: saoChon(),
    logo: logo && { loai: logo.loai, bytes: logo.bytes },
  };
}

const tenFile = (s) => (s || "phieu").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d")
  .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "phieu";

function baiDuocChon(ch) {
  luuTuyChon(ch);
  const bai = ws.exercises.filter((_, i) => chon[i]).map((e, i) => ({ ...e, id: i + 1, task: deIn(e, ch.kieuDe) }));
  if (!bai.length) throw new Error("Chưa chọn bài nào để in.");
  return { ...ws, exercises: bai };
}

async function taoFile() {
  const ch = tuyChon();
  const kq = await taoPdf(baiDuocChon(ch), ch, await taiTaiNguyen(), window.fontkit);
  return { ...kq, blob: new Blob([kq.bytes], { type: "application/pdf" }), ten: `${tenFile(ch.tieuDe || ws.title)}.pdf` };
}

function taiXuong(blob, ten) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: ten });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Word: thư viện docx (~750 KB) chỉ tải khi bấm lần đầu
async function lamWord() {
  const tt = $("trang-thai-pdf");
  const nut = $("nut-word");
  nut.disabled = true;
  bao(tt, "dang", "Đang tạo file Word…");
  try {
    const ch = tuyChon();
    const phieu = baiDuocChon(ch);
    const [D, { taoDocx }, quan] = await Promise.all([import("../vendor/docx.mjs"), import("./docx.js"), taiQuanSvg()]);
    const banCo = (e, toaDo) => svgThanhPng(
      ve(e.fen, { lat: e.side_to_move === "black", toaDo, quan }).replace("<svg ", '<svg width="600" height="600" '), 600);
    const bytes = await taoDocx(phieu, ch, { banCo }, D);
    const ten = `${tenFile(ch.tieuDe || ws.title)}.docx`;
    taiXuong(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), ten);
    bao(tt, "tot", `Đã tải ${thoat(ten)}. Mở bằng Word hoặc Google Docs để sửa chữ rồi in.`);
  } catch (e) {
    bao(tt, "loi", `Không tạo được file Word: ${thoat(e.message)}`);
  } finally {
    nut.disabled = false;
  }
}

async function lamPdf(xem) {
  const tt = $("trang-thai-pdf");
  const nut = [$("nut-tai"), $("nut-xem"), $("nut-tai-dau"), $("nut-tai-duoi")];
  // mở tab trước khi chờ, kẻo trình duyệt chặn cửa sổ bật lên
  const tab = xem ? window.open("", "_blank") : null;
  nut.forEach((n) => (n.disabled = true));
  bao(tt, "dang", "Đang tạo PDF…");
  try {
    const { blob, ten, soTrangBai, soTrangDapAn, canhBao } = await taoFile();
    if (tab) {
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      taiXuong(blob, ten);
    }
    const soTrang = `${soTrangBai} trang bài tập` + (soTrangDapAn ? ` + ${soTrangDapAn} trang đáp án` : "");
    bao(tt, canhBao.length ? "loi" : "tot", (xem
      ? `Đã mở PDF (${soTrang}) ở thẻ mới. Bấm biểu tượng máy in hoặc Ctrl+P để in, nhớ chọn khổ giấy A4.`
      : `Đã tải ${thoat(ten)}: ${soTrang}.`) + canhBao.map((c) => `<br>${thoat(c)}`).join(""));
  } catch (e) {
    if (tab) tab.close();
    bao(tt, "loi", `Không tạo được PDF: ${thoat(e.message)}`);
  } finally {
    nut.forEach((n) => (n.disabled = false));
  }
}

// ---------- lưu tùy chọn trên máy ----------

function docLuu() {
  try { return JSON.parse(localStorage.getItem(LUU)) || {}; } catch { return {}; }
}
function luuTuyChon(ch) {
  try {
    localStorage.setItem(LUU, JSON.stringify({ bienSoan: ch.bienSoan, boCuc: ch.boCuc, leGay: ch.leGay, kieuDe: ch.kieuDe, dapAn: ch.dapAn, mau: $("o-mau").value, logo: logo?.url || null }));
  } catch { /* không lưu được thì thôi */ }
}

// ---------- mẫu phiếu và logo ----------

function datLogo(url) {
  const l = url ? dataUrlThanhLogo(url) : null;
  logo = l && { ...l, url };
  const anh = $("anh-logo");
  anh.hidden = !logo;
  if (logo) anh.src = url;
  else anh.removeAttribute("src");
  $("logo-trong").hidden = !!logo;
  $("nut-bo-logo").hidden = !logo;
}

function veDanhSachMau(chonId) {
  const ds = tatCaMau();
  $("o-mau").innerHTML = ds.map((m) => `<option value="${thoat(m.id)}">${thoat(m.ten)}</option>`).join("");
  if (chonId && ds.some((m) => m.id === chonId)) $("o-mau").value = chonId;
  $("nut-xoa-mau").hidden = !!ds.find((m) => m.id === $("o-mau").value)?.coSan;
}

function apMau(id) {
  const m = tatCaMau().find((x) => x.id === id);
  if (!m) return;
  const r = document.querySelector(`input[name=bo-cuc][value="${m.boCuc}"]`);
  if (r) r.checked = true;
  $("o-dap-an").checked = m.dapAn;
  if (!m.coSan) { $("o-bien-soan").value = m.bienSoan; datLogo(m.logo); }
  $("nut-xoa-mau").hidden = m.coSan;
  hienVienBoCuc();
  veTomTat();
  veXemTruoc();
}

async function chonLogo(file) {
  const tt = $("trang-thai-pdf");
  try {
    datLogo(logoThanhDataUrl(new Uint8Array(await file.arrayBuffer())));
    bao(tt, "", "");
  } catch (e) {
    bao(tt, "loi", thoat(e.message));
  }
}

function luuMauMoi(ten) {
  const tt = $("trang-thai-pdf");
  try {
    const ch = tuyChon();
    const m = luuMau({ ten, boCuc: ch.boCuc, dapAn: ch.dapAn, bienSoan: ch.bienSoan, logo: logo?.url || null });
    veDanhSachMau(m.id);
    $("khung-luu-mau").hidden = true;
    luuTuyChon(ch);
    bao(tt, "tot", `Đã lưu mẫu “${thoat(m.ten)}” trên máy này.`);
  } catch (e) {
    bao(tt, "loi", thoat(e.message));
  }
}

// ---------- gắn sự kiện ----------

function hienVienBoCuc() {
  for (const v of Object.keys(BO_CUC_MAU)) {
    $(`chon-${v}`).classList.toggle("dang-chon", boCuc() === v);
  }
}

$("form-link").addEventListener("submit", (ev) => { ev.preventDefault(); layTuLink($("o-link").value); });
$("o-file").addEventListener("change", (ev) => { if (ev.target.files[0]) layTuFile(ev.target.files[0]); ev.target.value = ""; });
$("nut-dan").addEventListener("click", () => { $("khung-dan").hidden = !$("khung-dan").hidden; if (!$("khung-dan").hidden) $("o-dan").focus(); });
$("nut-doc-dan").addEventListener("click", () => moPgn($("o-dan").value, { file: "PGN dán vào" }).catch((e) => bao($("trang-thai"), "loi", thoat(e.message))));
$("nut-mau").addEventListener("click", () => taiBaiMau());

for (const a of document.querySelectorAll("#buoc-nav a")) {
  a.addEventListener("click", (ev) => { ev.preventDefault(); diBuoc(+a.dataset.buoc); });
}
document.querySelector(".hieu").addEventListener("click", (ev) => { ev.preventDefault(); diBuoc(1); });
$("nut-nguon").addEventListener("click", () => diBuoc(buocDangXem === 3 ? 2 : 1));

document.addEventListener("change", (ev) => {
  const c = ev.target;
  if (!(c instanceof HTMLInputElement) || c.type !== "checkbox" || c.dataset.i === undefined) return;
  if (c.classList.contains("o-in-de")) {
    ws.exercises[+c.dataset.i].inDe = c.checked;
    tomTatIn();
  } else if (c.classList.contains("o-chon")) {
    chon[+c.dataset.i] = c.checked;
    danhSo();
  }
});

$("nut-chon-het").addEventListener("click", () => datHet(true));
$("nut-bo-het").addEventListener("click", () => datHet(false));
$("o-hien-dap-an").addEventListener("change", (ev) => document.body.classList.toggle("hien-dap-an", ev.target.checked));
$("o-loc-cap-do").addEventListener("change", (ev) => locCapDo(ev.target.value));
$("nut-xep").addEventListener("click", () => xepCapDo());

for (const id of ["o-tieu-de", "o-cap-do", "o-bien-soan"]) {
  $(id).addEventListener("input", () => { veTomTat(); veXemTruoc(); });
}
$("o-sao").addEventListener("change", () => { saoTay = true; veTomTat(); veXemTruoc(); });
$("o-dap-an").addEventListener("change", () => { veTomTat(); veXemTruoc(); });
$("o-kieu-de").addEventListener("change", () => tomTatIn());
for (const r of document.querySelectorAll("input[name=bo-cuc]")) {
  r.addEventListener("change", () => { hienVienBoCuc(); veTomTat(); veXemTruoc(); });
}
$("o-mau").addEventListener("change", (ev) => apMau(ev.target.value));
$("nut-luu-mau").addEventListener("click", () => {
  $("khung-luu-mau").hidden = false;
  const m = tatCaMau().find((x) => x.id === $("o-mau").value);
  $("o-ten-mau").value = m && !m.coSan ? m.ten : "";
  $("o-ten-mau").focus();
});
$("nut-huy-mau").addEventListener("click", () => { $("khung-luu-mau").hidden = true; });
$("khung-luu-mau").addEventListener("submit", (ev) => { ev.preventDefault(); luuMauMoi($("o-ten-mau").value); });
$("nut-xoa-mau").addEventListener("click", () => {
  const m = tatCaMau().find((x) => x.id === $("o-mau").value);
  if (!m || m.coSan) return;
  xoaMau(m.id);
  veDanhSachMau();
  apMau($("o-mau").value);
  bao($("trang-thai-pdf"), "tot", `Đã xóa mẫu “${thoat(m.ten)}”.`);
});
$("o-logo").addEventListener("change", (ev) => { if (ev.target.files[0]) chonLogo(ev.target.files[0]); ev.target.value = ""; });
$("nut-bo-logo").addEventListener("click", () => datLogo(null));
$("nut-word").addEventListener("click", () => lamWord());
$("nut-tai").addEventListener("click", () => lamPdf(false));
$("nut-xem").addEventListener("click", () => lamPdf(true));
$("nut-tai-dau").addEventListener("click", () => lamPdf(false));
$("nut-tai-duoi").addEventListener("click", () => lamPdf(false));

let demTha = 0;
addEventListener("dragenter", (ev) => { ev.preventDefault(); demTha++; document.body.classList.add("dang-tha"); });
addEventListener("dragleave", () => { if (--demTha <= 0) { demTha = 0; document.body.classList.remove("dang-tha"); } });
addEventListener("dragover", (ev) => ev.preventDefault());
addEventListener("drop", (ev) => {
  ev.preventDefault();
  demTha = 0;
  document.body.classList.remove("dang-tha");
  const f = ev.dataTransfer.files[0];
  if (f) layTuFile(f);
});

// đổi khổ màn hình giữa lúc xem: chỉ vẽ lại phần đang cần, tránh nhân đôi SVG
let henHe = 0;
addEventListener("resize", () => {
  clearTimeout(henHe);
  henHe = setTimeout(() => {
    if (!ws) return;
    const mayTinh = matchMedia("(min-width: 721px)").matches;
    $("luoi").style.display = mayTinh ? "" : "none";
    $("danh-sach").style.display = mayTinh ? "none" : "";
  }, 150);
});

{
  const luu = docLuu();
  veDanhSachMau(luu.mau);
  datLogo(typeof luu.logo === "string" ? luu.logo : null);
  if (luu.boCuc) { const r = document.querySelector(`input[name=bo-cuc][value="${luu.boCuc}"]`); if (r) r.checked = true; }
  if (luu.dapAn === false) $("o-dap-an").checked = false;
  if (KIEU_DE.includes(luu.kieuDe)) $("o-kieu-de").value = luu.kieuDe;
  if (KIEU_GAY.includes(luu.leGay)) $("o-le-gay").value = luu.leGay;
  document.body.classList.toggle("hien-dap-an", $("o-hien-dap-an").checked);
  hienVienBoCuc();
  const link = new URLSearchParams(location.search).get("link");
  if (link) { $("o-link").value = link; layTuLink(link); }
}
