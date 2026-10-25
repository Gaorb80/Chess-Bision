// Phiếu bài tập → PDF A4 ngay trong trình duyệt (pdf-lib). Bố cục theo bản Typst
// src/chessbision/xuat/pdf.py: tiêu đề + họ tên, lưới sơ đồ, chân trang, trang đáp án ở cuối.
// Phiếu học sinh không bao giờ chứa đáp án; đáp án chỉ nằm ở các trang sau cùng.

import { PDFDocument, rgb } from "../vendor/pdf-lib.esm.min.js";
import { O, LE, cacO, nhanCot, nhanHang } from "./so_do.js";
import { deChung, TEN_BEN } from "./tach_bai.js";
import { dongNuoc } from "./ky_hieu.js";

// bố cục: số cột, số hàng, có tọa độ
export const BO_CUC = {
  "2x3": { cot: 2, hang: 3, toaDo: true },
  "3x4": { cot: 3, hang: 4, toaDo: false },
};

// khổ A4, lề (mm); dùng chung với docx.js. Mọi nét, kể cả chân trang, cách mép giấy ít nhất
// VUNG_AN_TOAN: máy in thật không in được sát mép, khổ Letter còn cắt thêm ~9 mm trên/dưới (#10).
export const RONG = 210, CAO = 297;
export const VUNG_AN_TOAN = 15;
export const LE_NGANG = 18, LE_TREN = 18, LE_DUOI = 26;   // LE_DUOI: hết phần thân; chân trang nằm trong lề này
const KHE_COT = 12, KHE_HANG = 6;
const PT = 72 / 25.4;
const DEN = rgb(0, 0, 0);
const XAM = (l) => rgb(l / 255, l / 255, l / 255);

const chuan = (s) => (s || "").normalize("NFC");

// Cạnh sơ đồ (mm) vừa cả chiều ngang lẫn phần trang còn lại dưới tiêu đề (từ y0).
function canhBanCo(cot, hang, them, y0) {
  const rong = (RONG - 2 * LE_NGANG - KHE_COT * (cot - 1)) / cot;
  const cao = (CAO - LE_DUOI - 2 - y0 - KHE_HANG * (hang - 1)) / hang - them;
  return Math.floor(Math.min(rong, cao) * 10) / 10;
}

function ngatDong(font, co, text, rong) {
  const dong = [];
  let hien = "";
  for (const tu of chuan(text).split(/\s+/).filter(Boolean)) {
    const thu = hien ? hien + " " + tu : tu;
    if (!hien || font.widthOfTextAtSize(thu, co) <= rong * PT) hien = thu;
    else { dong.push(hien); hien = tu; }
  }
  if (hien) dong.push(hien);
  return dong;
}

// Bút vẽ theo mm, gốc ở góc trên bên trái trang.
function but(page, f) {
  const Y = (y) => (CAO - y) * PT;
  return {
    chu(text, x, y, { co = 10, dam = false, mau = DEN, phai = false, giua = false } = {}) {
      const font = dam ? f.dam : f.thuong;
      const t = chuan(text);
      const w = font.widthOfTextAtSize(t, co) / PT;
      const x0 = phai ? x - w : giua ? x - w / 2 : x;
      page.drawText(t, { x: x0 * PT, y: Y(y), size: co, font, color: mau });
      return w;
    },
    rongChu: (text, co, dam = false) => (dam ? f.dam : f.thuong).widthOfTextAtSize(chuan(text), co) / PT,
    duong(x1, y1, x2, y2, { day = 0.4, mau = DEN, cham = false } = {}) {
      page.drawLine({ start: { x: x1 * PT, y: Y(y1) }, end: { x: x2 * PT, y: Y(y2) }, thickness: day, color: mau,
        ...(cham ? { dashArray: [0.01, 2.2], lineCap: 1 } : {}) });
    },
    hop(x, y, w, h, { nen, vien, day = 1 } = {}) {
      page.drawRectangle({ x: x * PT, y: Y(y + h), width: w * PT, height: h * PT,
        ...(nen ? { color: nen } : {}), ...(vien ? { borderColor: vien, borderWidth: day } : { borderWidth: 0 }) });
    },
    tron(x, y, r, { nen }) {
      page.drawCircle({ x: x * PT, y: Y(y), size: r, borderColor: DEN, borderWidth: 0.8, ...(nen ? { color: nen } : {}) });
    },
    anh(img, x, y, w, h) {
      page.drawImage(img, { x: x * PT, y: Y(y + h), width: w * PT, height: h * PT });
    },
    // ngôi sao năm cánh đặc, (x, y) là góc trên bên trái, r: bán kính (mm)
    sao(x, y, r) {
      const R = r * PT;
      const d = Array.from({ length: 10 }, (_, k) => {
        const g = (-90 + k * 36) * Math.PI / 180, rr = k % 2 ? R * 0.42 : R;
        return `${k ? "L" : "M"}${(R + Math.cos(g) * rr).toFixed(2)} ${(R + Math.sin(g) * rr).toFixed(2)}`;
      }).join(" ") + " Z";
      page.drawSvgPath(d, { x: x * PT, y: Y(y), color: DEN, borderWidth: 0 });
    },
  };
}

