from pathlib import Path

from chessbision.tach_bai import de_chung, tach

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


def test_binh_luan_nhieu_lenh_khong_treo():
    import time
    the = '[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\n\n'
    dau = time.monotonic()
    ws = tach(the + "{ Đề " + "[%" * 200_000 + "} 1. Ra8# *")
    assert time.monotonic() - dau < 2
    assert len(ws.exercises) == 1


def test_json_doc_tay_bi_kiem_kieu():
    import json

    import pytest

    from chessbision.mo_hinh import Worksheet

    ws = tach('[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\n\n1. Ra8# *')
    assert Worksheet.from_json(ws.to_json()) == ws
    d = json.loads(ws.to_json())
    for truong, gia_tri in [("id", '1] #read("/etc/passwd") ['), ("points", "10]#x["), ("id", True),
                            ("fen", "khong-phai-fen"), ("side_to_move", "red"), ("solution", [1])]:
        hong = json.loads(json.dumps(d))
        hong["exercises"][0][truong] = gia_tri
        with pytest.raises(SystemExit):
            Worksheet.from_json(json.dumps(hong))


def test_cap_do_va_chu_de():
    from chessbision.tach_bai import doc_cap_do, doc_chu_de

    assert [doc_cap_do(s) for s in ("1", "3", "★★", "*", "b", "C", "", "4", "dễ", "★★★★")] == [1, 3, 2, 1, 2, 3, None, None, None, None]
    assert doc_chu_de("Chiếu hết, Hàng cuối ; Hy sinh") == ["Chiếu hết", "Hàng cuối", "Hy sinh"]
    bai = _ws("cap-do-chu-de.pgn").exercises
    assert [e.level for e in bai] == [1, 3, 2, None]
    assert bai[0].themes == ["Chiếu hết", "Hàng cuối"]


def test_json_cap_do_sai_bi_tu_choi():
    import json

    import pytest

    from chessbision.mo_hinh import Worksheet

    ws = _ws("cap-do-chu-de.pgn")
    assert Worksheet.from_json(ws.to_json()).exercises[1].level == 3
    d = json.loads(ws.to_json())
    for xau in (5, "2", True):
        d["exercises"][0]["level"] = xau
        with pytest.raises(SystemExit):
            Worksheet.from_json(json.dumps(d))


def test_ghep_chuong_dap_an_rieng_vao_bai_tap():
    """Study tách "Bài tập" (chỉ thế cờ) và "Đáp án" (cùng thế, có nước đi): ghép thành một bài có đáp án."""
    from pathlib import Path
    ws = tach((Path(__file__).parent.parent / "mau" / "de-dai-dap-an-rieng.pgn").read_text(encoding="utf-8"))
    bai = {e.title: e for e in ws.exercises}
    assert "👑 Đáp án" not in bai
    assert bai["👑 Bài tập"].solution == ["Qxf7#"] and bai["👑 Bài tập"].wrong_tries == ["Bxf7+"]
    assert bai["🧠 Bài tập cuối"].solution == []
    assert [(n.code, n.chapter) for n in ws.notices] == [("merged-answer", "👑 Đáp án"), ("no-moves", "🧠 Bài tập cuối")]
