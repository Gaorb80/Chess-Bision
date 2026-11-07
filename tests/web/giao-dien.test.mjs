// Phép thử giao diện: index.html và app.js phải khớp nhau, và trang giữ đúng CSP.
// Chạy được trong Node, không cần trình duyệt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const doc = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const html = doc("../../web/index.html");
const js = doc("../../web/js/app.js");

test("mọi id app.js dùng đều có trong index.html", () => {
  const co = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const dung = new Set([...js.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]));
  const thieu = [...dung].filter((id) => !co.has(id)).sort();
  assert.deepEqual(thieu, [], `index.html thiếu id: ${thieu.join(", ")}`);
  assert.ok(co.has("luoi") && co.has("danh-sach"), "phải có cả lưới máy tính và danh sách điện thoại");
});

test("ba bước và cột phiếu xem trước có mặt", () => {
  for (const id of ["buoc-1", "buoc-2", "buoc-3", "buoc-nav", "xem-truoc", "tom-tat-phieu", "nut-tai", "nut-word"]) {
    assert.match(html, new RegExp(`id="${id}"`), `thiếu #${id}`);
  }
  // hai nút tải ở thanh trên và thanh dưới điện thoại
  assert.match(html, /id="nut-tai-dau"/);
  assert.match(html, /id="nut-tai-duoi"/);
});

test("CSP giữ nguyên: chỉ script của trang, chỉ gọi mạng tới lichess.org", () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /connect-src 'self' https:\/\/lichess\.org/);
  // không có script nội tuyến hay style ngoài trang
  assert.equal([...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/g)].length, 0, "không được có script nội tuyến");
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
});

test("chữ lấy từ PGN phải đi qua thoat() khi ghép HTML", () => {
  // các trường do PGN quyết định: tên bài, đề, đáp án, thông báo, tên study
  const mau = [
    /thoat\(deBai\(e\)\)/,
    /thoat\(dapAn\(e\)\)/,
    /thoat\(e\.title\)/,
    /thoat\(n\.chapter\)/,
    /thoat\(n\.message\)/,
    /thoat\(ws\.title\)/,
  ];
  for (const m of mau) assert.match(js, m, `thiếu lớp thoát cho ${m}`);
});
