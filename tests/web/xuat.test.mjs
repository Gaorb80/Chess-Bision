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

async function xmlCua(bytes, mau = /^word\/document\.xml$/) {
  // docx là file zip: tìm các mục khớp mẫu tên (mặc định word/document.xml) rồi giải nén bằng zlib của Node
  const { inflateRawSync } = await import("node:zlib");
  const b = Buffer.from(bytes);
  const ra = [];
  for (let i = 0; i < b.length - 30; i++) {
    if (b.readUInt32LE(i) !== 0x04034b50) continue;
    const nen = b.readUInt16LE(i + 8), dai = b.readUInt32LE(i + 18), ten = b.toString("utf8", i + 30, i + 30 + b.readUInt16LE(i + 26));
    const dau = i + 30 + b.readUInt16LE(i + 26) + b.readUInt16LE(i + 28);
    if (mau.test(ten)) {
      const raw = b.subarray(dau, dau + dai);
      ra.push((nen === 8 ? inflateRawSync(raw) : raw).toString("utf8"));
    }
  }
  if (!ra.length) throw new Error(`không thấy ${mau}`);
  return ra.join("\n");
}

const ch = { tieuDe: "Chiếu hết", capDo: "", bienSoan: "CLB Dream Chess", boCuc: "2x3", dapAn: true, sao: 2, logo: null };
const anh = { banCo: async () => PNG };

test("Word: có phiếu và đáp án ở cuối, ký hiệu quốc tế", async () => {
  const ws = tach(mau("chieu-het-1-nuoc.pgn"));
  const bytes = await taoDocx(ws, ch, anh, D);
  assert.equal(bytes[0], 0x50); // "PK": file zip
  const xml = await xmlCua(bytes);
  // đầu trang (tiêu đề, họ tên) nằm trong header của Word nên lặp lại ở mọi trang
  const dau = await xmlCua(bytes, /^word\/header\d+\.xml$/);
  assert.ok(dau.includes("Chiếu hết") && dau.includes("★★") && dau.includes("Họ tên"));
  assert.ok(dau.includes("Đáp án · Chiếu hết"));
  // đáp án chỉ nằm ở phần thứ hai (sau ngắt phần đầu tiên)
  const hetPhieu = xml.indexOf("<w:sectPr");
  assert.ok(hetPhieu > 0 && xml.indexOf("Ra8#") > hetPhieu);
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
  const xml = await xmlCua(await taoDocx(ws, { ...ch, logo: { loai: "png", bytes: PNG } }, anh, D), /^word\/(document|header\d+)\.xml$/);
  assert.equal((xml.match(/<w:drawing>/g) || []).length, ws.exercises.length + 1);
});

test("Word: đề dài in đủ, bỏ emoji, số dòng trả lời theo độ dài đáp án", async () => {
  const ws = tach(mau("de-dai-dap-an-rieng.pgn"));
  const xml = await xmlCua(await taoDocx(ws, ch, anh, D));
  const deDai = ws.exercises[0].task;
  assert.ok(deDai.length > 800);
  assert.ok(xml.includes(deDai.slice(-60)), "đề dài phải còn đủ tới chữ cuối");
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{FE0F}]/u.test(xml), "không còn emoji trong phiếu");
  assert.ok(xml.includes("Nước sai hay gặp: Bxf7+"));
});

test("Word: in hai mặt thì lề soi gương, mặc định chừa lề ghim bên trái", async () => {
  const ws = tach(mau("chieu-het-1-nuoc.pgn"));
  const mm = (xml, k) => Number(xml.match(new RegExp(`<w:pgMar [^>]*w:${k}="(\\d+)"`))[1]) / 1440 * 25.4;
  const b1 = await taoDocx(ws, ch, anh, D);
  const xml1 = await xmlCua(b1);
  assert.ok(Math.abs(mm(xml1, "left") - 25) < 0.1 && Math.abs(mm(xml1, "right") - 18) < 0.1);
  assert.ok(!(await xmlCua(b1, /^word\/settings\.xml$/)).includes("mirrorMargins"));
  const b2 = await taoDocx(ws, { ...ch, leGay: "guong" }, anh, D);
  assert.ok((await xmlCua(b2, /^word\/settings\.xml$/)).includes("<w:mirrorMargins/>"));
  const xml3 = await xmlCua(await taoDocx(ws, { ...ch, leGay: "khong" }, anh, D));
  assert.ok(Math.abs(mm(xml3, "left") - 18) < 0.1);
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
