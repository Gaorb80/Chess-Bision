// PGN → bài tập (bản trình duyệt của src/chessbision/tach_bai.py, cùng quy ước).
// Mọi nước đi và khẳng định (chiếu hết, số đáp án) đều do chess.js tính.
//
// Mỗi chương (ván) có tag [FEN] là một bài. Thế cờ đầu là đề, nhánh chính là
// đáp án, nước đầu của các biến phụ là nước sai hay gặp. Chương là ván đầy đủ
// (không có [FEN]) được bỏ qua và báo lại. Chương trùng thế cờ được bỏ qua, trừ khi
// bài trước chưa có nước đáp án: khi đó nước đi của chương sau thành đáp án của bài trước.

import { Chess } from "../vendor/chess.js";
import { docPgn } from "./pgn.js";

const LENH = /\[%[^\[\]]*\]/g;   // [%cal …] [%csl …] [%eval …] [%clk …]
export const TEN_BEN = { white: "Trắng", black: "Đen" };

function tenChuong(h, so) {
  if (h.ChapterName) return h.ChapterName;
  if (h.Event && h.Event !== "?") return h.Event.split(": ").slice(1).join(": ") || h.Event;
  return `Ván ${so}`;
}

const binhLuan = (s) => s.replace(LENH, "").split(/\s+/).filter(Boolean).join(" ");

// bỏ số nước: hai bài cùng thế cờ, cùng bên đi, cùng quyền nhập thành là trùng
const khoaTheCo = (fen) => fen.split(" ").slice(0, 4).join(" ");

function diNuoc(chess, san) {
  try {
    return chess.move(san, { strict: false });
  } catch {
    return null;
  }
}

// Kiểm cả cây: trả về lỗi đầu tiên (chuỗi) hoặc null. Biến phụ đi từ thế trước nước nó thay thế.
function kiemDong(fen, line) {
  const chess = new Chess(fen);
  for (const nuoc of line) {
    const truoc = chess.fen();
    for (const bien of nuoc.variations) {
      const loi = kiemDong(truoc, bien);
      if (loi) return loi;
    }
    if (!diNuoc(chess, nuoc.san)) return `nước không hợp luật ${nuoc.san} ở thế ${truoc}`;
  }
  return null;
}

function cacNuocChieuHet(fen) {
  const chess = new Chess(fen);
  return chess.moves({ verbose: true }).filter((m) => {
    const b = new Chess(fen);
    b.move(m.san);
    return b.isCheckmate();
  }).map((m) => m.san);
}

