# Hướng dẫn cho agent: phieu-co

Công cụ in phiếu bài tập cờ vua từ study Lichess / PGN. Kiến trúc: https://claude.ai/artifact/1fN3UKBiGdTSBCpR2kPPvt
Người dùng viết tiếng Việt; trả lời tiếng Việt. Tên module, biến viết tiếng Việt không dấu như mã hiện có.

## Luật cứng

- **Agent không tự tính luật cờ.** Nước đi, FEN, chiếu hết, số đáp án đều qua python-chess. `chess.pgn.read_game` không ném lỗi khi gặp nước sai: luôn kiểm `game.errors`.
- Dữ liệu đi một chiều: nguon → tach_bai → mo_hinh → xuat. Kiểu xuất chỉ đọc mô hình, không đọc PGN.
- Nước đi trong mô hình là SAN quốc tế; đổi ký hiệu Việt chỉ lúc xuất (`ky_hieu.py`).
- Phiếu học sinh không bao giờ chứa đáp án (có phép thử).
- Lichess: gửi lần lượt từng yêu cầu, 429 → chờ 60 s. Token chỉ ở biến môi trường, không ghi vào repo, không in ra. Công cụ chỉ **đọc** Lichess.
- Kiểm thử không dùng mạng: thêm PGN thật vào `mau/` khi cần.
- Tài nguyên ngoài phải ghi nguồn và giấy phép trong `src/phieu_co/tai_nguyen/NGUON.md`.

## Git

Làm trên nhánh riêng, gửi PR để chủ repo duyệt. Không commit thẳng vào `main`.
