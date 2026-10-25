// Phiếu bài tập → Word (.docx) ngay trong trình duyệt (thư viện docx). Cùng bố cục với pdf.js:
// tiêu đề + họ tên ở đầu mọi trang (header của Word), các hàng sơ đồ không tách giữa hai trang,
// chân trang có số trang, trang đáp án ở cuối (phần riêng, có đầu trang "Đáp án" lặp lại).
// Sơ đồ là ảnh PNG; chữ (tiêu đề, đề bài, đáp án) sửa được trong Word / Google Docs.
// Phiếu học sinh không bao giờ chứa đáp án; đáp án chỉ nằm ở các trang sau cùng.

import { RONG, CAO, VUNG_AN_TOAN, LE_TREN, LE_DUOI, KIEU_GAY, leTrang, rongThan, nhanIn, soDongTraLoi, dauPhieu } from "./pdf.js";
import { TEN_BEN } from "./tach_bai.js";
import { dongNuoc } from "./ky_hieu.js";

const KHE_COT = 12, KHE_HANG = 6;
const DAU_TRANG = 22;      // chỗ cho tiêu đề + họ tên (mm), nằm trong lề trên
// settings.xml có mirrorMargins (thư viện docx không có tùy chọn này): lề trái/phải thành lề trong/ngoài
const CAI_DAT_GUONG = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
  + '<w:displayBackgroundShape/><w:mirrorMargins/><w:evenAndOddHeaders w:val="false"/>'
  + '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>'
  + '</w:settings>';
const PX = 96 / 25.4;      // ảnh trong docx tính bằng px ở 96 dpi
const PHONG = "Arial";     // có sẵn trên mọi máy Windows / Mac, đủ dấu tiếng Việt

const chuan = (s) => (s || "").normalize("NFC");

function canhBanCo(cot, hang, them, rongND) {
  const rong = (rongND - KHE_COT * (cot - 1)) / cot;
  const cao = (CAO - LE_TREN - LE_DUOI - DAU_TRANG - 4 - KHE_HANG * (hang - 1)) / hang - them;
  return Math.floor(Math.min(rong, cao));
}

