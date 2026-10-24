// Phiếu bài tập → Word (.docx) ngay trong trình duyệt (thư viện docx). Cùng bố cục với pdf.js:
// tiêu đề + họ tên, lưới sơ đồ, chân trang có số trang, trang đáp án ở cuối.
// Sơ đồ là ảnh PNG; chữ (tiêu đề, đề bài, đáp án) sửa được trong Word / Google Docs.
// Phiếu học sinh không bao giờ chứa đáp án; đáp án chỉ nằm ở các trang sau cùng.

import { BO_CUC } from "./pdf.js";
import { deChung, TEN_BEN } from "./tach_bai.js";
import { dongNuoc } from "./ky_hieu.js";

const RONG = 210, CAO = 297;
const LE_NGANG = 15, LE_TREN = 13, LE_DUOI = 16;
const KHE_COT = 12, KHE_HANG = 6;
const DAU_TRANG = 22;      // chỗ cho tiêu đề + họ tên (mm)
const PX = 96 / 25.4;      // ảnh trong docx tính bằng px ở 96 dpi
const PHONG = "Arial";     // có sẵn trên mọi máy Windows / Mac, đủ dấu tiếng Việt

const chuan = (s) => (s || "").normalize("NFC");

function canhBanCo(cot, hang, them) {
  const rong = (RONG - 2 * LE_NGANG - KHE_COT * (cot - 1)) / cot;
  const cao = (CAO - LE_TREN - LE_DUOI - DAU_TRANG - 4 - KHE_HANG * (hang - 1)) / hang - them;
  return Math.floor(Math.min(rong, cao));
}

