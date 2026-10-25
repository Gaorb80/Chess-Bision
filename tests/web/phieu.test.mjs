// Bố cục PDF web theo báo cáo kiểm thử study dài (đề nhiều đoạn, đáp án ở chương riêng):
// không cắt đề, mọi trang có đầu trang, lề ghim/gáy, dòng trả lời, bỏ emoji. Chạy trong Node.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFPage } from "../../web/vendor/pdf-lib.esm.min.js";
import { tach } from "../../web/js/tach_bai.js";
import { taoPdf, BO_CUC, RONG, CAO, LE_GAY, soDongTraLoi, nhanIn } from "../../web/js/pdf.js";

globalThis.self = globalThis;
await import("../../web/vendor/fontkit.umd.min.js");
const fontkit = globalThis.fontkit;

const goc = (p) => new URL(`../../${p}`, import.meta.url);
const PT = 72 / 25.4;
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
const quan = Object.fromEntries([..."wb"].flatMap((m) => [..."KQRBNP"].map((q) => [m + q, PNG])));
const tai = { thuong: readFileSync(goc("web/tai-nguyen/phong/BeVietnamPro-Regular.ttf")),
  dam: readFileSync(goc("web/tai-nguyen/phong/BeVietnamPro-SemiBold.ttf")), quan };
const ch = { tieuDe: "", bienSoan: "", dapAn: true, sao: 0, logo: null };
const mau = (ten) => tach(readFileSync(goc(`mau/${ten}`), "utf8"));

// Chạy taoPdf, ghi lại theo từng trang: chữ đã vẽ và khung bao mọi nét (mm, gốc trên trái).
async function ve(ws, tuyChon) {
  const trang = new Map();
  const cua = (p) => trang.get(p) || trang.set(p, { chu: [], net: [] }).get(p);
  const net = (p, x0, y0, x1, y1) => cua(p).net.push({ x0: x0 / PT, x1: x1 / PT, tren: CAO - y1 / PT, duoi: CAO - y0 / PT });
  const cu = {};
  const boc = (ten, f) => { cu[ten] = PDFPage.prototype[ten]; PDFPage.prototype[ten] = function (...a) { f(this, ...a); return cu[ten].apply(this, a); }; };
  boc("drawText", (p, t, o) => { cua(p).chu.push(t); net(p, o.x, o.y - 0.3 * o.size, o.x + o.font.widthOfTextAtSize(t, o.size), o.y + o.size); });
  boc("drawLine", (p, o) => net(p, Math.min(o.start.x, o.end.x), Math.min(o.start.y, o.end.y), Math.max(o.start.x, o.end.x), Math.max(o.start.y, o.end.y)));
  boc("drawRectangle", (p, o) => net(p, o.x, o.y, o.x + o.width, o.y + o.height));
  boc("drawImage", (p, _i, o) => net(p, o.x, o.y, o.x + o.width, o.y + o.height));
  boc("drawCircle", (p, o) => net(p, o.x - o.size, o.y - o.size, o.x + o.size, o.y + o.size));
  try {
    const kq = await taoPdf(ws, { ...ch, ...tuyChon }, tai, fontkit);
    return { ...kq, trang: [...trang.values()] };
  } finally {
    Object.assign(PDFPage.prototype, cu);
  }
}
const gop = (ds) => ds.join(" ").replace(/\s+/g, " ");

for (const boCuc of Object.keys(BO_CUC)) {
  test(`${boCuc}: đề dài in đủ tới chữ cuối, không cắt, không cảnh báo`, async () => {
    const ws = mau("de-dai-dap-an-rieng.pgn");
    const kq = await ve(ws, { boCuc });
    assert.deepEqual(kq.canhBao, []);
    const chu = gop(kq.trang.slice(0, kq.soTrangBai).flatMap((t) => t.chu));
    for (const e of ws.exercises) assert.ok(chu.includes(nhanIn(e.task)), `bài ${e.id}: đề bị cắt`);
    assert.ok(!chu.includes("…"));
  });

  test(`${boCuc}: trang bài nào cũng có tiêu đề và chỗ ghi họ tên`, async () => {
    const ws = mau("de-dai-dap-an-rieng.pgn");
    ws.exercises = [...ws.exercises, ...ws.exercises, ...ws.exercises].map((e, i) => ({ ...e, id: i + 1 }));
    const kq = await ve(ws, { boCuc });
    assert.ok(kq.soTrangBai >= 2);
    kq.trang.slice(0, kq.soTrangBai).forEach((t, i) => {
      assert.ok(t.chu.includes("Họ tên:"), `trang ${i + 1} thiếu họ tên`);
      assert.ok(t.chu.includes("Phòng thủ chủ động"), `trang ${i + 1} thiếu tiêu đề`);
    });
    kq.trang.slice(kq.soTrangBai).forEach((t) => assert.ok(t.chu.some((c) => c.startsWith("Đáp án ·"))));
  });
}

test("6 thế/trang: bài ngắn vẫn đủ 6 thế mỗi trang", async () => {
  const ws = mau("chieu-het-1-nuoc.pgn");   // 7 bài chiếu hết 1 nước
  const kq = await ve(ws, { boCuc: "2x3" });
  assert.equal(kq.soTrangBai, 2);
  assert.equal(kq.soTrangDapAn, 1);
});

