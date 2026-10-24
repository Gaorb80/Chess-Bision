// Viết nước đi cho học sinh: đánh số lại từ 1, ký hiệu quốc tế (mặc định) hoặc Việt.

// Vua, Hậu, Xe, Tượng, Mã; tốt không có chữ
const VI = { K: "V", Q: "H", R: "X", B: "T", N: "M" };

export function san(nuoc, kyHieu = "quoc-te") {
  if (kyHieu === "quoc-te") return nuoc;
  return nuoc.replace(/^[KQRBN]|(?<==)[QRBN]/g, (q) => VI[q]);
}

// ['Qh2+', 'Kf1', 'Qf2#'], Đen đi trước → '1... Qh2+ 2. Kf1 Qf2#'
export function dongNuoc(nuoc, benDi, kyHieu = "quoc-te") {
  const phan = [];
  let trang = benDi === "white";
  let so = 1;
  nuoc.forEach((n, i) => {
    if (trang) phan.push(`${so}.`);
    else if (i === 0) phan.push(`${so}...`);
    phan.push(san(n, kyHieu));
    if (!trang) so++;
    trang = !trang;
  });
  return phan.join(" ");
}
