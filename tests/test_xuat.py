from pathlib import Path

from pypdf import PdfReader

from phieu_co import cau_hinh
from phieu_co.mo_hinh import Worksheet
from phieu_co.tach_bai import tach
from phieu_co.xuat import pdf, so_do

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
    ch = cau_hinh.doc(None, bien_soan="CLB Dream Chess", cap_do="A")
    ra = pdf.xuat(ws, ch, tmp_path)
    assert [f.name for f in ra] == ["phieu.pdf", "dap-an.pdf"]
    phieu, dap_an = _text(ra[0]), _text(ra[1])
    assert len(PdfReader(ra[0]).pages) == 2          # 7 bài, 6 bài/trang
    assert "Cấp độ A" in phieu and "Biên soạn: CLB Dream Chess" in phieu
    assert "Xa8#" not in phieu                        # phiếu học sinh không lộ đáp án
    assert "1. Xa8#" in dap_an and "1... Xa1#" in dap_an and "Tổng" in dap_an


def test_dap_an_cung_file_va_quoc_te(tmp_path):
    ws = tach((MAU / "chieu-het-2-nuoc.pgn").read_text(encoding="utf-8"))
    ch = cau_hinh.doc(None, dap_an="cung", ky_hieu="quoc-te", bo_cuc="3x4")
    ra = pdf.xuat(ws, ch, tmp_path)
    assert [f.name for f in ra] == ["phieu.pdf"]
    assert "1. Qg8+ Rxg8 2. Nf7#" in _text(ra[0])


def test_json_doi_chieu(tmp_path):
    ws = tach((MAU / "chieu-het-1-nuoc.pgn").read_text(encoding="utf-8"))
    assert Worksheet.from_json(ws.to_json()) == ws
