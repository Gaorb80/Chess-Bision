"""Dòng lệnh.

  chessbision in <link Lichess | file.pgn> [-o thư-mục] [tùy chọn]
  chessbision in <…> --luu-json bai.json      # lưu bài đã tách để sửa tay
  chessbision in bai.json                      # in lại từ JSON đã sửa

Study riêng tư: đặt biến môi trường LICHESS_TOKEN (quyền study:read).
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from . import cau_hinh, nguon, tach_bai
from .mo_hinh import Worksheet
from .xuat import pdf


def _bat_tat(s: str) -> bool:
    if s.lower() in ("co", "có", "yes", "true", "1", "bat", "bật"):
        return True
    if s.lower() in ("khong", "không", "no", "false", "0", "tat", "tắt"):
        return False
    raise argparse.ArgumentTypeError("dùng co / khong")


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="chessbision", description="In phiếu bài tập cờ vua từ study Lichess hoặc file PGN.")
    sub = ap.add_subparsers(dest="lenh", required=True)
    p = sub.add_parser("in", help="tạo phieu.pdf (+ dap-an.pdf)")
    p.add_argument("dau_vao", help="link study / chương Lichess, file .pgn, hoặc file .json đã lưu")
    p.add_argument("-o", "--ra", default="phieu", help="thư mục ghi PDF (mặc định: ./phieu)")
    p.add_argument("--cau-hinh", default="chessbision.toml", help="file cấu hình (mặc định: chessbision.toml nếu có)")
    p.add_argument("--tieu-de")
    p.add_argument("--cap-do")
    p.add_argument("--bien-soan")
    p.add_argument("--ky-hieu", choices=cau_hinh.KY_HIEU)
    p.add_argument("--bo-cuc", choices=tuple(cau_hinh.BO_CUC))
    p.add_argument("--dap-an", choices=cau_hinh.DAP_AN)
    p.add_argument("--diem", type=_bat_tat, help="in ô điểm trên phiếu: co / khong")
    p.add_argument("--huong", choices=cau_hinh.HUONG)
    p.add_argument("--bo-trung", type=_bat_tat, help="bỏ bài trùng thế cờ: co / khong")
    p.add_argument("--de-bai", choices=cau_hinh.DE_BAI, help="tat-ca: đề + bình luận | ngan: chỉ đề tự viết | khong: chỉ in thế cờ")
    p.add_argument("--le-gay", choices=cau_hinh.LE_GAY, help="lề ghim/gáy 25 mm: trai (in một mặt) / guong (in hai mặt) / khong")
    p.add_argument("--bai-chua-dap-an", type=_bat_tat, help="in cả bài chưa có nước đáp án: co / khong (mặc định khong)")
    p.add_argument("--luu-json", help="lưu bài đã tách ra file JSON")
    a = ap.parse_args(argv)

    try:
        ch = cau_hinh.doc(Path(a.cau_hinh), tieu_de=a.tieu_de, cap_do=a.cap_do, bien_soan=a.bien_soan,
                          ky_hieu=a.ky_hieu, bo_cuc=a.bo_cuc, dap_an=a.dap_an, diem=a.diem,
                          huong=a.huong, bo_trung=a.bo_trung, le_gay=a.le_gay, de_bai=a.de_bai, bai_chua_dap_an=a.bai_chua_dap_an)
    except (ValueError, TypeError) as e:
        raise SystemExit(f"Cấu hình sai: {e}")

    if a.dau_vao.lower().endswith(".json"):
        ws = Worksheet.from_json(Path(a.dau_vao).read_text(encoding="utf-8"))
    else:
        pgn, mo_ta = nguon.lay_pgn(a.dau_vao, token=os.environ.get("LICHESS_TOKEN"))
        ws = tach_bai.tach(pgn, bo_trung=ch.bo_trung, nguon=mo_ta)

    print(f"Tách được {len(ws.exercises)} bài" + (f" từ “{ws.title}”" if ws.title else "") + ".")
    for n in ws.notices:
        print(f"  ! {n.chapter}: {n.message}")
    if a.luu_json:
        Path(a.luu_json).parent.mkdir(parents=True, exist_ok=True)
        Path(a.luu_json).write_text(ws.to_json(), encoding="utf-8")
        print(f"Đã lưu {a.luu_json}")
    thieu = [e for e in ws.exercises if not e.solution]
    if thieu and not ch.bai_chua_dap_an:
        print(f"  ! Bỏ {len(thieu)} bài chưa có nước đáp án ({', '.join(e.title for e in thieu)}); "
              "dùng --bai-chua-dap-an co để vẫn in.")
        ws.exercises = [e for e in ws.exercises if e.solution]
        for i, e in enumerate(ws.exercises, 1):
            e.id = i
    for f in pdf.xuat(ws, ch, Path(a.ra)):
        print(f"Đã ghi {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
