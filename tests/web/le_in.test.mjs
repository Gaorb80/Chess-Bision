// Lề in an toàn (#10): mọi nét trên PDF web, kể cả chân trang, cách mép giấy ít nhất VUNG_AN_TOAN;
// bản Word đặt lề và chân trang tương ứng. Chạy được trong Node, không cần trình duyệt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { PDFPage } from "../../web/vendor/pdf-lib.esm.min.js";
import * as D from "../../web/vendor/docx.mjs";
import { tach } from "../../web/js/tach_bai.js";
import { taoPdf, BO_CUC, VUNG_AN_TOAN, RONG, CAO } from "../../web/js/pdf.js";
import { taoDocx } from "../../web/js/docx.js";

globalThis.self = globalThis;          // fontkit bản UMD gắn vào self
await import("../../web/vendor/fontkit.umd.min.js");
const fontkit = globalThis.fontkit;

const goc = (p) => new URL(`../../${p}`, import.meta.url);
const PT = 72 / 25.4;
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
const quan = Object.fromEntries([..."wb"].flatMap((m) => [..."KQRBNP"].map((q) => [m + q, PNG])));
const tai = { thuong: readFileSync(goc("web/tai-nguyen/phong/BeVietnamPro-Regular.ttf")),
  dam: readFileSync(goc("web/tai-nguyen/phong/BeVietnamPro-SemiBold.ttf")), quan };
const ch = { tieuDe: "Chiếu hết", capDo: "", bienSoan: "CLB Dream Chess", dapAn: true, sao: 3, logo: { loai: "png", bytes: PNG } };
// đề dài hai dòng như study thật, để hàng sơ đồ cuối chiếm nhiều chỗ nhất
function bai(ten) {
  const ws = tach(readFileSync(goc(`mau/${ten}`), "utf8"));
  ws.exercises.forEach((e, i) => { e.task = `This position comes from an online rapid game between two players rated over 2000 (${i})`; });
  return ws;
}

// Ghi lại khung bao (pt, gốc dưới trái) của mọi nét vẽ trên từng trang.
function ghiKhung() {
  const khung = new Map();
  const them = (p, x0, y0, x1, y1) => {
    const k = khung.get(p) || { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    khung.set(p, { x0: Math.min(k.x0, x0), y0: Math.min(k.y0, y0), x1: Math.max(k.x1, x1), y1: Math.max(k.y1, y1) });
  };
  const cu = {};
  const boc = (ten, f) => { cu[ten] = PDFPage.prototype[ten]; PDFPage.prototype[ten] = function (...a) { f(this, ...a); return cu[ten].apply(this, a); }; };
  boc("drawText", (p, t, o) => { const w = o.font.widthOfTextAtSize(t, o.size); them(p, o.x, o.y - 0.3 * o.size, o.x + w, o.y + o.size); });
  boc("drawLine", (p, o) => them(p, Math.min(o.start.x, o.end.x), Math.min(o.start.y, o.end.y), Math.max(o.start.x, o.end.x), Math.max(o.start.y, o.end.y)));
  boc("drawRectangle", (p, o) => them(p, o.x, o.y, o.x + o.width, o.y + o.height));
  boc("drawImage", (p, _i, o) => them(p, o.x, o.y, o.x + o.width, o.y + o.height));
  boc("drawCircle", (p, o) => them(p, o.x - o.size, o.y - o.size, o.x + o.size, o.y + o.size));
  boc("drawSvgPath", (p, _d, o) => them(p, o.x, o.y - 10, o.x + 10, o.y));
  return { khung, tra: () => Object.assign(PDFPage.prototype, cu) };
}

for (const boCuc of Object.keys(BO_CUC)) {
  for (const ten of ["chieu-het-1-nuoc.pgn", "cap-do-chu-de.pgn"]) {
    test(`PDF web ${boCuc}, ${ten}: mọi nét cách mép giấy ≥ ${VUNG_AN_TOAN} mm`, async () => {
      const g = ghiKhung();
      try { await taoPdf(bai(ten), { ...ch, boCuc }, tai, fontkit); } finally { g.tra(); }
      assert.ok(g.khung.size >= 2);
      for (const k of g.khung.values()) {
        const le = { trai: k.x0 / PT, phai: RONG - k.x1 / PT, duoi: k.y0 / PT, tren: CAO - k.y1 / PT };
        for (const [phia, v] of Object.entries(le)) assert.ok(v >= VUNG_AN_TOAN, `lề ${phia} chỉ còn ${v.toFixed(1)} mm`);
      }
    });
  }
}

test(`Word: lề trang và chân trang ≥ ${VUNG_AN_TOAN} mm`, async () => {
  const bytes = Buffer.from(await taoDocx(bai("chieu-het-1-nuoc.pgn"), { ...ch, boCuc: "2x3", logo: null }, { banCo: async () => PNG }, D));
  let xml = "";
  for (let i = 0; i < bytes.length - 30; i++) {
    if (bytes.readUInt32LE(i) !== 0x04034b50) continue;
    const dt = bytes.readUInt16LE(i + 26), dau = i + 30 + dt + bytes.readUInt16LE(i + 28);
    if (bytes.toString("utf8", i + 30, i + 30 + dt) !== "word/document.xml") continue;
    const raw = bytes.subarray(dau, dau + bytes.readUInt32LE(i + 18));
    xml = (bytes.readUInt16LE(i + 8) === 8 ? inflateRawSync(raw) : raw).toString("utf8");
  }
  const m = xml.match(/<w:pgMar [^>]*>/)[0];
  const twip = (k) => Number(m.match(new RegExp(`w:${k}="(\\d+)"`))[1]) / 1440 * 25.4;
  for (const k of ["top", "bottom", "left", "right", "footer"]) assert.ok(twip(k) >= VUNG_AN_TOAN, `${k} = ${twip(k).toFixed(1)} mm`);
  assert.ok(twip("bottom") > twip("footer") + 5, "chân trang phải nằm gọn trong lề dưới");
});
