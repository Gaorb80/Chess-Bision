"""PGN → bài tập. Mọi nước đi và khẳng định (chiếu hết, số đáp án) đều do python-chess tính.

Quy ước M0: mỗi chương (ván) có tag [FEN] là một bài. Thế cờ đầu là đề,
nhánh chính là đáp án, nước đầu của các biến phụ là nước sai hay gặp.
Chương là ván đầy đủ (không có [FEN]) được bỏ qua và báo lại.
"""
from __future__ import annotations

import io
import logging
import re

import chess
import chess.pgn

logging.getLogger("chess.pgn").setLevel(logging.CRITICAL)  # lỗi PGN được báo qua game.errors

from .mo_hinh import Exercise, Notice, Worksheet

_LENH = re.compile(r"\[%[^\[\]]*\]")   # [%cal …] [%csl …] [%eval …] [%clk …]
_TEN_BEN = {"white": "Trắng", "black": "Đen"}


def _ten_chuong(game: chess.pgn.Game, so: int) -> str:
    h = game.headers
    return h.get("ChapterName") or (h.get("Event", "").split(": ", 1)[-1] if h.get("Event", "?") != "?" else "") or f"Ván {so}"


def _binh_luan(text: str) -> str:
    return " ".join(_LENH.sub("", text).split())


def _khoa_the_co(board: chess.Board) -> str:
    # bỏ số nước: hai bài cùng thế cờ, cùng bên đi, cùng quyền nhập thành là trùng
    return " ".join(board.fen().split()[:4])


def _de_tu_dong(board: chess.Board, nhanh_chinh: list[chess.Move]) -> str | None:
    b = board.copy()
    for m in nhanh_chinh:
        b.push(m)
    if b.is_checkmate() and len(nhanh_chinh) % 2 == 1:
        return f"Chiếu hết sau {(len(nhanh_chinh) + 1) // 2} nước"
    return None


def _cac_nuoc_chieu_het(board: chess.Board) -> list[chess.Move]:
    ket_qua = []
    for m in board.legal_moves:
        board.push(m)
        if board.is_checkmate():
            ket_qua.append(m)
        board.pop()
    return ket_qua


def tach(pgn_text: str, *, bo_trung: bool = True, nguon: dict | None = None) -> Worksheet:
    bai: list[Exercise] = []
    bao: list[Notice] = []
    da_co: dict[str, int] = {}
    ten_study = ""
    f = io.StringIO(pgn_text)
    so = 0
    while (game := chess.pgn.read_game(f)) is not None:
        so += 1
        ten = _ten_chuong(game, so)
        ten_study = ten_study or game.headers.get("StudyName", "")
        url = game.headers.get("ChapterURL", "") or game.headers.get("Site", "").strip("?")
        if game.errors:
            # read_game không ném lỗi khi gặp nước sai: phải tự kiểm
            bao.append(Notice("illegal", ten, f"PGN có lỗi, bỏ qua: {game.errors[0]}"))
            continue
        if "FEN" not in game.headers:
            if game.variations:
                bao.append(Notice("full-game", ten, "Chương là ván đầy đủ, không có thế cờ bắt đầu ([FEN]); bỏ qua."))
            else:
                bao.append(Notice("empty-chapter", ten, "Chương trống; bỏ qua."))
            continue

        board = game.board()
        khoa = _khoa_the_co(board)
        if bo_trung and khoa in da_co:
            bao.append(Notice("duplicate", ten, f"Trùng thế cờ với bài {da_co[khoa]}; bỏ qua."))
            continue

        nhanh = list(game.mainline_moves())
        ben = "white" if board.turn == chess.WHITE else "black"
        sol = []
        b = board.copy()
        for m in nhanh:
            sol.append(b.san(m))
            b.push(m)
        sai = [board.san(v.move) for v in game.variations[1:]]

        de_tu_dong = _de_tu_dong(board, nhanh)
        de_bl = _binh_luan(game.comment)
        de = de_bl or de_tu_dong or "Tìm nước đi tốt nhất"

        khac: list[str] = []
        if de_tu_dong and len(nhanh) == 1:
            khac = [board.san(m) for m in _cac_nuoc_chieu_het(board) if m != nhanh[0]]
            if khac:
                bao.append(Notice("multi-solution", ten, f"Có {len(khac) + 1} nước chiếu hết: {', '.join([sol[0], *khac])}. Đáp án ghi đủ."))
        if not nhanh:
            bao.append(Notice("no-moves", ten, "Chương có thế cờ nhưng chưa có nước đáp án; phiếu vẫn in, đáp án để trống."))

        try:
            diem = int(game.headers.get("Points", "10"))
        except ValueError:
            diem = 10

        bai.append(Exercise(
            id=len(bai) + 1,
            fen=board.fen(),
            side_to_move=ben,
            task=de,
            task_auto=not de_bl,
            solution=sol,
            alt_solutions=khac,
            wrong_tries=sai,
            points=diem,
            title=ten,
            source_url=url,
        ))
        da_co[khoa] = len(bai)

    return Worksheet(title=ten_study, exercises=bai, notices=bao, source=nguon or {})


def de_chung(ws: Worksheet) -> str | None:
    """Nếu mọi bài cùng một đề (không kể bên đi) thì in một lần ở đầu phiếu."""
    cac_de = {e.task for e in ws.exercises}
    return cac_de.pop() if len(cac_de) == 1 else None


def ten_ben(ben: str) -> str:
    return _TEN_BEN[ben]
