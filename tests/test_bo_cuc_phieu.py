"""Bố cục CLI theo báo cáo kiểm thử study dài: không cắt đề, đầu trang ở mọi trang,
lề ghim/gáy, bảng đáp án gọn, bài chưa có đáp án không in mặc định."""
from pathlib import Path

import pytest
from pypdf import PdfReader

from chessbision import cau_hinh, cli
from chessbision.tach_bai import tach
from chessbision.xuat import pdf

MAU = Path(__file__).parent.parent / "mau"
pdfplumber = pytest.importorskip("pdfplumber")


def _ws(nhan=1):
    ws = tach((MAU / "de-dai-dap-an-rieng.pgn").read_text(encoding="utf-8"))
    ws.exercises = [e for e in ws.exercises if e.solution] * nhan
    for i, e in enumerate(ws.exercises, 1):
        e.id = i
    return ws


def _gop(text):
    return " ".join(text.split())


@pytest.mark.parametrize("bo_cuc", list(cau_hinh.BO_CUC))
def test_de_dai_in_du_va_dau_trang_moi_trang(tmp_path, bo_cuc):
    ws = _ws(3)
    ra = pdf.xuat(ws, cau_hinh.doc(None, bo_cuc=bo_cuc), tmp_path)
    trang = [p.extract_text() for p in PdfReader(ra[0]).pages]
    bai = [t for t in trang if "Họ tên" in t]
    dap_an = [t for t in trang if t.startswith("Đáp án")]
    assert len(bai) + len(dap_an) == len(trang)       # trang nào cũng có đầu trang
    chu = _gop(" ".join(bai))
    for e in ws.exercises:
        assert _gop(pdf.nhan_in(e.task))[-40:] in chu   # đề in đủ tới chữ cuối
    assert "🧠" not in chu and "Phòng thủ chủ động" in chu


def _le(trang):
    mm = 25.4 / 72
    # bỏ ký tự trắng: Typst để dấu cách cuối dòng ngắt chữ nhô ra ngoài, không in ra mực
    net = [c for c in trang.chars if c["text"].strip()] + trang.lines + trang.rects + trang.curves + trang.images
    return {"trai": min(o["x0"] for o in net) * mm, "phai": (trang.width - max(o["x1"] for o in net)) * mm,
            "tren": min(o["top"] for o in net) * mm}


@pytest.mark.parametrize("le_gay", cau_hinh.LE_GAY)
def test_le_gay(tmp_path, le_gay):
    ra = pdf.xuat(_ws(3), cau_hinh.doc(None, le_gay=le_gay), tmp_path)
    with pdfplumber.open(ra[0]) as f:
        assert len(f.pages) >= 3
        for so, trang in enumerate(f.pages, 1):
            le = _le(trang)
            for v in le.values():
                assert v >= pdf.VUNG_AN_TOAN
            phia = None if le_gay == "khong" else "phai" if le_gay == "guong" and so % 2 == 0 else "trai"
            if phia:
                assert le[phia] >= pdf.LE_GAY - 0.3, f"trang {so}: lề gáy {phia} = {le[phia]:.1f} mm"


def test_dap_an_gon(tmp_path):
    """Đáp án của bài dài không bị ép thành cột hẹp: 4 bài chỉ chiếm một trang."""
    ws = _ws()
    ra = pdf.xuat(ws, cau_hinh.doc(None, dap_an="rieng"), tmp_path)
    trang = PdfReader(ra[1]).pages
    assert len(trang) == 1
    text = trang[0].extract_text()
    assert "1. Nf3 Nc6 2. Bb5 a6" in _gop(text) and "Nước sai hay gặp: Bxf7+" in text


def test_cli_bo_bai_chua_dap_an(tmp_path, capsys):
    cli.main(["in", str(MAU / "de-dai-dap-an-rieng.pgn"), "-o", str(tmp_path), "--cau-hinh", str(tmp_path / "khong.toml")])
    assert "Bỏ 1 bài chưa có nước đáp án" in capsys.readouterr().out
    assert "chưa có đáp án" not in _gop(PdfReader(tmp_path / "phieu.pdf").pages[-1].extract_text())
    cli.main(["in", str(MAU / "de-dai-dap-an-rieng.pgn"), "-o", str(tmp_path / "du"), "--cau-hinh", str(tmp_path / "khong.toml"),
              "--bai-chua-dap-an", "co"])
    assert "(chưa có đáp án)" in PdfReader(tmp_path / "du" / "phieu.pdf").pages[-1].extract_text()
