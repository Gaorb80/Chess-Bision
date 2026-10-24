"""Nguồn PGN: link Lichess hoặc file .pgn trên máy."""
from __future__ import annotations

from pathlib import Path

from . import lichess


def lay_pgn(dau_vao: str, *, token: str | None = None) -> tuple[str, dict]:
    """Trả (PGN, mô tả nguồn). Đường dẫn file có thật thì đọc file, không thì coi là link Lichess."""
    p = Path(dau_vao)
    if p.suffix.lower() == ".pgn" or p.exists():
        if not p.exists():
            raise SystemExit(f"Không thấy file {p}")
        return p.read_text(encoding="utf-8-sig"), {"type": "pgn-file", "path": str(p)}
    study, chuong = lichess.doc_link(dau_vao)
    pgn = lichess.tai_pgn(study, chuong, token=token)
    url = f"https://lichess.org/study/{study}" + (f"/{chuong}" if chuong else "")
    return pgn, {"type": "lichess-study", "url": url}
