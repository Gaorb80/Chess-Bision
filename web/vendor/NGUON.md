# Thư viện đi kèm trang web

Chép nguyên bản từ npm, không sửa (chỉ bỏ dòng `sourceMappingURL`).

| File | Gói | Phiên bản | Giấy phép |
|---|---|---|---|
| `chess.js` | chess.js (`dist/esm/chess.js`) | 1.4.0 | BSD-2-Clause (`LICENSE-chess.js.txt`) |
| `pdf-lib.esm.min.js` | pdf-lib | 1.17.1 | MIT (`LICENSE-pdf-lib.txt`) |
| `fontkit.umd.min.js` | @pdf-lib/fontkit | 1.1.1 | MIT |
| `docx.mjs` | docx (`dist/index.mjs`, đã gói sẵn jszip) | 9.5.1 | MIT (`LICENSE-docx.txt`); chỉ tải khi bấm Tải Word |

Quân cờ và phông trong `../tai-nguyen/` là bản chép của `src/chessbision/tai_nguyen/` (xem `NGUON.md` ở đó).

## SHA-256

Kiểm lại bằng `sha256sum -c` trong thư mục này (dán các dòng dưới vào một file). Đổi thư viện thì cập nhật bảng này.

```
0fd3d85b712fd650987416ebdc9e85a97406dbc69cb759a2179e96cc7770f16d  chess.js
a4eb247afbb2d445e4b0e2ed1e4bee9dd8c7f3a26f5965b9e11afb615d4c53f5  pdf-lib.esm.min.js
d8df561b9fba98e24f2e5130e40948809281bbbc55a20c412359f1a0a5eb35a6  fontkit.umd.min.js
605e47c33d9098024f8d27f032b643e62542aa7c70f0e531f71b0edc6e5fcda7  docx.mjs
```
