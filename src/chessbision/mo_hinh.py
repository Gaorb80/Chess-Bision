"""Mô hình dữ liệu chung: mọi nguồn đổ về đây, mọi kiểu xuất chỉ đọc từ đây.

Nước đi lưu bằng SAN quốc tế (Ra8#); đổi sang ký hiệu Việt chỉ làm lúc xuất.
Worksheet sau này là một khối ExerciseSet trong Lesson / Book.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field


@dataclass
class Exercise:
    id: int
    fen: str
    side_to_move: str            # "white" | "black"
    task: str                    # đề bài, ví dụ "Chiếu hết sau 1 nước"
    task_auto: bool              # True: đề do công cụ tự viết từ kết quả python-chess
    solution: list[str]          # nhánh chính, SAN quốc tế
    alt_solutions: list[str] = field(default_factory=list)  # nước đầu khác cũng đúng (chiếu hết 1 nước)
    wrong_tries: list[str] = field(default_factory=list)     # nước đầu của các biến phụ
    points: int = 10
    title: str = ""              # tên chương
    source_url: str = ""
    level: int | None = None     # 1–3 (★ đến ★★★), từ tag [Level]; None: chưa ghi
    themes: list[str] = field(default_factory=list)  # chủ đề, từ tag [Theme]


@dataclass
class Notice:
    code: str        # full-game, no-moves, illegal, duplicate, multi-solution, empty-chapter
    chapter: str
    message: str


@dataclass
class Worksheet:
    title: str
    exercises: list[Exercise]
    notices: list[Notice] = field(default_factory=list)
    source: dict = field(default_factory=dict)
    kind: str = "worksheet"

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)

    @classmethod
    def from_json(cls, text: str) -> "Worksheet":
        """Đọc JSON (có thể đã sửa tay hoặc do người khác gửi): kiểm kiểu từng trường
        trước khi giá trị nào được đưa vào mã Typst hay tên file."""
        d = json.loads(text)
        try:
            _kiem(d, dict, "gốc")
            ws = cls(
                title=_kiem(d.get("title", ""), str, "title"),
                exercises=[_doc_bai(e, i) for i, e in enumerate(_kiem(d["exercises"], list, "exercises"))],
                notices=[Notice(**_kiem(n, dict, "notices")) for n in _kiem(d.get("notices", []), list, "notices")],
                source=_kiem(d.get("source", {}), dict, "source"),
                kind=_kiem(d.get("kind", "worksheet"), str, "kind"),
            )
            for n in ws.notices:
                for k in ("code", "chapter", "message"):
                    _kiem(getattr(n, k), str, f"notices.{k}")
        except (KeyError, TypeError) as e:
            raise SystemExit(f"File JSON không đúng dạng phiếu bài tập: {e}")
        return ws


def _kiem(v, kieu, ten: str):
    # bool là con của int trong Python: không nhận True/False làm số
    if not isinstance(v, kieu) or (kieu is int and isinstance(v, bool)):
        raise TypeError(f"trường {ten} phải là {kieu.__name__}, nhận được {v!r:.60}")
    return v


def _doc_bai(e, i: int) -> Exercise:
    import chess

    _kiem(e, dict, f"exercises[{i}]")
    bai = Exercise(**e)
    for k in ("id", "points"):
        _kiem(getattr(bai, k), int, f"exercises[{i}].{k}")
    for k in ("fen", "side_to_move", "task", "title", "source_url"):
        _kiem(getattr(bai, k), str, f"exercises[{i}].{k}")
    _kiem(bai.task_auto, bool, f"exercises[{i}].task_auto")
    for k in ("solution", "alt_solutions", "wrong_tries"):
        for n in _kiem(getattr(bai, k), list, f"exercises[{i}].{k}"):
            _kiem(n, str, f"exercises[{i}].{k}")
    for n in _kiem(bai.themes, list, f"exercises[{i}].themes"):
        _kiem(n, str, f"exercises[{i}].themes")
    if bai.level is not None and (_kiem(bai.level, int, f"exercises[{i}].level") not in (1, 2, 3)):
        raise TypeError(f"exercises[{i}].level phải là 1, 2, 3 hoặc null")
    if bai.side_to_move not in ("white", "black"):
        raise TypeError(f"exercises[{i}].side_to_move phải là white hoặc black")
    try:
        chess.Board(bai.fen)
    except ValueError as loi:
        raise TypeError(f"exercises[{i}].fen sai: {loi}") from None
    return bai
