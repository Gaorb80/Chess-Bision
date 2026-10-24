// Giao diện: lấy PGN (link Lichess / file / dán) → tách bài → xem trước → tạo PDF.

import { tach } from "./tach_bai.js";
import { docLink, taiPgn, LoiLichess } from "./lichess.js";
import { ve, TEN_QUAN } from "./so_do.js";
import { dongNuoc } from "./ky_hieu.js";
import { taoPdf } from "./pdf.js";
import { TEN_BEN } from "./tach_bai.js";

const $ = (id) => document.getElementById(id);
const LUU = "chessbision.tuy-chon";

let ws = null;            // phiếu vừa tách
let chon = [];            // chon[i]: có in bài i không
let quanSvg = null;

const bao = (el, loai, text) => { el.innerHTML = text ? `<div class="tt ${loai}">${text}</div>` : ""; };
const thoat = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function taiQuanSvg() {
  if (!quanSvg) {
    const cap = await Promise.all(TEN_QUAN.map(async (t) => [t, await (await fetch(`tai-nguyen/quan/${t}.svg`)).text()]));
    quanSvg = Object.fromEntries(cap);
  }
  return quanSvg;
}

// ---------- lấy bài ----------

async function moPgn(text, nguon) {
  const tt = $("trang-thai");
  const kq = tach(text, { nguon });
  if (!kq.exercises.length) {
    const ly = kq.notices.length ? " " + kq.notices.slice(0, 3).map((n) => `${thoat(n.chapter)}: ${thoat(n.message)}`).join(" · ") : "";
    bao(tt, "loi", `Không tìm thấy bài nào có thế cờ bắt đầu để in.${ly}`);
    return;
  }
  ws = kq;
  chon = ws.exercises.map(() => true);
  bao(tt, "tot", `Đã đọc ${ws.exercises.length} bài${ws.title ? ` từ “${thoat(ws.title)}”` : ""}. Kiểm tra ở bước 2 rồi tải PDF ở bước 3.`);
  const luu = docLuu();
  $("o-tieu-de").value = ws.title || "Phiếu bài tập";
  $("o-cap-do").value = "";
  $("o-bien-soan").value = luu.bienSoan || "";
  await veXemTruoc();
  $("buoc-2").hidden = false;
  $("buoc-3").hidden = false;
  $("buoc-2").scrollIntoView({ behavior: "smooth", block: "start" });
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
  if (file.size > 20 * 1024 * 1024) {
    bao(tt, "loi", "File quá lớn (hơn 20 MB). Hãy chọn file PGN của một study.");
    return;
  }
  try {
    await moPgn(await file.text(), { file: file.name });
  } catch (e) {
    bao(tt, "loi", `Không đọc được file: ${thoat(e.message)}`);
  }
}

// ---------- xem trước ----------

const TEN_THONG_BAO = {
  "full-game": "Bỏ qua (ván đầy đủ)",
  "empty-chapter": "Bỏ qua (chương trống)",
  "duplicate": "Bỏ qua (trùng thế cờ)",
  "illegal": "Bỏ qua (nước đi sai luật)",
  "multi-solution": "Nhiều đáp án",
  "no-moves": "Chưa có đáp án",
};

async function veXemTruoc() {
  const quan = await taiQuanSvg();
  $("tom-tat").textContent = `${ws.exercises.length} bài sẽ được in. Bỏ dấu chọn ở bài nào không muốn in.`;
  $("thong-bao").innerHTML = ws.notices.map((n) =>
    `<li><b>${TEN_THONG_BAO[n.code] || "Lưu ý"}:</b> ${thoat(n.chapter)}. ${thoat(n.message)}</li>`).join("");
  $("luoi").innerHTML = ws.exercises.map((e, i) => {
    const dapAn = e.solution.length ? dongNuoc(e.solution, e.side_to_move) : "(chưa có đáp án)";
    const hoac = e.alt_solutions.length ? ` (hoặc ${e.alt_solutions.join(", ")})` : "";
    return `<div class="the-bai" data-i="${i}">
      <label class="tren"><input type="checkbox" checked data-i="${i}" aria-label="In bài ${i + 1}">
        <span class="so-bai">${i + 1}.</span><span class="ben ${e.side_to_move}" title="${TEN_BEN[e.side_to_move]} đi"></span>
        <span class="ten" title="${thoat(e.title)}">${thoat(e.title)}</span></label>
      ${ve(e.fen, { lat: e.side_to_move === "black", toaDo: true, quan })}
      <p class="de">${e.task.startsWith(TEN_BEN[e.side_to_move]) ? "" : TEN_BEN[e.side_to_move] + " đi. "}${thoat(e.task)}</p>
      <p class="dap-an">Đáp án: ${thoat(dapAn + hoac)}</p>
    </div>`;
  }).join("");
  danhSo();
}

