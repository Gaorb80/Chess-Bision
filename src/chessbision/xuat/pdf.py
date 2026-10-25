"""Worksheet → PDF bằng Typst (gói `typst` trên PyPI có sẵn trình biên dịch, không cần mạng).

Sơ đồ là SVG do so_do.py vẽ; Typst chỉ ghép trang. Phông Be Vietnam Pro (OFL) đi kèm.
"""
from __future__ import annotations

import re
import tempfile
from importlib import resources
from pathlib import Path

import typst

from ..cau_hinh import BO_CUC, CauHinh
from ..ky_hieu import dong_nuoc, san
from ..mo_hinh import Worksheet
from ..tach_bai import de_chung, ten_ben
from . import so_do

# khổ A4, lề (mm). Mọi nét, kể cả chân trang, cách mép giấy ít nhất VUNG_AN_TOAN:
# máy in thật không in được sát mép, khổ Letter còn cắt thêm ~9 mm trên/dưới (#10).
RONG, CAO = 210, 297
VUNG_AN_TOAN = 15
LE_NGANG, LE_TREN, LE_DUOI = 18, 18, 26   # LE_DUOI: hết phần thân; chân trang nằm trong lề này
# Lề gáy: chừa LE_GAY ở mép ghim / đóng gáy để tiêu đề không nằm trong góc ghim 25 × 25 mm
# (cùng quy ước với web/js/pdf.js): trai: mép trái mọi trang · guong: soi gương khi in hai mặt · khong.
LE_GAY = 25
CHAN_TRANG = 4     # khoảng từ hết phần thân tới đường kẻ chân trang
DAU_TRANG = 20     # chỗ cho tiêu đề + họ tên, nằm trong lề trên (lặp lại ở mọi trang)
DAU_DAP_AN = 14    # chỗ cho tiêu đề trang đáp án
KHE_COT, KHE_HANG = 12, 6
KHE_DONG_TRA_LOI = 6

# emoji và ký tự ghép emoji: phông in không có glyph, PDF hiện ô trống
_EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0E\uFE0F\u200D\u20E3]")


def nhan_in(text: str) -> str:
    """Chữ lấy từ PGN → chữ in được (bỏ emoji, gộp khoảng trắng)."""
    return " ".join(_EMOJI.sub("", text).split())


def so_dong_tra_loi(e, toi_da: int = 4) -> int:
    """Số dòng chấm ghi lời giải: theo độ dài đáp án; bài chưa có đáp án coi như bài phân tích."""
    n = len(e.solution)
    return min(toi_da, 4 if not n or n > 9 else 2 if n > 3 else 1)


def _rong_than(ch: CauHinh) -> float:
    return RONG - LE_NGANG - (LE_NGANG if ch.le_gay == "khong" else LE_GAY)


def _le_ngang(ch: CauHinh) -> str:
    if ch.le_gay == "guong":
        return f"inside: {LE_GAY}mm, outside: {LE_NGANG}mm"
    if ch.le_gay == "trai":
        return f"left: {LE_GAY}mm, right: {LE_NGANG}mm"
    return f"x: {LE_NGANG}mm"


def _s(text: str) -> str:
    """Chuỗi Python → chuỗi Typst (chế độ code)."""
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _co_ban_co(cot: int, hang: int, them: float, rong_than: float) -> float:
    """Cạnh sơ đồ (mm) vừa cả chiều ngang lẫn chiều dọc của trang."""
    rong = (rong_than - KHE_COT * (cot - 1)) / cot
    cao = (CAO - LE_TREN - DAU_TRANG - LE_DUOI - 6 - KHE_HANG * (hang - 1)) / hang - them
    return round(min(rong, cao), 1)


