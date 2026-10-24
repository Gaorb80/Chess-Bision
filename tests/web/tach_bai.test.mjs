// Kiểm phần lõi của trang web (cùng kỳ vọng với tests/test_tach_bai.py). Chạy: node --test tests/web
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tach, deChung } from "../../web/js/tach_bai.js";
import { dongNuoc, san } from "../../web/js/ky_hieu.js";
import { docLink } from "../../web/js/lichess.js";

const mau = (ten) => readFileSync(new URL(`../../mau/${ten}`, import.meta.url), "utf8");

test("tách mẫu chiếu hết 1 nước", () => {
  const ws = tach(mau("chieu-het-1-nuoc.pgn"));
  assert.equal(ws.title, "Chiếu hết 1 nước");
  assert.deepEqual(ws.exercises.map((e) => e.solution), [["Ra8#"], ["Ra1#"], ["Qg7#"], ["Nf7#"], ["Nf2#"], ["Rh8#"], ["c8=Q#"]]);
  assert.deepEqual(ws.exercises.slice(0, 2).map((e) => e.side_to_move), ["white", "black"]);
  assert.equal(deChung(ws.exercises), "Chiếu hết sau 1 nước");
  const ma = new Set(ws.notices.map((n) => `${n.code}|${n.chapter}`));
  assert.ok(ma.has("duplicate|Trùng bài 1"));
  assert.ok(ma.has("full-game|Ván mẫu Italia"));
});

test("nhiều đáp án và nước sai hay gặp", () => {
  const bai = Object.fromEntries(tach(mau("chieu-het-1-nuoc.pgn")).exercises.map((e) => [e.title, e]));
  assert.deepEqual(bai["Hậu và Vua"].alt_solutions, ["Qa8#"]);
  assert.deepEqual(bai["Phong cấp"].alt_solutions, ["c8=R#"]);
  assert.deepEqual(bai["Xe và Vua"].wrong_tries, ["Ra1+"]);
});

test("giữ bài trùng khi tắt", () => {
  assert.equal(tach(mau("chieu-het-1-nuoc.pgn"), { boTrung: false }).exercises.length, 8);
});

test("đề từ bình luận và điểm", () => {
  const e = tach(mau("chieu-het-2-nuoc.pgn")).exercises[0];
  assert.ok(e.task.startsWith("Trắng đi. Hy sinh Hậu"));
  assert.equal(e.task_auto, false);
  assert.deepEqual(e.solution, ["Qg8+", "Rxg8", "Nf7#"]);
  assert.equal(e.points, 20);
  assert.deepEqual(e.wrong_tries, ["Nf7+"]);
});

test("nước sai luật bị bỏ", () => {
  const ws = tach('[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\n[SetUp "1"]\n\n1. Qd8# *\n');
  assert.equal(ws.exercises.length, 0);
  assert.equal(ws.notices[0].code, "illegal");
});

test("nước sai luật trong biến phụ cũng bị bắt", () => {
  const ws = tach('[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\n\n1. Ra8# (1. Qa8) *\n');
  assert.equal(ws.notices[0].code, "illegal");
});

test("PGN kiểu Lichess: CRLF, lệnh [%cal], NAG, nhiều ván thiếu dòng trống", () => {
  const pgn = '[Event "S: A"]\r\n[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\r\n\r\n{ [%cal Ga1a8] } 1. Ra8#! $1 *\r\n[Event "S: B"]\r\n[FEN "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1"]\r\n\r\n1.Rb8# *';
  const ws = tach(pgn);
  assert.deepEqual(ws.exercises.map((e) => [e.title, e.solution[0], e.task]), [["A", "Ra8#", "Chiếu hết sau 1 nước"], ["B", "Rb8#", "Chiếu hết sau 1 nước"]]);
});

test("ký hiệu và đánh số lại", () => {
  assert.equal(dongNuoc(["Qh2+", "Kf1", "Qf2#"], "black"), "1... Qh2+ 2. Kf1 Qf2#");
  assert.equal(dongNuoc(["Qg8+", "Rxg8", "Nf7#"], "white"), "1. Qg8+ Rxg8 2. Nf7#");
  assert.equal(san("exd8=Q+", "vi"), "exd8=H+");
  assert.equal(san("bxc3", "vi"), "bxc3");
});

test("đọc link Lichess", () => {
  assert.deepEqual(docLink("https://lichess.org/study/TqmJP6yk"), { study: "TqmJP6yk", chuong: null });
  assert.deepEqual(docLink("lichess.org/study/jcblcsmR/DOeAa4aD#3"), { study: "jcblcsmR", chuong: "DOeAa4aD" });
  assert.deepEqual(docLink("https://lichess.org/study/embed/jcblcsmR/DOeAa4aD"), { study: "jcblcsmR", chuong: "DOeAa4aD" });
  assert.deepEqual(docLink(" TqmJP6yk "), { study: "TqmJP6yk", chuong: null });
  assert.equal(docLink("https://lichess.org/abcdefgh"), null);
});