test("đề dài hơn cả trang: cắt có báo, không tràn lề", async () => {
  const ws = mau("de-dai-dap-an-rieng.pgn");
  ws.exercises[0].task = "Đề rất dài. ".repeat(900);
  const kq = await ve(ws, { boCuc: "3x4" });
  assert.equal(kq.canhBao.length, 1);
  assert.match(kq.canhBao[0], /^Bài 1: đề quá dài/);
  for (const t of kq.trang) for (const n of t.net) assert.ok(n.duoi <= CAO - 15 && n.tren >= 15);
});

for (const [leGay, trongLe, trongChan] of [["trai", "trai", "trai"], ["guong", "trai", "phai"], ["khong", null, null]]) {
  test(`lề gáy "${leGay}": chừa ${LE_GAY} mm phía ghim, góc ghim 25 × 25 mm để trống`, async () => {
    const ws = mau("de-dai-dap-an-rieng.pgn");
    ws.exercises = [...ws.exercises, ...ws.exercises].map((e, i) => ({ ...e, id: i + 1 }));
    const kq = await ve(ws, { boCuc: "2x3", leGay });
    assert.ok(kq.trang.length >= 3);
    kq.trang.forEach((t, i) => {
      const trai = Math.min(...t.net.map((n) => n.x0)), phai = RONG - Math.max(...t.net.map((n) => n.x1));
      const trong = i % 2 ? trongChan : trongLe;
      if (!trong) { assert.ok(trai >= 17.9 && phai >= 17.9); return; }
      assert.ok((trong === "trai" ? trai : phai) >= LE_GAY - 0.01, `trang ${i + 1}: lề gáy ${trong} thiếu`);
      // góc ghim ở mặt trước (trang lẻ) bên trái trên, ở mặt sau (trang chẵn khi in hai mặt) bên phải trên
      const goc = t.net.filter((n) => n.tren < 25 && (trong === "trai" ? n.x0 < 24.99 : n.x1 > RONG - 24.99));
      assert.deepEqual(goc, [], `trang ${i + 1}: có nét trong góc ghim ${JSON.stringify(goc)}`);
    });
  });
}

test("số dòng trả lời theo độ dài đáp án, không quá giới hạn của bố cục", () => {
  const e = (n) => ({ solution: Array(n).fill("e4") });
  assert.equal(soDongTraLoi(e(1)), 1);
  assert.equal(soDongTraLoi(e(3)), 1);
  assert.equal(soDongTraLoi(e(5)), 2);
  assert.equal(soDongTraLoi(e(13)), 4);
  assert.equal(soDongTraLoi(e(0)), 4);
  assert.equal(soDongTraLoi(e(13), BO_CUC["2x3"].dongToiDa), 2);
  assert.equal(soDongTraLoi(e(13), BO_CUC["3x4"].dongToiDa), 1);
});

test("emoji trong tên chương bị bỏ khi in, chữ tiếng Việt giữ nguyên", async () => {
  assert.equal(nhanIn("🧠 Play Practically #1"), "Play Practically #1");
  assert.equal(nhanIn("1️⃣ PLAY"), "1 PLAY");
  assert.equal(nhanIn("⚖️ Phòng thủ chủ động"), "Phòng thủ chủ động");
  const kq = await ve(mau("de-dai-dap-an-rieng.pgn"), { boCuc: "2x3" });
  const chu = gop(kq.trang.flatMap((t) => t.chu));
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(chu));
});

test("tùy chọn đề: chỉ in thế cờ thì không có chữ đề; chỉ đề tự viết thì bỏ bình luận; tắt riêng từng bài", async () => {
  const { deIn } = await import("../../web/js/tach_bai.js");
  const ws = mau("de-dai-dap-an-rieng.pgn");
  const dai = ws.exercises[0], tuDong = ws.exercises[0].task_auto;
  assert.ok(!tuDong && dai.task.length > 800);
  assert.equal(deIn(dai, "tat-ca"), dai.task);
  assert.equal(deIn(dai, "ngan"), "");
  assert.equal(deIn(dai, "khong"), "");
  assert.equal(deIn({ ...dai, inDe: false }, "tat-ca"), "");
  const auto = mau("chieu-het-1-nuoc.pgn").exercises[0];
  assert.ok(auto.task_auto && deIn(auto, "ngan") === auto.task);
  // PDF: không còn chữ đề, bài vẫn đủ
  const khong = { ...ws, exercises: ws.exercises.map((e, i) => ({ ...e, id: i + 1, task: deIn(e, "khong") })) };
  const kq = await ve(khong, { boCuc: "3x4" });
  const chu = gop(kq.trang.slice(0, kq.soTrangBai).flatMap((t) => t.chu));
  assert.ok(!chu.includes("Thế cờ này lấy từ") && !chu.includes("Trắng đi."));
  assert.equal(kq.soTrangBai, 1);
  assert.deepEqual(kq.canhBao, []);
  // một bài tắt đề, bài khác giữ
  const mot = { ...ws, exercises: ws.exercises.map((e, i) => ({ ...e, id: i + 1, task: deIn(i ? e : { ...e, inDe: false }, "tat-ca") })) };
  const chu2 = gop((await ve(mot, { boCuc: "2x3" })).trang.flatMap((t) => t.chu));
  assert.ok(!chu2.includes("Thế cờ này lấy từ") && chu2.includes("Trắng đi."));
});
