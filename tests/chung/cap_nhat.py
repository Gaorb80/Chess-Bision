"""Ghi lại kết quả mong đợi cho phép thử chung (chạy khi cố ý đổi luật tách bài).

Mỗi PGN trong mau/ có một file tests/chung/<tên>.json. Cả pytest
(tests/test_chung.py) lẫn node (tests/web/chung.test.mjs) phải tách ra đúng
nội dung này, nên bản Python và bản web không lệch nhau được.

    .venv/bin/python tests/chung/cap_nhat.py
"""
import json
from dataclasses import asdict
from pathlib import Path

from chessbision.tach_bai import tach

GOC = Path(__file__).resolve().parent


def ket_qua(pgn: str) -> dict:
    ws = tach(pgn)
    return {
        "title": ws.title,
        "exercises": [asdict(e) for e in ws.exercises],
        # lời báo có thể diễn đạt khác nhau giữa hai bản: chỉ so mã và tên chương
        "notices": [[n.code, n.chapter] for n in ws.notices],
    }


if __name__ == "__main__":
    for pgn in sorted((GOC.parent.parent / "mau").glob("*.pgn")):
        ra = GOC / (pgn.stem + ".json")
        ra.write_text(json.dumps(ket_qua(pgn.read_text(encoding="utf-8")), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(ra.relative_to(GOC.parent.parent))
