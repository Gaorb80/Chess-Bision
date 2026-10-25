"""Tùy chọn in phiếu. Mặc định chọn để giáo viên không phải chỉnh gì cũng in được.

Có thể ghi đè bằng file chessbision.toml (bảng [phieu]) rồi bằng tham số dòng lệnh.
"""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, fields, replace
from pathlib import Path

# bố cục: (số cột, số hàng, có tọa độ, số dòng trả lời nhiều nhất dưới mỗi sơ đồ)
BO_CUC = {
    "2x2": (2, 2, True, 4),
    "2x3": (2, 3, True, 2),
    "3x3": (3, 3, True, 1),
    "3x4": (3, 4, False, 1),
}
LE_GAY = ("trai", "guong", "khong")
DE_BAI = ("tat-ca", "ngan", "khong")
KY_HIEU = ("vi", "quoc-te")
DAP_AN = ("rieng", "cung", "khong")
HUONG = ("ben-di", "trang")


@dataclass(frozen=True)
class CauHinh:
    tieu_de: str = ""          # trống: lấy tên study
    cap_do: str = ""           # A / B / C … in cạnh tiêu đề
    bien_soan: str = ""        # chân trang "Biên soạn: …"
    ky_hieu: str = "quoc-te"   # quoc-te: Ra8#  |  vi: Xa8#
    bo_cuc: str = "2x3"        # 2x3: 6 thế có tọa độ | 3x4: 12 thế không tọa độ
    dap_an: str = "cung"       # cung: trang cuối phieu.pdf | rieng: dap-an.pdf | khong
    diem: bool = False         # in ô điểm trên phiếu học sinh
    huong: str = "ben-di"      # ben-di: bên phải đi ở dưới | trang: luôn Trắng dưới
    bo_trung: bool = True      # bỏ bài trùng thế cờ
    de_bai: str = "tat-ca"     # tat-ca: đề + bình luận | ngan: chỉ đề tự viết | khong: chỉ in thế cờ
    le_gay: str = "trai"       # trai: chừa 25 mm bên trái (ghim góc) | guong: in hai mặt | khong: 18 mm hai bên
    bai_chua_dap_an: bool = False  # in cả bài chưa có nước đáp án (mặc định bỏ, vì không chấm được)

    def kiem(self) -> "CauHinh":
        for ten, gia_tri, cho_phep in (
            ("bo_cuc", self.bo_cuc, tuple(BO_CUC)),
            ("ky_hieu", self.ky_hieu, KY_HIEU),
            ("dap_an", self.dap_an, DAP_AN),
            ("huong", self.huong, HUONG),
            ("le_gay", self.le_gay, LE_GAY),
            ("de_bai", self.de_bai, DE_BAI),
        ):
            if gia_tri not in cho_phep:
                raise ValueError(f"{ten} = {gia_tri!r} không hợp lệ, chọn một trong: {', '.join(cho_phep)}")
        return self


def doc(tep: Path | None, **ghi_de) -> CauHinh:
    """Mặc định ← chessbision.toml (nếu có) ← tham số (bỏ qua giá trị None)."""
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
