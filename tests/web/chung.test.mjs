// Phép thử chung với bản Python: bản web phải tách mỗi PGN trong mau/ ra đúng
// tests/chung/<tên>.json (file do tests/chung/cap_nhat.py ghi từ python-chess).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { tach } from "../../web/js/tach_bai.js";

const thuMuc = (p) => new URL(p, import.meta.url);

for (const ten of readdirSync(thuMuc("../../mau/")).filter((f) => f.endsWith(".pgn")).sort()) {
  test(`khớp kết quả chung: ${ten}`, () => {
    const mong = JSON.parse(readFileSync(thuMuc(`../chung/${ten.replace(/\.pgn$/, ".json")}`), "utf8"));
    const ws = tach(readFileSync(thuMuc(`../../mau/${ten}`), "utf8"));
    // points_set chỉ bản web dùng (để biết có in cột Điểm); so các trường chung
    const khoa = Object.keys(mong.exercises[0] || {});
    assert.deepEqual({
      title: ws.title,
      exercises: ws.exercises.map((e) => Object.fromEntries(khoa.map((k) => [k, e[k]]))),
      notices: ws.notices.map((n) => [n.code, n.chapter]),
    }, mong);
  });
}
