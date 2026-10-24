"""Worksheet → PDF bằng Typst (gói `typst` trên PyPI có sẵn trình biên dịch, không cần mạng).

Sơ đồ là SVG do so_do.py vẽ; Typst chỉ ghép trang. Phông Be Vietnam Pro (OFL) đi kèm.
"""
from __future__ import annotations

import tempfile
from importlib import resources
from pathlib import Path

import typst

from ..cau_hinh import BO_CUC, CauHinh
from ..ky_hieu import dong_nuoc, san
from ..mo_hinh import Worksheet
from ..tach_bai import de_chung, ten_ben
from . import so_do

# khổ A4, lề (mm)
RONG, CAO = 210, 297
LE_NGANG, LE_TREN, LE_DUOI = 15, 13, 16
DAU_TRANG = 30     # chỗ cho tiêu đề + họ tên
KHE_COT, KHE_HANG = 12, 6


def _s(text: str) -> str:
    """Chuỗi Python → chuỗi Typst (chế độ code)."""
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _co_ban_co(cot: int, hang: int, them: float) -> float:
    """Cạnh sơ đồ (mm) vừa cả chiều ngang lẫn chiều dọc của trang."""
    rong = (RONG - 2 * LE_NGANG - KHE_COT * (cot - 1)) / cot
    cao = (CAO - LE_TREN - LE_DUOI - DAU_TRANG - 8 - KHE_HANG * (hang - 1)) / hang - them
    return round(min(rong, cao), 1)


def _dau_trang(ws: Worksheet, ch: CauHinh, tieu_de: str, ho_ten: bool) -> str:
    ten = tieu_de + (f" · Cấp độ {ch.cap_do}" if ch.cap_do else "")
    de = de_chung(ws)
    trai = f"text(size: 15pt, weight: 600, {_s(ten)})"
    if de and ho_ten:
        trai += f" + linebreak() + text(size: 10.5pt, {_s(de)})"
    phai = 'align(right, text(size: 9pt)[Họ tên: #box(width: 45mm, repeat[.]) \\ Lớp: #box(width: 15mm, repeat[.]) Ngày: #box(width: 20mm, repeat[.])])' if ho_ten else "[]"
    return (f"#grid(columns: (1fr, auto), align: bottom, column-gutter: 6mm, {trai}, {phai})\n"
            "#v(-2mm)#line(length: 100%, stroke: 1pt)\n#v(3mm)\n")


def _trang_phieu(ws: Worksheet, ch: CauHinh, thu_muc: Path, tieu_de: str) -> str:
    cot, hang, toa_do = BO_CUC[ch.bo_cuc]
    rieng_de = de_chung(ws) is None
    canh = _co_ban_co(cot, hang, 9 + (5 if rieng_de else 0))
    (thu_muc / "so-do").mkdir(exist_ok=True)
    moi_trang = cot * hang
    phan = []
    for dau in range(0, len(ws.exercises), moi_trang):
        if dau:
            phan.append("#pagebreak()\n")
        phan.append(_dau_trang(ws, ch, tieu_de, ho_ten=True))
        o = []
        for e in ws.exercises[dau:dau + moi_trang]:
            lat = ch.huong == "ben-di" and e.side_to_move == "black"
            (thu_muc / "so-do" / f"{e.id}.svg").write_text(so_do.ve(e.fen, lat=lat, toa_do=toa_do), encoding="utf-8")
            mau = "black" if e.side_to_move == "black" else "white"
            diem = f' + h(2mm) + text(size: 9pt)[#box(width: 8mm, repeat[.])/{e.points}]' if ch.diem else ""
            dong = (f'text(weight: 600)[{e.id}.] + h(1.5mm) + box(baseline: -0.5pt, circle(radius: 3pt, fill: {mau}, stroke: 0.8pt)) '
                    f'+ h(1.5mm) + box(width: 1fr, repeat[.]){diem}')
            de = f"text(size: 8.5pt, {_s(e.task)}), " if rieng_de else ""
            o.append(f'block(breakable: false, stack(spacing: 1.5mm, image("so-do/{e.id}.svg", width: {canh}mm), {de}{dong}))')
        phan.append(f"#grid(columns: ({', '.join([f'{canh}mm'] * cot)}), column-gutter: 1fr, row-gutter: {KHE_HANG}mm,\n  "
                    + ",\n  ".join(o) + ")\n")
    return "".join(phan)


def _trang_dap_an(ws: Worksheet, ch: CauHinh, tieu_de: str) -> str:
    hang = []
    for e in ws.exercises:
        nuoc = dong_nuoc(e.solution, e.side_to_move, ch.ky_hieu) if e.solution else "(chưa có đáp án)"
        if e.alt_solutions:
            nuoc += "  (hoặc " + ", ".join(san(n, ch.ky_hieu) for n in e.alt_solutions) + ")"
        ghi_chu = e.title
        if e.wrong_tries:
            ghi_chu += " · Nước sai hay gặp: " + ", ".join(san(n, ch.ky_hieu) for n in e.wrong_tries)
        hang.append(f'[{e.id}], [{ten_ben(e.side_to_move)}], text(weight: 600, {_s(nuoc)}), [{e.points}], text(size: 8pt, fill: luma(90), {_s(ghi_chu)})')
    return (f"#text(size: 15pt, weight: 600, {_s('Đáp án · ' + tieu_de)})\n#v(-2mm)#line(length: 100%, stroke: 1pt)\n#v(2mm)\n"
            "#table(columns: (auto, auto, 1fr, auto, auto), stroke: (x, y) => (bottom: 0.4pt + luma(170)), inset: (x: 2mm, y: 2.2mm),\n"
            "  table.header([*Bài*], [*Bên đi*], [*Đáp án*], [*Điểm*], [*Chương*]),\n  "
            + ",\n  ".join(hang) + f",\n  [], [], align(right)[*Tổng*], [*{sum(e.points for e in ws.exercises)}*], [])\n")


def _mo_dau(ch: CauHinh, nguon: str) -> str:
    chan = (f"Biên soạn: {ch.bien_soan}" if ch.bien_soan else nguon)
    return ("#set document(title: \"Phiếu bài tập cờ vua\")\n"
            f"#set page(paper: \"a4\", margin: (x: {LE_NGANG}mm, top: {LE_TREN}mm, bottom: {LE_DUOI}mm),\n"
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
            phieu += "#pagebreak()\n" + _trang_dap_an(ws, ch, tieu_de)
        _bien_dich(phieu, t, thu_muc_ra / "phieu.pdf")
        ra.append(thu_muc_ra / "phieu.pdf")
        if ch.dap_an == "rieng":
            _bien_dich(_mo_dau(ch, nguon) + _trang_dap_an(ws, ch, tieu_de), t, thu_muc_ra / "dap-an.pdf")
            ra.append(thu_muc_ra / "dap-an.pdf")
    return ra