def _dau_trang(ws: Worksheet, ch: CauHinh, tieu_de: str) -> str:
    ten = nhan_in(tieu_de + (f" · Cấp độ {ch.cap_do}" if ch.cap_do else ""))
    de = de_chung(ws)
    trai = f"text(size: 15pt, weight: 600, {_s(ten)})"
    if de:
        trai += f" + linebreak() + text(size: 10.5pt, {_s(nhan_in(de))})"
    phai = 'align(right, text(size: 9pt)[Họ tên: #box(width: 45mm, repeat[.]) \\ Lớp: #box(width: 15mm, repeat[.]) Ngày: #box(width: 20mm, repeat[.])])'
    return (f"grid(columns: (1fr, auto), align: bottom, column-gutter: 6mm, {trai}, {phai})"
            " + v(-2mm) + line(length: 100%, stroke: 1pt)")


def _trang_phieu(ws: Worksheet, ch: CauHinh, thu_muc: Path, tieu_de: str) -> str:
    """Các hàng sơ đồ chảy qua trang; mỗi hàng không tách đôi, trang nào cũng có đầu trang.
    Đề in đủ: hàng có đề dài cao hơn, trang đó in ít thế hơn."""
    cot, hang, toa_do, dong_toi_da = BO_CUC[ch.bo_cuc]
    rieng_de = de_chung(ws) is None
    max_dong = max(so_dong_tra_loi(e, dong_toi_da) for e in ws.exercises)
    canh = _co_ban_co(cot, hang, 9 + (5 if rieng_de else 0) + KHE_DONG_TRA_LOI * (max_dong - 1), _rong_than(ch))
    (thu_muc / "so-do").mkdir(exist_ok=True)
    phan = [f"#set page(margin: ({_le_ngang(ch)}, top: {LE_TREN + DAU_TRANG}mm, bottom: {LE_DUOI}mm),"
            f" header-ascent: 3mm, header: {_dau_trang(ws, ch, tieu_de)})\n"]
    o = []
    for e in ws.exercises:
        lat = ch.huong == "ben-di" and e.side_to_move == "black"
        (thu_muc / "so-do" / f"{int(e.id)}.svg").write_text(so_do.ve(e.fen, lat=lat, toa_do=toa_do), encoding="utf-8")
        mau = "black" if e.side_to_move == "black" else "white"
        diem = f' + h(2mm) + text(size: 9pt)[#box(width: 8mm, repeat[.])/{int(e.points)}]' if ch.diem else ""
        dong = (f'text(weight: 600)[{int(e.id)}.] + h(1.5mm) + box(baseline: -0.5pt, circle(radius: 3pt, fill: {mau}, stroke: 0.8pt)) '
                f'+ h(1.5mm) + box(width: 1fr, repeat[.]){diem}')
        them = "".join(", pad(top: 3mm, box(width: 100%, repeat[.]))" for _ in range(so_dong_tra_loi(e, dong_toi_da) - 1))
        de = f"text(size: 8.5pt, {_s(nhan_in(e.task))}), " if rieng_de else ""
        o.append(f'stack(spacing: 1.5mm, image("so-do/{int(e.id)}.svg", width: {canh}mm), {de}{dong}{them})')
    for dau in range(0, len(o), cot):
        hang_o = o[dau:dau + cot] + ["[]"] * (cot - len(o[dau:dau + cot]))
        phan.append(f"#block(breakable: false, below: {KHE_HANG}mm, grid(columns: ({', '.join([f'{canh}mm'] * cot)}), column-gutter: 1fr,\n  "
                    + ",\n  ".join(hang_o) + "))\n")
    return "".join(phan)


