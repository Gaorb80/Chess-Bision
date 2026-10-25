# Hướng dẫn cho agent: ChessBision

Công cụ in phiếu bài tập cờ vua từ study Lichess / PGN. Kiến trúc: https://claude.ai/artifact/1fN3UKBiGdTSBCpR2kPPvt
Người dùng viết tiếng Việt; trả lời tiếng Việt. Tên module, biến viết tiếng Việt không dấu như mã hiện có.

## Luật cứng

- **Agent không tự tính luật cờ.** Nước đi, FEN, chiếu hết, số đáp án đều qua python-chess. `chess.pgn.read_game` không ném lỗi khi gặp nước sai: luôn kiểm `game.errors`.
- Dữ liệu đi một chiều: nguon → tach_bai → mo_hinh → xuat. Kiểu xuất chỉ đọc mô hình, không đọc PGN.
- Nước đi trong mô hình là SAN quốc tế; đổi ký hiệu Việt chỉ lúc xuất (`ky_hieu.py`).
- Phiếu học sinh không bao giờ chứa đáp án (có phép thử).
- Lichess: gửi lần lượt từng yêu cầu, 429 → chờ 60 s. Token chỉ ở biến môi trường, không ghi vào repo, không in ra. Công cụ chỉ **đọc** Lichess.
- Kiểm thử không dùng mạng: thêm PGN thật vào `mau/` khi cần.
- Tài nguyên ngoài phải ghi nguồn và giấy phép trong `src/chessbision/tai_nguyen/NGUON.md`.

## Trang web (`web/`)

- Bản JavaScript chạy trong trình duyệt, đăng lên GitHub Pages. Giữ cùng quy ước với bản Python: sửa luật tách bài ở một bên thì sửa cả bên kia và `tests/web/`. Phép thử chung `tests/chung/` bắt hai bên ra cùng JSON; thêm PGN vào `mau/` thì chạy `tests/chung/cap_nhat.py`.
- PDF (`pdf.js`) và Word (`docx.js`) cùng bố cục; sửa một bên thì sửa bên kia. Lề in: mọi nét, kể cả chân trang, cách mép giấy ít nhất `VUNG_AN_TOAN` (15 mm) ở cả Typst, PDF web và Word; có phép thử `tests/web/le_in.test.mjs` và `test_le_in_an_toan`. Phiếu học sinh không chứa đáp án ở cả hai (có phép thử trong `tests/web/xuat.test.mjs`).
- Mẫu phiếu và logo lưu trong `localStorage`; mọi mẫu đọc vào đều qua `chuanMau()`, logo chỉ nhận PNG/JPEG thật dưới 300 KB.
- Luật cờ ở web do chess.js tính (cùng luật cứng như python-chess). Thư viện chép vào `web/vendor/`, không dùng CDN, không cần build.

## Bảo mật trang web

- Mọi chữ lấy từ PGN (tên chương, tag, bình luận) là dữ liệu không tin cậy: đưa vào HTML chỉ qua `thoat()` hoặc `textContent`. Không ghép chuỗi chưa thoát vào `innerHTML`.
- `index.html` có Content-Security-Policy: chỉ chạy script của chính trang, chỉ gọi mạng tới `lichess.org`. Thêm nguồn mạng hay thư viện mới thì sửa CSP có chủ đích, không nới `script-src`.
- Bộ đọc PGN phải chịu được PGN hỏng hoặc độc: giới hạn kích thước (20 MB), số bài (500), độ sâu biến phụ (64); regex không được chạy bậc hai. Có phép thử trong `tests/web/`.
- Thư viện trong `web/vendor/` phải trùng byte với bản npm ghi trong `NGUON.md`. GitHub Action ghim theo mã commit; Dependabot báo bản mới.

## Git

Làm trên nhánh riêng, gửi PR để chủ repo duyệt. Không commit thẳng vào `main`.
