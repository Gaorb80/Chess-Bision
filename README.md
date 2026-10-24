# phieu-co

In phiếu bài tập cờ vua từ **link study Lichess** hoặc **file PGN**: một lệnh, ra `phieu.pdf` cho học sinh và `dap-an.pdf` cho giáo viên.

```bash
phieu-co in https://lichess.org/study/TqmJP6yk
phieu-co in mau/chieu-het-1-nuoc.pgn --cap-do A --bien-soan "CLB Dream Chess"
```

Đây là bản M0 trong [bản thiết kế kiến trúc](https://claude.ai/artifact/1fN3UKBiGdTSBCpR2kPPvt).

## Cài đặt

Cần Python 3.11 trở lên.

```bash
python -m venv .venv
.venv/bin/pip install -e .          # Windows: .venv\Scripts\pip install -e .
```

Không cần cài LaTeX hay Typst riêng: gói `typst` trên PyPI có sẵn trình biên dịch.

## Phiếu được làm thế nào

1. **Nguồn** (`nguon/`): tải PGN của study / chương qua API Lichess (`/api/study/{id}.pgn`). Study công khai không cần token. Study riêng tư: đặt biến môi trường `LICHESS_TOKEN` (token quyền `study:read`).
2. **Tách bài** (`tach_bai.py`): mỗi chương có thế cờ bắt đầu (`[FEN]`) là một bài. Nhánh chính là đáp án, biến phụ là nước sai hay gặp. Mọi nước đi đều do python-chess kiểm.
   - Đề bài lấy từ bình luận đầu chương; không có thì tự viết theo kết quả kiểm, ví dụ “Chiếu hết sau 1 nước”.
   - Báo lại: chương là ván đầy đủ (bỏ qua), bài trùng thế cờ (bỏ qua), bài chiếu hết 1 nước có nhiều đáp án (ghi đủ), PGN sai luật (bỏ qua).
   - Điểm từng bài: tag `[Points "20"]`, mặc định 10.
3. **Mô hình** (`mo_hinh.py`): lưu được ra JSON (`--luu-json bai.json`), sửa tay rồi in lại (`phieu-co in bai.json`).
4. **Xuất** (`xuat/`): sơ đồ SVG đen trắng bằng bộ quân cburnett, Typst ghép trang A4, phông Be Vietnam Pro.

## Tùy chọn

| Tham số | Mặc định | Khác |
|---|---|---|
| `--ky-hieu` | `vi` (Xa8#) | `quoc-te` (Ra8#) |
| `--bo-cuc` | `2x3`, có tọa độ | `2x2`, `3x3`, `3x4` (12 thế, không tọa độ) |
| `--dap-an` | `rieng` (dap-an.pdf) | `cung` (trang cuối), `khong` |
| `--diem` | `khong` | `co`: ô điểm từng bài trên phiếu |
| `--huong` | `ben-di` (bên phải đi ở dưới) | `trang` |
| `--bo-trung` | `co` | `khong` |
| `--tieu-de`, `--cap-do`, `--bien-soan` | lấy từ study | |

Dùng chung cho cả CLB: chép `phieu-co.toml.example` thành `phieu-co.toml`.

## Kiểm thử

```bash
.venv/bin/pip install -e '.[test]'
.venv/bin/pytest
```

Kiểm thử chạy không cần mạng, dùng PGN trong `mau/`.

## Giấy phép

GPL-3.0 trở lên (python-chess là GPL-3). Quân cờ cburnett (GPLv2+) và phông Be Vietnam Pro (OFL): xem `src/phieu_co/tai_nguyen/NGUON.md`.
