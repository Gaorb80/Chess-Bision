"""Phép thử chung với bản web: xem tests/chung/cap_nhat.py."""
import json
import sys
from pathlib import Path

import pytest

GOC = Path(__file__).parent
sys.path.insert(0, str(GOC / "chung"))
from cap_nhat import ket_qua  # noqa: E402

MAU = sorted((GOC.parent / "mau").glob("*.pgn"))


@pytest.mark.parametrize("pgn", MAU, ids=[p.stem for p in MAU])
def test_khop_ket_qua_chung(pgn):
    mong = json.loads((GOC / "chung" / (pgn.stem + ".json")).read_text(encoding="utf-8"))
    assert ket_qua(pgn.read_text(encoding="utf-8")) == mong