function veBanCo(b, quan, e, x, y, canh, toaDo) {
  const lat = e.side_to_move === "black";
  const le = toaDo ? LE : 0;
  const k = canh / (8 * O + le);              // mm cho một đơn vị SVG
  const o = O * k;
  for (const s of cacO(e.fen, lat)) {
    const ox = x + (le + s.cot * O) * k, oy = y + s.hang * O * k;
    if (s.toi) b.hop(ox, oy, o, o, { nen: XAM(0xc4) });
    if (s.quan) b.anh(quan[s.quan], ox, oy, o, o);
  }
  b.hop(x + le * k, y, 8 * o, 8 * o, { vien: DEN, day: 1.6 * k * PT });
  if (toaDo) {
    const co = 12 * k * PT;
    for (let i = 0; i < 8; i++) {
      b.chu(nhanCot(i, lat), x + (le + i * O + O / 2) * k, y + (8 * O + LE - 3) * k, { co, giua: true });
      b.chu(nhanHang(i, lat), x + (LE / 2) * k, y + (i * O + O / 2 + 4) * k, { co, giua: true });
    }
  }
}

const dauTrangCao = (de) => LE_TREN + (de ? 15 : 10) + 4;

const LOGO_CAO = 12;     // mm

function dauTrang(b, f, { tieuDe, de, hoTen, sao = 0 }) {
  const x2 = RONG - LE_NGANG;
  let x1 = LE_NGANG;
  const day = LE_TREN + (de && hoTen ? 15 : 10);
  if (f.logo && hoTen) {
    // logo không được nhô lên trên lề trên khi tiêu đề chỉ có một dòng
    const w = Math.min(30, Math.min(LOGO_CAO, day - 1.5 - LE_TREN) * f.logo.width / f.logo.height);
    const h = w * f.logo.height / f.logo.width;
    b.anh(f.logo, x1, day - 1.5 - h, w, h);
    x1 += w + 3;
  }
  const wTieuDe = b.chu(tieuDe, x1, LE_TREN + 6, { co: 15, dam: true });
  for (let i = 0; i < sao; i++) b.sao(x1 + wTieuDe + 2.5 + i * 4.6, LE_TREN + 1.6, 2);
  if (de && hoTen) b.chu(de, x1, LE_TREN + 12, { co: 10.5 });
  if (hoTen) {
    const cham = (xa, xb, y) => b.duong(xa, y, xb, y, { day: 0.7, cham: true });
    let y = day - 6.5;
    b.chu("Họ tên:", x2 - 45 - 1, y, { co: 9, phai: true });
    cham(x2 - 45, x2, y);
    y += 4.6;
    b.chu("Ngày:", x2 - 20 - 1, y, { co: 9, phai: true });
    cham(x2 - 20, x2, y);
    const xLop = x2 - 20 - 1 - b.rongChu("Ngày:", 9) - 3;
    b.chu("Lớp:", xLop - 15 - 1, y, { co: 9, phai: true });
    cham(xLop - 15, xLop, y);
  }
  b.duong(LE_NGANG, day, x2, day, { day: 1 });
  return day + 4;
}

