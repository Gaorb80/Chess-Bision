"""Tải PGN của study / chương Lichess.

API: GET /api/study/{studyId}.pgn và /api/study/{studyId}/{chapterId}.pgn
(id đúng 8 ký tự). Study công khai không cần token; study riêng tư cần token
quyền study:read (biến môi trường LICHESS_TOKEN). Lichess yêu cầu gửi lần lượt
từng yêu cầu; gặp 429 thì chờ 60 s rồi thử lại.
"""
from __future__ import annotations

import re
import time
import urllib.error
import urllib.parse
import urllib.request

from .. import __version__

API = "https://lichess.org"
_ID = r"[A-Za-z0-9]{8}"
_LINK = re.compile(rf"(?:^|/)study/(?:embed/)?({_ID})(?:/({_ID}))?(?=$|[/?#\s])")


def doc_link(link: str) -> tuple[str, str | None]:
    """'https://lichess.org/study/jcblcsmR/DOeAa4aD#3' → ('jcblcsmR', 'DOeAa4aD'). Nhận cả id trần."""
    s = link.strip()
    if re.fullmatch(_ID, s):
        return s, None
    m = _LINK.search(urllib.parse.urlsplit(s if "//" in s else "//" + s).path)
    if not m:
        raise SystemExit(f"Không nhận ra link study Lichess: {link!r}. Dạng đúng: https://lichess.org/study/<8 ký tự>[/<8 ký tự>]")
    return m.group(1), m.group(2)


def tai_pgn(study: str, chuong: str | None = None, *, token: str | None = None, _lan: int = 0) -> str:
    duong = f"/api/study/{study}" + (f"/{chuong}" if chuong else "") + ".pgn"
    query = urllib.parse.urlencode({"clocks": "false", "comments": "true", "variations": "true", "orientation": "true"})
    req = urllib.request.Request(f"{API}{duong}?{query}", headers={
        "Accept": "application/x-chess-pgn",
        "User-Agent": f"chessbision/{__version__}",
    })
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 429 and _lan < 2:
            print("Lichess báo gửi quá nhanh (429), chờ 60 giây…")
            time.sleep(60)
            return tai_pgn(study, chuong, token=token, _lan=_lan + 1)
        if e.code in (401, 403):
            raise SystemExit("Lichess từ chối: study riêng tư cần token quyền study:read (đặt biến LICHESS_TOKEN).")
        if e.code == 404:
            raise SystemExit("Không tìm thấy study/chương này trên Lichess (sai link, hoặc study riêng tư mà chưa có token).")
        raise SystemExit(f"Lichess trả lỗi {e.code}.")
    except urllib.error.URLError as e:
        raise SystemExit(f"Không kết nối được lichess.org: {e.reason}")
