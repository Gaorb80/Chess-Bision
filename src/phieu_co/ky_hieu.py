"""Viết nước đi cho học sinh: ký hiệu Việt và đánh số lại từ 1."""
from __future__ import annotations

import re

# Vua, Hậu, Xe, Tượng, Mã; tốt không có chữ
VI = {"K": "V", "Q": "H", "R": "X", "B": "T", "N": "M"}
_QUAN = re.compile(r"^[KQRBN]|(?<==)[QRBN]")


def san(nuoc: str, ky_hieu: str = "vi") -> str:
    """'Ra8#' → 'Xa8#'; 'exd8=Q+' → 'exd8=H+'. Cột b của tốt (bxc3) giữ nguyên."""
    if ky_hieu == "quoc-te":
        return nuoc
    return _QUAN.sub(lambda m: VI[m.group(0)], nuoc)


def dong_nuoc(nuoc: list[str], ben_di: str, ky_hieu: str = "vi") -> str:
    """['Qh2+', 'Kf1', 'Qf2#'], Đen đi trước → '1... Hh2+ 2. Vf1 Hf2#'. Luôn bắt đầu từ nước 1."""
    phan = []
    trang = ben_di == "white"
    so = 1
    for i, n in enumerate(nuoc):
        if trang:
            phan.append(f"{so}.")
        elif i == 0:
            phan.append(f"{so}...")
        phan.append(san(n, ky_hieu))
        if not trang:
            so += 1
        trang = not trang
    return " ".join(phan)