function chanTrang(b, trai, so, tong) {
  const y = CAO - LE_DUOI + 4;
  b.duong(LE_NGANG, y, RONG - LE_NGANG, y, { day: 0.4, mau: XAM(150) });
  b.chu(trai, LE_NGANG, y + 3.8, { co: 8, mau: XAM(80) });
  b.chu(`Trang ${so} / ${tong}`, RONG - LE_NGANG, y + 3.8, { co: 8, mau: XAM(80), phai: true });
}

function trangPhieu(doc, f, quan, ws, ch, tieuDe) {
  const { cot, hang, toaDo } = BO_CUC[ch.boCuc];
  const de = deChung(ws.exercises);
  const riengDe = de === null;
  const them = 9 + (riengDe ? 5 : 0);     // dòng đề riêng + dòng số bài dưới sơ đồ
  const canh = canhBanCo(cot, hang, them, dauTrangCao(de));
  const khe = cot > 1 ? (RONG - 2 * LE_NGANG - cot * canh) / (cot - 1) : 0;
  const moiTrang = cot * hang;
  const trang = [];
  for (let dau = 0; dau < ws.exercises.length; dau += moiTrang) {
    const page = doc.addPage([RONG * PT, CAO * PT]);
    trang.push(page);
    const b = but(page, f);
    const y0 = dauTrang(b, f, { tieuDe, de, hoTen: true, sao: ch.sao || 0 });
    ws.exercises.slice(dau, dau + moiTrang).forEach((e, i) => {
      const c = i % cot;
      const x = LE_NGANG + c * (canh + khe);
      const r = Math.floor(i / cot);
      const y = y0 + r * (canh + them + KHE_HANG);
      veBanCo(b, quan, e, x, y, canh, toaDo);
      let yc = y + canh + 1.5;
      if (riengDe) {
        const dong = ngatDong(f.thuong, 8.5, e.task, canh).slice(0, 2);
        dong.forEach((d, j) => b.chu(d, x, yc + 3 + j * 3.3, { co: 8.5 }));
        yc += 5;
      }
      const yd = yc + 5;
      const wSo = b.chu(`${e.id}.`, x, yd, { co: 10, dam: true });
      const xt = x + wSo + 1.5 + 1.06;
      b.tron(xt, yd - 1.25, 3, { nen: e.side_to_move === "black" ? DEN : rgb(1, 1, 1) });
      b.duong(xt + 1.06 + 1.5, yd, x + canh, yd, { day: 0.7, cham: true });
    });
  }
  return trang;
}