def _trang_dap_an(ws: Worksheet, ch: CauHinh, tieu_de: str) -> str:
    """Bảng đáp án: cột nước đi rộng; tên chương và nước sai ở cột ghi chú hẹp, chữ 9 pt;
    mỗi bài không tách giữa hai trang, đầu bảng lặp lại ở trang sau."""
    co_diem = ch.diem or any(int(e.points) != 10 for e in ws.exercises)
    hang = []
    for e in ws.exercises:
        nuoc = dong_nuoc(e.solution, e.side_to_move, ch.ky_hieu) if e.solution else "(chưa có đáp án)"
        if e.alt_solutions:
            nuoc += "  (hoặc " + ", ".join(san(n, ch.ky_hieu) for n in e.alt_solutions) + ")"
        ghi_chu = f"text(size: 9pt, fill: luma(60), {_s(nhan_in(e.title))}"
        if e.wrong_tries:
            ghi_chu += " + linebreak() + " + _s("Nước sai hay gặp: " + ", ".join(san(n, ch.ky_hieu) for n in e.wrong_tries))
        ghi_chu += ")"
        o = [f"[{int(e.id)}]", f"[{ten_ben(e.side_to_move)}]", f"text(weight: 600, {_s(nuoc)})",
             *([f"[{int(e.points)}]"] if co_diem else []), ghi_chu]
        hang.append(", ".join(f"table.cell(breakable: false, {x})" for x in o))
    cot = "(auto, auto, 1fr, auto, 48mm)" if co_diem else "(auto, auto, 1fr, 48mm)"
    dau = "[*Bài*], [*Bên đi*], [*Đáp án*], " + ("[*Điểm*], " if co_diem else "") + "[*Chương*]"
    tong = (f",\n  [], [], align(right)[*Tổng*], [*{sum(int(e.points) for e in ws.exercises)}*], []" if co_diem else "")
    tieu = _s(nhan_in("Đáp án · " + tieu_de))
    return (f"#set page(margin: ({_le_ngang(ch)}, top: {LE_TREN + DAU_DAP_AN}mm, bottom: {LE_DUOI}mm), header-ascent: 3mm,"
            f" header: text(size: 15pt, weight: 600, {tieu}) + v(-2mm) + line(length: 100%, stroke: 1pt))\n"
            f"#table(columns: {cot}, stroke: (x, y) => (bottom: 0.4pt + luma(170)), inset: (x: 2mm, y: 2.2mm),\n"
            f"  table.header({dau}),\n  " + ",\n  ".join(hang) + tong + ")\n")


def _mo_dau(ch: CauHinh, nguon: str) -> str:
    chan = nhan_in(f"Biên soạn: {ch.bien_soan}" if ch.bien_soan else nguon)
    return ("#set document(title: \"Phiếu bài tập cờ vua\")\n"
            f"#set page(paper: \"a4\", footer-descent: {CHAN_TRANG}mm,\n"
            f"  footer: context [#set text(size: 8pt, fill: luma(80)); #line(length: 100%, stroke: 0.4pt + luma(150)) #v(-1.5mm) "
            f"#{_s(chan)} #h(1fr) Trang #counter(page).display() / #counter(page).final().first()])\n"
            "#set text(font: \"Be Vietnam Pro\", lang: \"vi\", size: 10pt)\n")


def _bien_dich(nguon_typ: str, thu_muc: Path, ra: Path) -> None:
    (thu_muc / "main.typ").write_text(nguon_typ, encoding="utf-8")
    phong = resources.files("chessbision").joinpath("tai_nguyen", "phong")
    with resources.as_file(phong) as p:
        typst.compile(str(thu_muc / "main.typ"), output=str(ra), root=str(thu_muc),
                      font_paths=[str(p)], ignore_system_fonts=True)


def xuat(ws: Worksheet, ch: CauHinh, thu_muc_ra: Path) -> list[Path]:
    """Ghi phieu.pdf (và dap-an.pdf nếu dap_an='rieng'). Trả danh sách file đã ghi."""
    if not ws.exercises:
        raise SystemExit("Không có bài nào để in (xem các thông báo ở trên).")
    thu_muc_ra.mkdir(parents=True, exist_ok=True)
    tieu_de = ch.tieu_de or ws.title or "Phiếu bài tập"
    nguon = ws.source.get("url") or Path(ws.source.get("path", "")).name
    ra = []
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        phieu = _mo_dau(ch, nguon) + _trang_phieu(ws, ch, t, tieu_de)
        if ch.dap_an == "cung":
            phieu += _trang_dap_an(ws, ch, tieu_de)
        _bien_dich(phieu, t, thu_muc_ra / "phieu.pdf")
        ra.append(thu_muc_ra / "phieu.pdf")
        if ch.dap_an == "rieng":
            _bien_dich(_mo_dau(ch, nguon) + _trang_dap_an(ws, ch, tieu_de), t, thu_muc_ra / "dap-an.pdf")
            ra.append(thu_muc_ra / "dap-an.pdf")
    return ra
