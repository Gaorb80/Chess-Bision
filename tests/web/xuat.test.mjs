// Kiểm xuất Word và mẫu phiếu (chạy được trong Node, không cần trình duyệt).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as D from "../../web/vendor/docx.mjs";
import { tach } from "../../web/js/tach_bai.js";
import { taoDocx } from "../../web/js/docx.js";
import { kiemLogo, chuanMau, luuMau, docMauRieng, tatCaMau, xoaMau, capDoChung, logoThanhDataUrl, dataUrlThanhLogo, MAU_CO_SAN } from "../../web/js/mau_phieu.js";

const mau = (ten) => readFileSync(new URL(`../../mau/${ten}`, import.meta.url), "utf8");
// ảnh PNG 1×1 điểm ảnh
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

async function xmlCua(bytes) {
  // docx là file zip: tìm mục word/document.xml rồi giải nén bằng zlib của Node
  const { inflateRawSync } = await import("node:zlib");
  const b = Buffer.from(bytes);
  for (let i = 0; i < b.length - 30; i++) {
    if (b.readUInt32LE(i) !== 0x04034b50) continue;
    const nen = b.readUInt16LE(i + 8), dai = b.readUInt32LE(i + 18), ten = b.toString("utf8", i + 30, i + 30 + b.readUInt16LE(i + 26));
    const dau = i + 30 + b.readUInt16LE(i + 26) + b.readUInt16LE(i + 28);
    if (ten === "word/document.xml") {
      const raw = b.subarray(dau, dau + dai);
      return (nen === 8 ? inflateRawSync(raw) : raw).toString("utf8");
    }
  }
  throw new Error("không thấy word/document.xml");
}

const ch = { tieuDe: "Chiếu hết", capDo: "", bienSoan: "CLB Dream Chess", boCuc: "2x3", dapAn: true, sao: 2, logo: null };
const anh = { banCo: async () => PNG };

test("Word: có phiếu và đáp án ở cuối, ký hiệu quốc tế", async () => {
  const ws = tach(mau("chieu-het-1-nuoc.pgn"));
  const bytes = await taoDocx(ws, ch, anh, D);
  assert.equal(bytes[0], 0x50); // "PK": file zip
  const xml = await xmlCua(bytes);
  assert.ok(xml.includes("Chiếu hết"));
  assert.ok(xml.includes("★★"));
  const dapAn = xml.indexOf("Đáp án · Chiếu hết");
  assert.ok(dapAn > 0);
  // đáp án chỉ nằm sau tiêu đề trang đáp án
  assert.ok(xml.indexOf("Ra8#") > dapAn);
  assert.equal((xml.match(/<w:drawing>/g) || []).length, ws.exercises.length);
});

test("Word: tắt đáp án thì không có nước đáp án nào", async () => {
  const ws = tach(mau("chieu-het-2-nuoc.pgn"));
  const xml = await xmlCua(await taoDocx(ws, { ...ch, dapAn: false, boCuc: "3x4" }, anh, D));
  assert.ok(!xml.includes("Đáp án"));
  assert.ok(!xml.includes("Nf7#"));
});

test("Word: kèm logo", async () => {
  const ws = tach(mau("cap-do-chu-de.pgn"));
  const xml = await xmlCua(await taoDocx(ws, { ...ch, logo: { loai: "png", bytes: PNG } }, anh, D));
  assert.equal((xml.match(/<w:drawing>/g) || []).length, ws.exercises.length + 1);
});

test("logo: chỉ nhận PNG/JPEG thật, không quá 300 KB", () => {
  assert.equal(kiemLogo(PNG), "png");
  assert.equal(kiemLogo(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
  assert.throws(() => kiemLogo(new TextEncoder().encode("<svg onload=alert(1)>")), /PNG hoặc JPG/);
  assert.throws(() => kiemLogo(new Uint8Array(301 * 1024)), /quá lớn/);
  const url = logoThanhDataUrl(PNG);
  assert.deepEqual(dataUrlThanhLogo(url).bytes, PNG);
  assert.equal(dataUrlThanhLogo("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(dataUrlThanhLogo("javascript:alert(1)"), null);
});

function khoGia() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test("mẫu phiếu: lưu, thay cùng tên, xóa, bỏ trường lạ", () => {
  const k = khoGia();
  assert.equal(tatCaMau(k).length, MAU_CO_SAN.length);
  const a = luuMau({ ten: "CLB Dream Chess", boCuc: "3x4", dapAn: false, bienSoan: "Dương Bảo", logo: logoThanhDataUrl(PNG), lenh: "xấu" }, k);
  assert.equal(a.boCuc, "3x4");
  assert.equal("lenh" in a, false);
  luuMau({ ten: "CLB Dream Chess", boCuc: "2x3" }, k);
  assert.equal(docMauRieng(k).length, 1);
  assert.equal(docMauRieng(k)[0].boCuc, "2x3");
  assert.throws(() => luuMau({ ten: MAU_CO_SAN[0].ten }, k), /trùng/);
  assert.equal(chuanMau({ ten: "x", boCuc: "9x9", logo: "javascript:1" }).boCuc, "2x3");
  assert.equal(chuanMau({ ten: "x", logo: "data:image/svg+xml;base64,PHN2Zz4=" }).logo, null);
  xoaMau(a.id, k);
  assert.equal(docMauRieng(k).length, 0);
  k.setItem("chessbision.mau-phieu", "{hỏng");
  assert.deepEqual(docMauRieng(k), []);
});

test("cấp độ chung của các bài được chọn", () => {
  assert.equal(capDoChung([{ level: 2 }, { level: 2 }]), 2);
  assert.equal(capDoChung([{ level: 2 }, { level: 1 }]), 0);
  assert.equal(capDoChung([{ level: null }]), 0);
});