function trangDapAn(doc, f, ws, ch, tieuDe) {
  const coDiem = ws.exercises.some((e) => e.points_set);
  const x1 = LE_NGANG, x2 = RONG - LE_NGANG;
  const cotBai = 12, cotBen = 16, cotDiem = coDiem ? 13 : 0, cotChuong = 55;
  const cotDapAn = x2 - x1 - cotBai - cotBen - cotDiem - cotChuong;
  const xs = { bai: x1 + 2, ben: x1 + cotBai + 2, dapAn: x1 + cotBai + cotBen + 2 };
  xs.diem = xs.dapAn + cotDapAn;
  xs.chuong = xs.diem + cotDiem;
  const yMax = CAO - LE_DUOI - 2;
  const trang = [];
  let b, y;
  const trangMoi = () => {
    const page = doc.addPage([RONG * PT, CAO * PT]);
    trang.push(page);
    b = but(page, f);
    b.chu(`Đáp án · ${tieuDe}`, x1, LE_TREN + 6, { co: 15, dam: true });
    b.duong(x1, LE_TREN + 10, x2, LE_TREN + 10, { day: 1 });
    y = LE_TREN + 12;
    hangBang([["Bài", xs.bai], ["Bên đi", xs.ben], ["Đáp án", xs.dapAn], ...(coDiem ? [["Điểm", xs.diem]] : []), ["Chương", xs.chuong]].map(([t, x]) => ({ t, x, dam: true })), 1);
  };
  const hangBang = (o, soDong, cao = soDong * 4.2) => {
    const yc = y + 2.2 + 3.3;
    for (const c of o) {
      const ds = Array.isArray(c.t) ? c.t : [c.t];
      ds.forEach((d, j) => b.chu(d, c.x, yc + j * (c.co ? 3.4 : 4.2), { co: c.co || 10, dam: c.dam, mau: c.mau, phai: c.phai }));
    }
    y += 2.2 * 2 + cao;
    b.duong(x1, y, x2, y, { day: 0.4, mau: XAM(170) });
  };
  trangMoi();
  for (const e of ws.exercises) {
    let nuoc = e.solution.length ? dongNuoc(e.solution, e.side_to_move) : "(chưa có đáp án)";
    if (e.alt_solutions.length) nuoc += "  (hoặc " + e.alt_solutions.join(", ") + ")";
    let ghiChu = e.title;
    if (e.wrong_tries.length) ghiChu += " · Nước sai hay gặp: " + e.wrong_tries.join(", ");
    const dNuoc = ngatDong(f.dam, 10, nuoc, cotDapAn - 4);
    const dChuong = ngatDong(f.thuong, 8, ghiChu, cotChuong - 2);
    const cao = Math.max(dNuoc.length * 4.2, dChuong.length * 3.4);
    if (y + cao + 4.4 > yMax) trangMoi();
    hangBang([
      { t: String(e.id), x: xs.bai },
      { t: TEN_BEN[e.side_to_move], x: xs.ben },
      { t: dNuoc, x: xs.dapAn, dam: true },
      ...(coDiem ? [{ t: String(e.points), x: xs.diem }] : []),
      { t: dChuong, x: xs.chuong, co: 8, mau: XAM(90) },
    ], 1, cao);
  }
  if (coDiem) {
    if (y + 8.6 > yMax) trangMoi();
    hangBang([{ t: "Tổng", x: xs.diem - 4, dam: true, phai: true },
      { t: String(ws.exercises.reduce((s, e) => s + e.points, 0)), x: xs.diem, dam: true }], 1);
  }
  return trang;
}

// tai: { thuong, dam: bytes TTF; quan: { wK: bytes PNG, … } }; fontkit: thư viện @pdf-lib/fontkit
// ch: { tieuDe, capDo, bienSoan, boCuc, dapAn, sao: 0–3 ngôi sao cấp độ, logo: { loai: "png"|"jpeg", bytes } | null }
export async function taoPdf(ws, ch, tai, fontkit) {
  if (!ws.exercises.length) throw new Error("Chưa có bài nào để in.");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = {
    thuong: await doc.embedFont(tai.thuong, { subset: true }),
    dam: await doc.embedFont(tai.dam, { subset: true }),
  };
  if (ch.logo) f.logo = ch.logo.loai === "png" ? await doc.embedPng(ch.logo.bytes) : await doc.embedJpg(ch.logo.bytes);
  const quan = {};
  for (const [ten, png] of Object.entries(tai.quan)) quan[ten] = await doc.embedPng(png);
  const tieuDe = chuan((ch.tieuDe || ws.title || "Phiếu bài tập") + (ch.capDo ? ` · Cấp độ ${ch.capDo}` : ""));
  doc.setTitle(tieuDe);
  doc.setCreator("ChessBision");
  doc.setLanguage("vi");
  const trang = trangPhieu(doc, f, quan, ws, ch, tieuDe);
  if (ch.dapAn) trang.push(...trangDapAn(doc, f, ws, ch, ch.tieuDe || ws.title || "Phiếu bài tập"));
  const trai = ch.bienSoan ? `Biên soạn: ${ch.bienSoan}` : (ws.source.url || ws.source.file || "");
  trang.forEach((p, i) => chanTrang(but(p, f), trai, i + 1, trang.length));
  return await doc.save();
}