export function tach(pgnText, { boTrung = true, nguon = {} } = {}) {
  const bai = [];
  const bao = [];
  const daCo = new Map();
  let tenStudy = "";
  let so = 0;
  for (const game of docPgn(pgnText)) {
    so++;
    const h = game.headers;
    const ten = tenChuong(h, so);
    tenStudy = tenStudy || h.StudyName || "";
    const url = h.ChapterURL || (h.Site || "").replace(/\?/g, "");
    if (!h.FEN) {
      bao.push(game.hasMoves
        ? { code: "full-game", chapter: ten, message: "Chương là ván đầy đủ, không có thế cờ bắt đầu ([FEN]); bỏ qua." }
        : { code: "empty-chapter", chapter: ten, message: "Chương trống; bỏ qua." });
      continue;
    }
    let chess;
    try {
      chess = new Chess(h.FEN);
    } catch (e) {
      bao.push({ code: "illegal", chapter: ten, message: `Thế cờ (FEN) sai, bỏ qua: ${e.message}` });
      continue;
    }
    const fen = chess.fen();
    const loi = (game.errors && game.errors[0]) || kiemDong(fen, game.moves);
    if (loi) {
      bao.push({ code: "illegal", chapter: ten, message: `PGN có lỗi, bỏ qua: ${loi}` });
      continue;
    }
    const khoa = khoaTheCo(fen);
    const ben = chess.turn() === "w" ? "white" : "black";
    const sol = game.moves.map((m) => diNuoc(chess, m.san).san);
    const chieuHet = sol.length % 2 === 1 && chess.isCheckmate();
    const deTuDong = chieuHet ? `Chiếu hết sau ${(sol.length + 1) / 2} nước` : null;
    const sai = game.moves.length
      ? game.moves[0].variations.filter((v) => v.length).map((v) => new Chess(fen).move(v[0].san, { strict: false }).san)
      : [];
    const deBl = binhLuan(game.comment);
    const de = deBl || deTuDong || "Tìm nước đi tốt nhất";

    let khac = [];
    const baoRieng = [];
    if (deTuDong && sol.length === 1) {
      khac = cacNuocChieuHet(fen).filter((m) => m !== sol[0]);
      if (khac.length) {
        baoRieng.push({ code: "multi-solution", chapter: ten, message: `Có ${khac.length + 1} nước chiếu hết: ${[sol[0], ...khac].join(", ")}. Đáp án ghi đủ.` });
      }
    }

    if (boTrung && daCo.has(khoa)) {
      const truoc = bai[daCo.get(khoa) - 1];
      if (!truoc.solution.length && sol.length) {
        // study hay tách "Bài tập" (chỉ có thế cờ) và "Đáp án" (cùng thế cờ, có nước đi) thành hai chương
        Object.assign(truoc, { solution: sol, alt_solutions: khac, wrong_tries: sai });
        if (truoc.task_auto) truoc.task = de;
        const j = bao.findIndex((n) => n.code === "no-moves" && n.chapter === truoc.title);
        if (j >= 0) bao.splice(j, 1);
        bao.push(...baoRieng, { code: "merged-answer", chapter: ten,
          message: `Cùng thế cờ với bài ${truoc.id} (chưa có đáp án): lấy nước đi ở chương này làm đáp án cho bài ${truoc.id}.` });
      } else {
        bao.push({ code: "duplicate", chapter: ten, message: `Trùng thế cờ với bài ${daCo.get(khoa)}; bỏ qua.` });
      }
      continue;
    }

    bao.push(...baoRieng);
    if (!sol.length) {
      bao.push({ code: "no-moves", chapter: ten, message: "Chương có thế cờ nhưng chưa có nước đáp án; nên bỏ bài này hoặc thêm đáp án trước khi in." });
    }
    const diem = /^\d+$/.test(h.Points || "") ? parseInt(h.Points, 10) : null;

    bai.push({
      id: bai.length + 1,
      fen,
      side_to_move: ben,
      task: de,
      task_auto: !deBl,
      solution: sol,
      alt_solutions: khac,
      wrong_tries: sai,
      points: diem ?? 10,
      points_set: diem !== null,
      title: ten,
      source_url: url,
      level: docCapDo(h.Level || ""),
      themes: docChuDe(h.Theme || ""),
    });
    daCo.set(khoa, bai.length);
  }
  return { kind: "worksheet", title: tenStudy, exercises: bai, notices: bao, source: nguon };
}

// Tag [Level] → 1–3. Nhận "1".."3", "★".."★★★" (hoặc "*"), "A".."C"; khác thì null.
export function docCapDo(giaTri) {
  const s = giaTri.trim().toUpperCase();
  if (/^[123]$/.test(s)) return +s;
  if (/^[★*]{1,3}$/.test(s)) return s.length;
  return { A: 1, B: 2, C: 3 }[s] ?? null;
}

// Tag [Theme "Chiếu hết, Đòn phối hợp"] → danh sách chủ đề (tách bằng dấu phẩy hoặc chấm phẩy).
export const docChuDe = (giaTri) => giaTri.split(/[,;]/).map((t) => t.trim()).filter(Boolean);

// Kiểu in đề / bình luận: "tat-ca" (mặc định), "ngan" (chỉ đề tự viết như "Chiếu hết sau 1 nước",
// bỏ bình luận của study), "khong" (chỉ in thế cờ). Bài có inDe === false luôn không in đề.
export const KIEU_DE = ["tat-ca", "ngan", "khong"];
export function deIn(e, kieu) {
  if (e.inDe === false || kieu === "khong") return "";
  if (kieu === "ngan") return e.task_auto ? e.task : "";
  return e.task;
}

// Nếu mọi bài cùng một đề thì in một lần ở đầu phiếu.
export function deChung(exercises) {
  const cac = new Set(exercises.map((e) => e.task));
  return cac.size === 1 ? [...cac][0] : null;
}