// D: không gian tên của thư viện docx; anh: { banCo(e, toaDo) → Promise<Uint8Array PNG> }
// ch: như pdf.js (tieuDe, capDo, bienSoan, boCuc, dapAn, sao, logo, leGay)
export async function taoDocx(ws, chVao, anh, D) {
  if (!ws.exercises.length) throw new Error("Chưa có bài nào để in.");
  const ch = { ...chVao, leGay: KIEU_GAY.includes(chVao.leGay) ? chVao.leGay : "trai" };
  const rongND = rongThan(ch.leGay);
  const mm = (v) => D.convertMillimetersToTwip(v);
  const chu = (text, o = {}) => new D.TextRun({ text: chuan(text), font: PHONG, ...o });
  const KHONG_VIEN = { top: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" } };
  const tenPhieu = nhanIn(ch.tieuDe || ws.title || "Phiếu bài tập");
  const tieuDe = tenPhieu + (ch.capDo ? ` · Cấp độ ${nhanIn(ch.capDo)}` : "");
  const sao = "★".repeat(ch.sao || 0);

  const logo = ch.logo ? await kichThuocAnh(ch.logo) : null;

  function dauTrang(de) {
    const trai = [];
    const dong1 = [];
    if (logo) {
      const h = 12 * PX, w = Math.min(30 * PX, h * logo.w / logo.h);
      dong1.push(new D.ImageRun({ type: ch.logo.loai === "png" ? "png" : "jpg", data: ch.logo.bytes,
        transformation: { width: Math.round(w), height: Math.round(w * logo.h / logo.w) } }), chu("  "));
    }
    dong1.push(chu(tieuDe, { bold: true, size: 30 }));
    if (sao) dong1.push(chu("  " + sao, { size: 24 }));
    trai.push(new D.Paragraph({ children: dong1 }));
    if (de) trai.push(new D.Paragraph({ children: [chu(nhanIn(de), { size: 21 })] }));
    const cham = (n) => ".".repeat(n);
    const phai = [
      new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [chu(`Họ tên: ${cham(40)}`, { size: 18 })] }),
      new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [chu(`Lớp: ${cham(12)}  Ngày: ${cham(16)}`, { size: 18 })] }),
    ];
    return [
      new D.Table({
        width: { size: 100, type: D.WidthType.PERCENTAGE },
        borders: { ...KHONG_VIEN, bottom: { style: D.BorderStyle.SINGLE, size: 12, color: "000000" } },
        rows: [new D.TableRow({ children: [
          new D.TableCell({ children: trai, verticalAlign: D.VerticalAlign.BOTTOM, width: { size: 62, type: D.WidthType.PERCENTAGE } }),
          new D.TableCell({ children: phai, verticalAlign: D.VerticalAlign.BOTTOM, width: { size: 38, type: D.WidthType.PERCENTAGE } }),
        ] })],
      }),
      new D.Paragraph({ spacing: { after: 80 }, children: [] }),
    ];
  }

  // ---------- trang phiếu ----------
  // Một bảng cho mọi bài, mỗi hàng không tách trang; Word tự dàn trang theo chiều cao thật của đề.
  const { cot, hang, toaDo, dongToiDa, de, them } = dauPhieu(ws, ch);
  const riengDe = de === null;
  const canh = Math.floor(canhBanCo(cot, hang, them + 1, rongND));
  const rongO = Math.floor(mm(rongND) / cot);
  const cham = ".".repeat(Math.max(10, Math.round(canh / 1.6)));
  const hangBang = [];
  for (let dau = 0; dau < ws.exercises.length; dau += cot) {
    const o = [];
    for (let c = 0; c < cot; c++) {
      const e = ws.exercises[dau + c];
      if (!e) { o.push(new D.TableCell({ children: [new D.Paragraph("")] })); continue; }
      const png = await anh.banCo(e, toaDo);
      const noi = [new D.Paragraph({ children: [new D.ImageRun({ type: "png", data: png,
        transformation: { width: Math.round(canh * PX), height: Math.round(canh * PX) } })] })];
      if (riengDe && e.task) noi.push(new D.Paragraph({ children: [chu(nhanIn(e.task), { size: 17 })] }));
      const traLoi = soDongTraLoi(e, dongToiDa);
      noi.push(new D.Paragraph({ spacing: { before: 60, after: traLoi > 1 ? 0 : mm(KHE_HANG) }, children: [
        chu(`${e.id}. `, { bold: true, size: 20 }),
        chu(e.side_to_move === "black" ? "●" : "○", { size: 20 }),
        chu(" " + cham, { size: 20 }),
      ] }));
      for (let k = 1; k < traLoi; k++) {
        noi.push(new D.Paragraph({ spacing: { before: 120, after: k === traLoi - 1 ? mm(KHE_HANG) : 0 }, children: [chu(cham + "....", { size: 20 })] }));
      }
      o.push(new D.TableCell({ children: noi, width: { size: rongO, type: D.WidthType.DXA } }));
    }
    hangBang.push(new D.TableRow({ cantSplit: true, children: o }));
  }
  const than = [new D.Table({ width: { size: mm(rongND), type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED,
    columnWidths: Array(cot).fill(rongO), borders: KHONG_VIEN, rows: hangBang })];
  const thanDapAn = [];

  // ---------- trang đáp án ----------
  if (ch.dapAn) {
    const coDiem = ws.exercises.some((e) => e.points_set);
    const rongBang = mm(rongND);
    const o = (text, { dam = false, co = 20, mau, rong } = {}) => new D.TableCell({
      ...(rong ? { width: { size: Math.round(rongBang * rong / 100), type: D.WidthType.DXA } } : {}),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: (Array.isArray(text) ? text : [text]).map((t) => new D.Paragraph({ children: [chu(t, { bold: dam, size: co, ...(mau ? { color: mau } : {}) })] })),
    });
    const VIEN = { style: D.BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
    const dong = [new D.TableRow({ tableHeader: true, children: [
      o("Bài", { dam: true, rong: 7 }), o("Bên đi", { dam: true, rong: 10 }), o("Đáp án", { dam: true, rong: coDiem ? 40 : 47 }),
      ...(coDiem ? [o("Điểm", { dam: true, rong: 7 })] : []), o("Chương", { dam: true, rong: 36 }),
    ] })];
    for (const e of ws.exercises) {
      let nuoc = e.solution.length ? dongNuoc(e.solution, e.side_to_move) : "(chưa có đáp án)";
      if (e.alt_solutions.length) nuoc += "  (hoặc " + e.alt_solutions.join(", ") + ")";
      const ghiChu = [nhanIn(e.title), ...(e.wrong_tries.length ? ["Nước sai hay gặp: " + e.wrong_tries.join(", ")] : [])];
      dong.push(new D.TableRow({ cantSplit: true, children: [
        o(String(e.id)), o(TEN_BEN[e.side_to_move]), o(nuoc, { dam: true }),
        ...(coDiem ? [o(String(e.points))] : []), o(ghiChu, { co: 18, mau: "3C3C3C" }),
      ] }));
    }
    if (coDiem) {
      dong.push(new D.TableRow({ children: [o(""), o(""), o("Tổng", { dam: true }),
        o(String(ws.exercises.reduce((s, e) => s + e.points, 0)), { dam: true }), o("")] }));
    }
    thanDapAn.push(
      new D.Table({ width: { size: rongBang, type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED,
        columnWidths: (coDiem ? [7, 10, 40, 7, 36] : [7, 10, 47, 36]).map((r) => Math.round(rongBang * r / 100)),
        borders: { top: VIEN, bottom: VIEN, left: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: VIEN, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        rows: dong }),
    );
  }

  const trai = nhanIn(ch.bienSoan ? `Biên soạn: ${ch.bienSoan}` : (ws.source.url || ws.source.file || ""));
  const chan = new D.Footer({ children: [new D.Paragraph({
    border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: "969696", space: 4 } },
    tabStops: [{ type: D.TabStopType.RIGHT, position: mm(rongND) }],
    children: [chu(trai, { size: 16, color: "505050" }),
      new D.TextRun({ font: PHONG, size: 16, color: "505050", children: ["\tTrang ", D.PageNumber.CURRENT, " / ", D.PageNumber.TOTAL_PAGES] })],
  })] });

  const le = leTrang(ch.leGay, 0);
  const trang = { size: { width: mm(RONG), height: mm(CAO) },
    margin: { top: mm(LE_TREN + DAU_TRANG), bottom: mm(LE_DUOI), left: mm(le.trai), right: mm(le.phai),
      header: mm(LE_TREN), footer: mm(VUNG_AN_TOAN + 1) } };
  const sections = [{
    properties: { page: trang },
    headers: { default: new D.Header({ children: dauTrang(de) }) },
    footers: { default: chan },
    children: than,
  }];
  if (thanDapAn.length) {
    sections.push({
      properties: { page: { ...trang, margin: { ...trang.margin, top: mm(LE_TREN + 14) } } },
      headers: { default: new D.Header({ children: [new D.Paragraph({
        border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: "000000", space: 2 } },
        children: [chu(`Đáp án · ${tenPhieu}`, { bold: true, size: 30 })] })] }) },
      footers: { default: chan },
      children: thanDapAn,
    });
  }
  const doc = new D.Document({
    creator: "ChessBision", title: tieuDe, language: "vi-VN",
    styles: { default: { document: { run: { font: PHONG, size: 20 } } } },
    sections,
  });
  const thay = ch.leGay === "guong" ? [{ path: "word/settings.xml", data: CAI_DAT_GUONG }] : [];
  return new Uint8Array(await D.Packer.toArrayBuffer(doc, false, thay));
}

// Kích thước ảnh logo (px) đọc thẳng từ đầu file PNG / JPEG.
async function kichThuocAnh({ loai, bytes }) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (loai === "png") return { w: v.getUint32(16), h: v.getUint32(20) };
  for (let i = 2; i + 9 < bytes.length;) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const ma = bytes[i + 1];
    if (ma >= 0xc0 && ma <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(ma)) return { w: v.getUint16(i + 7), h: v.getUint16(i + 5) };
    i += 2 + v.getUint16(i + 2);
  }
  return { w: 1, h: 1 };
}