function danhSo() {
  let so = 0;
  document.querySelectorAll(".the-bai").forEach((el) => {
    const i = +el.dataset.i;
    el.classList.toggle("bo", !chon[i]);
    el.querySelector(".so-bai").textContent = chon[i] ? `${++so}.` : "–";
  });
  $("tom-tat").textContent = `${so} / ${ws.exercises.length} bài sẽ được in. Bỏ dấu chọn ở bài nào không muốn in.`;
}

// ---------- PDF ----------

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
    bienSoan: $("o-bien-soan").value.trim(),
    boCuc: document.querySelector("input[name=bo-cuc]:checked").value,
    dapAn: $("o-dap-an").checked,
  };
}

const tenFile = (s) => (s || "phieu").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d")
  .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "phieu";

async function taoFile() {
  const ch = tuyChon();
  luuTuyChon(ch);
  const bai = ws.exercises.filter((_, i) => chon[i]).map((e, i) => ({ ...e, id: i + 1 }));
  if (!bai.length) throw new Error("Chưa chọn bài nào để in.");
  const bytes = await taoPdf({ ...ws, exercises: bai }, ch, await taiTaiNguyen(), window.fontkit);
  return { blob: new Blob([bytes], { type: "application/pdf" }), ten: `${tenFile(ch.tieuDe || ws.title)}.pdf` };
}

async function lamPdf(xem) {
  const tt = $("trang-thai-pdf");
  const nut = [$("nut-tai"), $("nut-xem")];
  // mở tab trước khi chờ, kẻo trình duyệt chặn cửa sổ bật lên
  const tab = xem ? window.open("", "_blank") : null;
  nut.forEach((n) => (n.disabled = true));
  bao(tt, "dang", "Đang tạo PDF…");
  try {
    const { blob, ten } = await taoFile();
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      const a = Object.assign(document.createElement("a"), { href: url, download: ten });
      document.body.append(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    bao(tt, "tot", xem ? "Đã mở PDF ở thẻ mới. Bấm biểu tượng máy in hoặc Ctrl+P để in." : `Đã tải ${thoat(ten)}.`);
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
  try { localStorage.setItem(LUU, JSON.stringify({ bienSoan: ch.bienSoan, boCuc: ch.boCuc, dapAn: ch.dapAn })); } catch { /* không lưu được thì thôi */ }
}

// ---------- gắn sự kiện ----------

$("form-link").addEventListener("submit", (ev) => { ev.preventDefault(); layTuLink($("o-link").value); });
$("o-file").addEventListener("change", (ev) => { if (ev.target.files[0]) layTuFile(ev.target.files[0]); ev.target.value = ""; });
$("nut-dan").addEventListener("click", () => { $("khung-dan").hidden = !$("khung-dan").hidden; if (!$("khung-dan").hidden) $("o-dan").focus(); });
$("nut-doc-dan").addEventListener("click", () => moPgn($("o-dan").value, { file: "PGN dán vào" }).catch((e) => bao($("trang-thai"), "loi", thoat(e.message))));
$("nut-mau").addEventListener("click", async () => {
  const text = await (await fetch("vi-du/chieu-het-1-nuoc.pgn")).text();
  moPgn(text, { file: "Bài mẫu" });
});
$("luoi").addEventListener("change", (ev) => {
  if (ev.target.matches("input[type=checkbox]")) { chon[+ev.target.dataset.i] = ev.target.checked; danhSo(); }
});
const datHet = (v) => { chon = chon.map(() => v); document.querySelectorAll("#luoi input[type=checkbox]").forEach((c) => (c.checked = v)); danhSo(); };
$("nut-chon-het").addEventListener("click", () => datHet(true));
$("nut-bo-het").addEventListener("click", () => datHet(false));
$("o-hien-dap-an").addEventListener("change", (ev) => document.body.classList.toggle("hien-dap-an", ev.target.checked));
$("nut-tai").addEventListener("click", () => lamPdf(false));
$("nut-xem").addEventListener("click", () => lamPdf(true));

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

{
  const luu = docLuu();
  if (luu.boCuc) { const r = document.querySelector(`input[name=bo-cuc][value="${luu.boCuc}"]`); if (r) r.checked = true; }
  if (luu.dapAn === false) $("o-dap-an").checked = false;
  const link = new URLSearchParams(location.search).get("link");
  if (link) { $("o-link").value = link; layTuLink(link); }
}