// D: không gian tên của thư viện docx; anh: { banCo(e, toaDo) → Promise<Uint8Array PNG> }
// ch: như pdf.js (tieuDe, capDo, bienSoan, boCuc, dapAn, sao, logo)
export async function taoDocx(ws, ch, anh, D) {
  if (!ws.exercises.length) throw new Error("Chưa có bài nào để in.");
  const mm = (v) => D.convertMillimetersToTwip(v);
  const chu = (text, o = {}) => new D.TextRun({ text: chuan(text), font: PHONG, ...o });
  const KHONG_VIEN = { top: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" } };
  const tenPhieu = chuan(ch.tieuDe || ws.title || "Phiếu bài tập");
  const tieuDe = tenPhieu + (ch.capDo ? ` · Cấp độ ${chuan(ch.capDo)}` : "");
  const sao = "★".repeat(ch.sao || 0);

  const logo = ch.logo ? await kichThuocAnh(ch.logo) : null;

  function dauTrang(de, trangDau) {
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
    if (de) trai.push(new D.Paragraph({ children: [chu(de, { size: 21 })] }));
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
    ].map((k, i) => (i === 0 && !trangDau ? [new D.Paragraph({ children: [new D.PageBreak()] }), k] : [k])).flat();
  }

  // ---------- trang phiếu ----------
  const { cot, hang, toaDo } = BO_CUC[ch.boCuc] || BO_CUC["2x3"];
  const de = deChung(ws.exercises);
  const riengDe = de === null;
  const canh = canhBanCo(cot, hang, 9 + (riengDe ? 6 : 0));
  const moiTrang = cot * hang;
  const than = [];
  for (let dau = 0; dau < ws.exercises.length; dau += moiTrang) {
    than.push(...dauTrang(de, dau === 0));
    const nhom = ws.exercises.slice(dau, dau + moiTrang);
    const hangBang = [];
    for (let r = 0; r < Math.ceil(nhom.length / cot); r++) {
      const o = [];
      for (let c = 0; c < cot; c++) {
        const e = nhom[r * cot + c];
        if (!e) { o.push(new D.TableCell({ children: [new D.Paragraph("")] })); continue; }
        const png = await anh.banCo(e, toaDo);
        const noi = [new D.Paragraph({ children: [new D.ImageRun({ type: "png", data: png,
          transformation: { width: Math.round(canh * PX), height: Math.round(canh * PX) } })] })];
        if (riengDe) noi.push(new D.Paragraph({ children: [chu(e.task, { size: 17 })] }));
        noi.push(new D.Paragraph({ spacing: { after: mm(KHE_HANG) }, children: [
          chu(`${e.id}. `, { bold: true, size: 20 }),
          chu(e.side_to_move === "black" ? "●" : "○", { size: 20 }),
          chu(" " + ".".repeat(Math.max(10, Math.round(canh / 1.6))), { size: 20 }),
        ] }));
        o.push(new D.TableCell({ children: noi, width: { size: Math.floor(mm(RONG - 2 * LE_NGANG) / cot), type: D.WidthType.DXA } }));
      }
      hangBang.push(new D.TableRow({ cantSplit: true, children: o }));
    }
    than.push(new D.Table({ width: { size: mm(RONG - 2 * LE_NGANG), type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED,
      columnWidths: Array(cot).fill(Math.floor(mm(RONG - 2 * LE_NGANG) / cot)), borders: KHONG_VIEN, rows: hangBang }));
  }

  // ---------- trang đáp án ----------
  if (ch.dapAn) {
    const coDiem = ws.exercises.some((e) => e.points_set);
    const rongBang = mm(RONG - 2 * LE_NGANG);
    const o = (text, { dam = false, co = 20, mau, rong } = {}) => new D.TableCell({
      ...(rong ? { width: { size: Math.round(rongBang * rong / 100), type: D.WidthType.DXA } } : {}),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new D.Paragraph({ children: [chu(text, { bold: dam, size: co, ...(mau ? { color: mau } : {}) })] })],
    });
    const VIEN = { style: D.BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
    const dong = [new D.TableRow({ tableHeader: true, children: [
      o("Bài", { dam: true, rong: 7 }), o("Bên đi", { dam: true, rong: 10 }), o("Đáp án", { dam: true, rong: coDiem ? 40 : 47 }),
      ...(coDiem ? [o("Điểm", { dam: true, rong: 7 })] : []), o("Chương", { dam: true, rong: 36 }),
    ] })];
    for (const e of ws.exercises) {
      let nuoc = e.solution.length ? dongNuoc(e.solution, e.side_to_move) : "(chưa có đáp án)";
      if (e.alt_solutions.length) nuoc += "  (hoặc " + e.alt_solutions.join(", ") + ")";
      let ghiChu = e.title;
      if (e.wrong_tries.length) ghiChu += " · Nước sai hay gặp: " + e.wrong_tries.join(", ");
      dong.push(new D.TableRow({ cantSplit: true, children: [
        o(String(e.id)), o(TEN_BEN[e.side_to_move]), o(nuoc, { dam: true }),
        ...(coDiem ? [o(String(e.points))] : []), o(ghiChu, { co: 16, mau: "5A5A5A" }),
      ] }));
    }
    if (coDiem) {
      dong.push(new D.TableRow({ children: [o(""), o(""), o("Tổng", { dam: true }),
        o(String(ws.exercises.reduce((s, e) => s + e.points, 0)), { dam: true }), o("")] }));
    }
    than.push(
      new D.Paragraph({ children: [new D.PageBreak()] }),
      new D.Paragraph({ spacing: { after: 120 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: "000000", space: 2 } },
        children: [chu(`Đáp án · ${tenPhieu}`, { bold: true, size: 30 })] }),
      new D.Table({ width: { size: rongBang, type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED,
        columnWidths: (coDiem ? [7, 10, 40, 7, 36] : [7, 10, 47, 36]).map((r) => Math.round(rongBang * r / 100)),
        borders: { top: VIEN, bottom: VIEN, left: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: VIEN, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        rows: dong }),
    );
  }

  const trai = ch.bienSoan ? `Biên soạn: ${ch.bienSoan}` : (ws.source.url || ws.source.file || "");
  const chan = new D.Footer({ children: [new D.Paragraph({
    border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: "969696", space: 4 } },
    tabStops: [{ type: D.TabStopType.RIGHT, position: mm(RONG - 2 * LE_NGANG) }],
    children: [chu(trai, { size: 16, color: "505050" }),
      new D.TextRun({ font: PHONG, size: 16, color: "505050", children: ["\tTrang ", D.PageNumber.CURRENT, " / ", D.PageNumber.TOTAL_PAGES] })],
  })] });

  const doc = new D.Document({
    creator: "ChessBision", title: tieuDe, language: "vi-VN",
    styles: { default: { document: { run: { font: PHONG, size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: mm(RONG), height: mm(CAO) },
        margin: { top: mm(LE_TREN), bottom: mm(LE_DUOI), left: mm(LE_NGANG), right: mm(LE_NGANG), footer: mm(6) } } },
      footers: { default: chan },
      children: than,
    }],
  });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
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
