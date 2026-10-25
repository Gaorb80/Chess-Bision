// Mẫu phiếu: những tùy chọn trình bày giáo viên dùng lại nhiều lần (bố cục, đáp án,
// người biên soạn, logo CLB). Lưu trên máy giáo viên (localStorage), không gửi đi đâu.
// Mẫu tách khỏi dữ liệu bài: cùng một bộ bài in được ra nhiều kiểu phiếu.

export const MAU_CO_SAN = [
  { id: "phieu-6", ten: "Phiếu 6 thế, có tọa độ", boCuc: "2x3", dapAn: true, bienSoan: "", logo: null, coSan: true },
  { id: "phieu-12", ten: "Phiếu 12 thế, không tọa độ", boCuc: "3x4", dapAn: true, bienSoan: "", logo: null, coSan: true },
];

const KHOA = "chessbision.mau-phieu";
const BO_CUC = ["2x2", "2x3", "3x4"];
export const LOGO_TOI_DA = 300 * 1024;          // byte ảnh gốc
const DAU_LOGO = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;

// Ảnh logo: chỉ nhận PNG hoặc JPEG thật (kiểm chữ ký đầu file), không quá LOGO_TOI_DA.
export function kiemLogo(bytes) {
  if (bytes.length > LOGO_TOI_DA) throw new Error(`Logo quá lớn (${Math.ceil(bytes.length / 1024)} KB). Chọn ảnh dưới ${LOGO_TOI_DA / 1024} KB.`);
  const dau = (...b) => b.every((x, i) => bytes[i] === x);
  if (dau(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (dau(0xff, 0xd8, 0xff)) return "jpeg";
  throw new Error("Logo phải là ảnh PNG hoặc JPG.");
}

export function logoThanhDataUrl(bytes) {
  const loai = kiemLogo(bytes);
  let nhi = "";
  for (let i = 0; i < bytes.length; i += 0x8000) nhi += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/${loai};base64,${btoa(nhi)}`;
}

export function dataUrlThanhLogo(url) {
  if (!url || !DAU_LOGO.test(url)) return null;
  const nhi = atob(url.slice(url.indexOf(",") + 1));
  const bytes = Uint8Array.from(nhi, (c) => c.charCodeAt(0));
  try { return { loai: kiemLogo(bytes), bytes }; } catch { return null; }
}

const chuoi = (v, toiDa) => (typeof v === "string" ? v.trim().slice(0, toiDa) : "");

// Mẫu đọc từ máy (hoặc sau này từ file người khác gửi): chỉ giữ trường đúng kiểu.
export function chuanMau(m) {
  if (!m || typeof m !== "object") return null;
  const ten = chuoi(m.ten, 60);
  if (!ten) return null;
  return {
    id: chuoi(m.id, 40) || "rieng-" + Date.now().toString(36),
    ten,
    boCuc: BO_CUC.includes(m.boCuc) ? m.boCuc : "2x3",
    dapAn: m.dapAn !== false,
    bienSoan: chuoi(m.bienSoan, 100),
    logo: typeof m.logo === "string" && dataUrlThanhLogo(m.logo) ? m.logo : null,
    coSan: false,
  };
}

function kho() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function docMauRieng(k = kho()) {
  try {
    const ds = JSON.parse(k?.getItem(KHOA) || "[]");
    return Array.isArray(ds) ? ds.map(chuanMau).filter(Boolean) : [];
  } catch { return []; }
}

export const tatCaMau = (k = kho()) => [...MAU_CO_SAN, ...docMauRieng(k)];

// Lưu (hoặc thay mẫu cùng tên). Trả về mẫu đã lưu; ném lỗi nếu máy không cho lưu.
export function luuMau(m, k = kho()) {
  const moi = chuanMau(m);
  if (!moi) throw new Error("Mẫu cần có tên.");
  if (MAU_CO_SAN.some((c) => c.ten === moi.ten)) throw new Error("Tên này trùng mẫu có sẵn, hãy đặt tên khác.");
  const ds = docMauRieng(k);
  const cu = ds.findIndex((x) => x.ten === moi.ten);
  if (cu >= 0) { moi.id = ds[cu].id; ds[cu] = moi; } else ds.push(moi);
  if (!k) throw new Error("Trình duyệt không cho lưu trên máy (chế độ ẩn danh?).");
  try {
    k.setItem(KHOA, JSON.stringify(ds));
  } catch {
    throw new Error("Không lưu được: bộ nhớ trình duyệt đã đầy. Thử logo nhỏ hơn.");
  }
  return moi;
}

export function xoaMau(id, k = kho()) {
  const ds = docMauRieng(k).filter((x) => x.id !== id);
  try { k?.setItem(KHOA, JSON.stringify(ds)); } catch { /* không xóa được thì thôi */ }
}

// Sao trên đầu phiếu: nếu mọi bài được chọn cùng một cấp độ thì trả về cấp độ đó (1–3), không thì 0.
export function capDoChung(exercises) {
  const cac = new Set(exercises.map((e) => e.level ?? 0));
  return cac.size === 1 ? [...cac][0] : 0;
}
