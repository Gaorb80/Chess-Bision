// FEN → sơ đồ SVG đen trắng (bản trình duyệt của src/chessbision/xuat/so_do.py) để xem trước.
// PDF vẽ lại cùng kích thước này trong pdf.js. Quân cburnett (Colin M.L. Burnett, GPLv2+).

import { Chess } from "../vendor/chess.js";

export const O = 45;          // cạnh một ô = viewBox của quân cburnett
export const LE = 16;         // lề chứa tọa độ (trái + dưới)
export const O_SANG = "#ffffff";
export const O_TOI = "#c4c4c4";
export const TEN_QUAN = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"];

// Bàn cờ theo hàng vẽ từ trên xuống: [{ x, y, toi, quan }] (đơn vị: ô 45)
export function cacO(fen, lat) {
  const ban = new Chess(fen).board();   // ban[0] là hàng 8
  const ra = [];
  for (let hang = 0; hang < 8; hang++) {
    for (let cot = 0; cot < 8; cot++) {
      const r = lat ? 7 - hang : hang;
      const c = lat ? 7 - cot : cot;
      const q = ban[r][c];
      ra.push({ hang, cot, toi: (r + c) % 2 === 1, quan: q ? q.color + q.type.toUpperCase() : null });
    }
  }
  return ra;
}

export const nhanCot = (i, lat) => "abcdefgh"[lat ? 7 - i : i];
export const nhanHang = (i, lat) => String(lat ? i + 1 : 8 - i);

// quan: { wK: "<svg …>", … } nội dung file quân
export function ve(fen, { lat = false, toaDo = true, quan }) {
  const le = toaDo ? LE : 0;
  const canh = 8 * O;
  const w = canh + le;
  const p = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" role="img">`,
    `<rect x="0" y="0" width="${w}" height="${w}" fill="#ffffff"/>`];
  for (const o of cacO(fen, lat)) {
    const x = le + o.cot * O, y = o.hang * O;
    p.push(`<rect x="${x}" y="${y}" width="${O}" height="${O}" fill="${o.toi ? O_TOI : O_SANG}"/>`);
    if (o.quan) p.push(`<g transform="translate(${x},${y})">${than(quan[o.quan])}</g>`);
  }
  p.push(`<rect x="${le}" y="0" width="${canh}" height="${canh}" fill="none" stroke="#000" stroke-width="1.6"/>`);
  if (toaDo) {
    for (let i = 0; i < 8; i++) {
      p.push(`<text x="${le + i * O + O / 2}" y="${canh + LE - 3}" font-size="12" text-anchor="middle" fill="#000">${nhanCot(i, lat)}</text>`);
      p.push(`<text x="${LE / 2}" y="${i * O + O / 2 + 4}" font-size="12" text-anchor="middle" fill="#000">${nhanHang(i, lat)}</text>`);
    }
  }
  p.push("</svg>");
  return p.join("");
}

const than = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, "");
