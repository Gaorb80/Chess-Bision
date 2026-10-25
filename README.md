# ChessBision

In phiếu bài tập cờ vua từ **link study Lichess** hoặc **file PGN**: một lệnh, ra `phieu.pdf` gồm các trang bài tập cho học sinh và trang đáp án ở cuối.

```bash
chessbision in https://lichess.org/study/TqmJP6yk
chessbision in mau/chieu-het-1-nuoc.pgn --cap-do A --bien-soan "CLB Dream Chess"
```

## Dùng trên web (cho giáo viên, không cần cài gì)

Mở **https://gaorb80.github.io/Chess-Bision/**, dán link study Lichess (hoặc chọn file PGN), xem trước, chọn bố cục 6 hay 12 thế mỗi trang, bấm **Tải PDF** hoặc **Tải Word** (file .docx sửa chữ được trong Word / Google Docs).

- **Mẫu phiếu**: lưu bố cục, trang đáp án, người biên soạn và logo CLB thành mẫu có tên, lần sau chọn lại. Mẫu lưu trên máy (trình duyệt) của giáo viên.
- **Cấp độ**: ghi tag `[Level "2"]` (hoặc `★★`, `B`) và `[Theme "Chiếu hết, Hy sinh"]` trong chương Lichess. Trang hiện sao trên từng bài, cho chọn bài theo cấp độ, xếp từ dễ đến khó và in sao cạnh tiêu đề phiếu. Trang chạy hoàn toàn trong trình duyệt: lấy PGN thẳng từ Lichess, tạo PDF ngay trên máy, không có máy chủ riêng.

Mã trang web ở `web/` (HTML + JavaScript thuần, không cần build): `pgn.js` đọc PGN, `tach_bai.js` tách bài theo đúng quy ước của bản Python (luật cờ do chess.js tính), `pdf.js` vẽ phiếu bằng pdf-lib, `docx.js` ra file Word bằng thư viện docx (chỉ tải khi bấm), `mau_phieu.js` giữ mẫu phiếu. Chạy thử trên máy: `python -m http.server -d web 8000` rồi mở http://localhost:8000. Kiểm thử: `node --test tests/web/*.test.mjs`. Mỗi lần `main` thay đổi, workflow `.github/workflows/trang-web.yml` kiểm thử rồi đăng lại trang.

## Dòng lệnh

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
   - Báo lại: chương là ván đầy đủ (bỏ qua), bài trùng thế cờ (bỏ qua), bài chiếu hết 1 nước có nhiều đáp án (ghi đủ), PGN sai luật (bỏ qua), bài chưa có nước đáp án.
   - Study tách “Bài tập” (chỉ có thế cờ) và “Đáp án” (cùng thế cờ, có nước đi) thành hai chương: nước đi của chương sau được ghép làm đáp án cho bài trước.
   - Điểm từng bài: tag `[Points "20"]`, mặc định 10.
   - Cấp độ: tag `[Level]` nhận `1`–`3`, `★`–`★★★` hoặc `A`–`C`; chủ đề: tag `[Theme]`, nhiều chủ đề cách nhau bằng dấu phẩy.
3. **Mô hình** (`mo_hinh.py`): lưu được ra JSON (`--luu-json bai.json`), sửa tay rồi in lại (`chessbision in bai.json`).
4. **Xuất** (`xuat/`): sơ đồ SVG đen trắng bằng bộ quân cburnett, Typst ghép trang A4, phông Be Vietnam Pro.
   - Đề in đủ, không cắt: hàng sơ đồ có đề dài cao hơn, trang đó in ít thế hơn. Trang nào cũng có tiêu đề và chỗ ghi họ tên.
   - Số dòng ghi lời giải theo độ dài đáp án (tối đa 4 dòng ở `2x2`, 2 dòng ở `2x3`, 1 dòng ở `3x3`/`3x4`).
   - Emoji trong tên chương bị bỏ khi in (phông in không có).

## Tùy chọn

| Tham số | Mặc định | Khác |
|---|---|---|
| `--ky-hieu` | `quoc-te` (Ra8#) | `vi` (Xa8#) |
| `--bo-cuc` | `2x3` (6 thế, có tọa độ) | `3x4` (12 thế, không tọa độ), `2x2`, `3x3` |
| `--dap-an` | `cung` (trang cuối phieu.pdf) | `rieng` (dap-an.pdf), `khong` |
| `--diem` | `khong` | `co`: ô điểm từng bài trên phiếu |
| `--huong` | `ben-di` (bên phải đi ở dưới) | `trang` |
| `--bo-trung` | `co` | `khong` |
| `--de-bai` | `tat-ca` (đề + bình luận của study) | `ngan` (chỉ đề tự viết như “Chiếu hết sau 1 nước”), `khong` (chỉ in thế cờ) |
| `--le-gay` | `trai`: chừa 25 mm bên trái (in một mặt, ghim góc trái) | `guong`: 25 mm phía gáy, đổi bên theo trang (in hai mặt); `khong`: 18 mm hai bên |
| `--bai-chua-dap-an` | `khong`: bỏ bài chưa có nước đáp án | `co`: vẫn in, đáp án ghi “(chưa có đáp án)” |
| `--tieu-de`, `--cap-do`, `--bien-soan` | lấy từ study | |

Dùng chung cho cả CLB: chép `chessbision.toml.example` thành `chessbision.toml`.

## Kiểm thử

```bash
.venv/bin/pip install -e '.[test]'
.venv/bin/pytest
```

Kiểm thử chạy không cần mạng, dùng PGN trong `mau/`. Bản Python và bản web cùng phải tách mỗi PGN trong `mau/` ra đúng file `tests/chung/<tên>.json`; khi cố ý đổi luật tách bài, chạy `.venv/bin/python tests/chung/cap_nhat.py` rồi xem lại phần thay đổi.

## Giấy phép

GPL-3.0 trở lên (python-chess là GPL-3). Quân cờ cburnett (GPLv2+) và phông Be Vietnam Pro (OFL): xem `src/chessbision/tai_nguyen/NGUON.md`.
