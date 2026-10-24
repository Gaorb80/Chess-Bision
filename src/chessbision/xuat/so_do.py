"""FEN → sơ đồ SVG đen trắng để in, dùng bộ quân cburnett (Colin M.L. Burnett, GPLv2+).

Quân cờ lấy từ tai_nguyen/quan/ (chép từ repo co-vua-motion).
"""
from __future__ import annotations

import re
from functools import cache
from importlib import resources

import chess

O = 45            # cạnh một ô = viewBox của quân cburnett
LE = 16           # lề chứa tọa độ (trái + dưới)
O_SANG = "#ffffff"
O_TOI = "#c4c4c4"  # đủ đậm để phân biệt khi in, quân đen trên ô tối vẫn rõ


@cache
def _quan(ten: str) -> str:
    """Phần thân của file quân (bỏ thẻ <svg> ngoài) để lồng vào bàn cờ."""
    svg = resources.files("chessbision").joinpath("tai_nguyen", "quan", f"{ten}.svg").read_text(encoding="utf-8")
    return re.sub(r"^.*?<svg[^>]*>|</svg>\s*$", "", svg, flags=re.S)


def ve(fen: str, *, lat: bool = False, toa_do: bool = True) -> str:
    """lat=True: Đen ở dưới. toa_do: in a–h, 1–8 quanh bàn cờ."""
    board = chess.Board(fen)
    le = LE if toa_do else 0
    canh = 8 * O
    w = canh + le
    phan = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {w}" width="{w}" height="{w}">',
            f'<rect x="0" y="0" width="{w}" height="{w}" fill="#ffffff"/>']
    for hang in range(8):          # hàng vẽ từ trên xuống
        for cot in range(8):
            o = chess.square(7 - cot, hang) if lat else chess.square(cot, 7 - hang)
            x, y = le + cot * O, hang * O
            toi = (chess.square_file(o) + chess.square_rank(o)) % 2 == 0
            phan.append(f'<rect x="{x}" y="{y}" width="{O}" height="{O}" fill="{O_TOI if toi else O_SANG}"/>')
            q = board.piece_at(o)
            if q:
                ten = ("w" if q.color else "b") + q.symbol().upper()
                phan.append(f'<g transform="translate({x},{y})">{_quan(ten)}</g>')
    phan.append(f'<rect x="{le}" y="0" width="{canh}" height="{canh}" fill="none" stroke="#000000" stroke-width="1.6"/>')
    if toa_do:
        for i in range(8):
            cot = "abcdefgh"[7 - i if lat else i]
            hang = str(i + 1 if lat else 8 - i)
            phan.append(f'<text x="{le + i * O + O / 2}" y="{canh + LE - 3}" font-size="12" text-anchor="middle" font-family="Be Vietnam Pro" fill="#000000">{cot}</text>')
            phan.append(f'<text x="{LE / 2}" y="{i * O + O / 2 + 4}" font-size="12" text-anchor="middle" font-family="Be Vietnam Pro" fill="#000000">{hang}</text>')
    phan.append("</svg>")
    return "".join(phan)
