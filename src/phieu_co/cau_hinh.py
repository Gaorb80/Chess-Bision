"""Tùy chọn in phiếu. Mặc định chọn để giáo viên không phải chỉnh gì cũng in được.

Có thể ghi đè bằng file phieu-co.toml (bảng [phieu]) rồi bằng tham số dòng lệnh.
"""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, fields, replace
from pathlib import Path

# bố cục: (số cột, số hàng, có tọa độ)
BO_CUC = {
    "2x2": (2, 2, True),
    "2x3": (2, 3, True),
    "3x3": (3, 3, True),
    "3x4": (3, 4, False),
}
KY_HIEU = ("vi", "quoc-te")
DAP_AN = ("rieng", "cung", "khong")
HUONG = ("ben-di", "trang")


@dataclass(frozen=True)
class CauHinh:
    tieu_de: str = ""          # trống: lấy tên study
    cap_do: str = ""           # A / B / C … in cạnh tiêu đề
    bien_soan: str = ""        # chân trang "Biên soạn: …"
    ky_hieu: str = "vi"        # vi: Xa8#  |  quoc-te: Ra8#
    bo_cuc: str = "2x3"
    dap_an: str = "rieng"      # rieng: dap-an.pdf | cung: trang cuối phieu.pdf | khong
    diem: bool = False         # in ô điểm trên phiếu học sinh
    huong: str = "ben-di"      # ben-di: bên phải đi ở dưới | trang: luôn Trắng dưới
    bo_trung: bool = True      # bỏ bài trùng thế cờ

    def kiem(self) -> "CauHinh":
        for ten, gia_tri, cho_phep in (
            ("bo_cuc", self.bo_cuc, tuple(BO_CUC)),
            ("ky_hieu", self.ky_hieu, KY_HIEU),
            ("dap_an", self.dap_an, DAP_AN),
            ("huong", self.huong, HUONG),
        ):
            if gia_tri not in cho_phep:
                raise ValueError(f"{ten} = {gia_tri!r} không hợp lệ, chọn một trong: {', '.join(cho_phep)}")
        return self


def doc(tep: Path | None, **ghi_de) -> CauHinh:
    """Mặc định ← phieu-co.toml (nếu có) ← tham số (bỏ qua giá trị None)."""
    ch = CauHinh()
    if tep and tep.exists():
        bang = tomllib.loads(tep.read_text(encoding="utf-8")).get("phieu", {})
        ten_hop_le = {f.name for f in fields(CauHinh)}
        la = set(bang) - ten_hop_le
        if la:
            raise ValueError(f"{tep}: khoá không biết: {', '.join(sorted(la))}")
        ch = replace(ch, **bang)
    ch = replace(ch, **{k: v for k, v in ghi_de.items() if v is not None})
    return ch.kiem()
