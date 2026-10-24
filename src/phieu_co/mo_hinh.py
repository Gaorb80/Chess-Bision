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
        d = json.loads(text)
        return cls(
            title=d["title"],
            exercises=[Exercise(**e) for e in d["exercises"]],
            notices=[Notice(**n) for n in d.get("notices", [])],
            source=d.get("source", {}),
            kind=d.get("kind", "worksheet"),
        )
