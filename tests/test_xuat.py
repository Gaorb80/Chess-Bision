from pathlib import Path

import pytest
from pypdf import PdfReader

from chessbision import cau_hinh
from chessbision.mo_hinh import Worksheet
from chessbision.tach_bai import tach
from chessbision.xuat import pdf, so_do

MAU = Path(__file__).parent.parent / "mau"


def test_so_do_co_du_quan():
    svg = so_do.ve("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1")
    assert svg.count("<g transform") == 9
    assert ">a<" in svg and ">8<" in svg
    assert ">a<" not in so_do.ve("8/8/8/8/8/8/8/K6k w - - 0 1", toa_do=False)


def _text(f):
    return "\n".join(p.extract_text() for p in PdfReader(f).pages)


def test_xuat_phieu_va_dap_an(tmp_path):
    ws = tach((MAU / "chieu-het-1-nuoc.pgn").read_text(encoding="utf-8"))
    ch = cau_hinh.doc(None, bien_soan="CLB Dream Chess", cap_do="A", dap_an="rieng", ky_hieu="vi")
    ra = pdf.xuat(ws, ch, tmp_path)
    assert [f.name for f in ra] == ["phieu.pdf", "dap-an.pdf"]
    phieu, dap_an = _text(ra[0]), _text(ra[1])
    assert len(PdfReader(ra[0]).pages) == 2          # 7 bài, 6 bài/trang
    assert "Cấp độ A" in phieu and "Biên soạn: CLB Dream Chess" in phieu
    assert "Xa8#" not in phieu                        # phiếu học sinh không lộ đáp án
    assert "1. Xa8#" in dap_an and "1... Xa1#" in dap_an and "Tổng" in dap_an


def test_mac_dinh_dap_an_cung_file_quoc_te(tmp_path):
    ws = tach((MAU / "chieu-het-1-nuoc.pgn").read_text(encoding="utf-8"))
    ra = pdf.xuat(ws, cau_hinh.doc(None), tmp_path)
    assert [f.name for f in ra] == ["phieu.pdf"]
    trang = [p.extract_text() for p in PdfReader(ra[0]).pages]
    assert len(trang) == 3                            # 2 trang bài + 1 trang đáp án
    assert not any("Ra8#" in t for t in trang[:2])     # trang bài không lộ đáp án
    assert "1. Ra8#" in trang[2] and "1... Ra1#" in trang[2]


def test_bo_cuc_12_the_khong_toa_do(tmp_path):
    ws = tach((MAU / "chieu-het-2-nuoc.pgn").read_text(encoding="utf-8"))
    ra = pdf.xuat(ws, cau_hinh.doc(None, bo_cuc="3x4"), tmp_path)
    assert "1. Qg8+ Rxg8 2. Nf7#" in _text(ra[0])


def test_json_doi_chieu(tmp_path):
    ws = tach((MAU / "chieu-het-1-nuoc.pgn").read_text(encoding="utf-8"))
    assert Worksheet.from_json(ws.to_json()) == ws


@pytest.mark.parametrize("bo_cuc", list(cau_hinh.BO_CUC))
def test_le_in_an_toan(tmp_path, bo_cuc):
    """#10: mọi nét, kể cả chân trang và trang đáp án, cách mép giấy ít nhất pdf.VUNG_AN_TOAN."""
    pdfplumber = pytest.importorskip("pdfplumber")
    ws = tach((MAU / "chieu-het-1-nuoc.pgn").read_text(encoding="utf-8"))
    for i, e in enumerate(ws.exercises):   # đề dài hai dòng như study thật
        e.task = f"This position comes from an online rapid game between two players rated over 2000 ({i})"
    ra = pdf.xuat(ws, cau_hinh.doc(None, bo_cuc=bo_cuc, bien_soan="CLB Dream Chess", cap_do="A"), tmp_path)
    mm = 25.4 / 72
    with pdfplumber.open(ra[0]) as f:
        for so, trang in enumerate(f.pages, 1):
            net = trang.chars + trang.lines + trang.rects + trang.curves + trang.images
            le = {
                "trái": min(o["x0"] for o in net) * mm,
                "phải": (trang.width - max(o["x1"] for o in net)) * mm,
                "trên": min(o["top"] for o in net) * mm,
                "dưới": (trang.height - max(o["bottom"] for o in net)) * mm,
            }
            for phia, v in le.items():
                assert v >= pdf.VUNG_AN_TOAN, f"trang {so}: lề {phia} chỉ còn {v:.1f} mm"
