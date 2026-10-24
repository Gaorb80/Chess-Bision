from pathlib import Path

from phieu_co.tach_bai import de_chung, tach

MAU = Path(__file__).parent.parent / "mau"


def _ws(ten, **kw):
    return tach((MAU / ten).read_text(encoding="utf-8"), **kw)


def test_tach_mau_chieu_het_1_nuoc():
    ws = _ws("chieu-het-1-nuoc.pgn")
    assert ws.title == "Chiếu hết 1 nước"
    assert [e.solution for e in ws.exercises] == [["Ra8#"], ["Ra1#"], ["Qg7#"], ["Nf7#"], ["Nf2#"], ["Rh8#"], ["c8=Q#"]]
    assert [e.side_to_move for e in ws.exercises][:2] == ["white", "black"]
    assert de_chung(ws) == "Chiếu hết sau 1 nước"
    ma = {(n.code, n.chapter) for n in ws.notices}
    assert ("duplicate", "Trùng bài 1") in ma
    assert ("full-game", "Ván mẫu Italia") in ma


def test_nhieu_dap_an_va_nuoc_sai():
    ws = _ws("chieu-het-1-nuoc.pgn")
    bai = {e.title: e for e in ws.exercises}
    assert bai["Hậu và Vua"].alt_solutions == ["Qa8#"]
    assert bai["Phong cấp"].alt_solutions == ["c8=R#"]
    assert bai["Xe và Vua"].wrong_tries == ["Ra1+"]


def test_giu_bai_trung_khi_tat():
    assert len(_ws("chieu-het-1-nuoc.pgn", bo_trung=False).exercises) == 8


def test_de_tu_binh_luan_va_diem():
    e = _ws("chieu-het-2-nuoc.pgn").exercises[0]
    assert e.task.startswith("Trắng đi. Hy sinh Hậu")
    assert not e.task_auto
    assert e.solution == ["Qg8+", "Rxg8", "Nf7#"]
    assert e.points == 20


def test_nuoc_sai_luat_bi_bo():
    pgn = '[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\n[SetUp "1"]\n\n1. Qd8# *\n'
    ws = tach(pgn)
    assert not ws.exercises
    assert ws.notices[0].code == "illegal"
