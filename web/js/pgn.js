// Tách văn bản PGN thành các ván: tag, bình luận đầu ván, cây nước đi (SAN thô).
// Chỉ đọc cú pháp; nước đi có hợp luật hay không là việc của chess.js (tach_bai.js).
//
// Một "dòng" là mảng nước: { san, variations: [dòng, …] }. Biến phụ gắn vào nước
// mà nó thay thế, giống python-chess: biến của nước đầu = các nước đầu khác.

const KET_QUA = new Set(["1-0", "0-1", "1/2-1/2", "*"]);
// Biến phụ lồng sâu hơn mức này thì coi là PGN lỗi (chặn tràn ngăn xếp khi kiểm cây).
export const SAU_TOI_DA = 64;

function* token(text) {
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === "\n" && text[i + 1] === "%") {          // dòng thoát kiểu PGN
      i = text.indexOf("\n", i + 1);
      if (i < 0) return;
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "{") {
      const j = text.indexOf("}", i + 1);
      const end = j < 0 ? n : j;
      yield { t: "comment", v: text.slice(i + 1, end) };
      i = end + 1;
      continue;
    }
    if (c === ";") {
      const j = text.indexOf("\n", i);
      yield { t: "comment", v: text.slice(i + 1, j < 0 ? n : j) };
      i = j < 0 ? n : j;
      continue;
    }
    if (c === "[") {
      const m = /^\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]/.exec(text.slice(i, i + 4000));
      if (m) {
        yield { t: "tag", k: m[1], v: m[2].replace(/\\(.)/g, "$1") };
        i += m[0].length;
        continue;
      }
      i++;
      continue;
    }
    if (c === "(" || c === ")") { yield { t: c }; i++; continue; }
    if (c === "$") {
      const m = /^\$\d+/.exec(text.slice(i, i + 6));
      i += m ? m[0].length : 1;
      continue;
    }
    const m = /^[^\s{}()\[\];$]+/.exec(text.slice(i, i + 200));
    if (!m) { i++; continue; }                         // "}" hay "]" lạc: bỏ qua
    const w = m[0];
    i += w.length;
    if (KET_QUA.has(w)) { yield { t: "result", v: w }; continue; }
    // bỏ số nước "12." "12..." (có thể dính liền nước: "12.Nf3")
    const bo = w.replace(/^\d+\.+/, "").replace(/^\.+/, "");
    if (!bo) continue;
    const san = bo.replace(/[!?]+$/, "");
    if (san) yield { t: "move", v: san };
  }
}

function vanMoi() {
  return { headers: {}, comment: "", moves: [], hasMoves: false };
}

export function docPgn(text) {
  const games = [];
  let g = vanMoi();
  let coNoiDung = false;
  // ngăn xếp các dòng đang ghi; đỉnh là dòng hiện tại
  let stack = [g.moves];
  const xong = () => {
    if (coNoiDung) games.push(g);
    g = vanMoi();
    stack = [g.moves];
    coNoiDung = false;
  };
  for (const tk of token(text.replace(/^﻿/, "").replace(/\r\n?/g, "\n"))) {
    if (tk.t === "tag") {
      if (g.hasMoves) xong();   // tag sau phần nước đi: ván mới (PGN thiếu kết quả)
      g.headers[tk.k] = tk.v;
      coNoiDung = true;
    } else if (tk.t === "comment") {
      const line = stack[stack.length - 1];
      if (stack.length === 1 && line.length === 0) g.comment += (g.comment ? " " : "") + tk.v;
      else if (line.length) line[line.length - 1].comment = ((line[line.length - 1].comment || "") + " " + tk.v).trim();
      coNoiDung = true;
    } else if (tk.t === "move") {
      stack[stack.length - 1].push({ san: tk.v, variations: [] });
      g.hasMoves = true;
      coNoiDung = true;
    } else if (tk.t === "(") {
      const line = stack[stack.length - 1];
      const goc = line[line.length - 1];
      if (!goc) { g.errors = g.errors || ["biến phụ đứng trước mọi nước đi"]; stack.push([]); continue; }
      if (stack.length > SAU_TOI_DA) { g.errors = g.errors || [`biến phụ lồng sâu quá ${SAU_TOI_DA} tầng`]; stack.push([]); continue; }
      const bien = [];
      goc.variations.push(bien);
      stack.push(bien);
    } else if (tk.t === ")") {
      if (stack.length > 1) stack.pop();
    } else if (tk.t === "result") {
      if (stack.length === 1) xong();
    }
  }
  xong();
  return games;
}
