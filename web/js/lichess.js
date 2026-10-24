// Lấy PGN study / chương Lichess ngay từ trình duyệt của giáo viên (API Lichess cho phép CORS).
// API: GET /api/study/{studyId}.pgn và /api/study/{studyId}/{chapterId}.pgn (id đúng 8 ký tự).
// Chỉ đọc study công khai hoặc không công khai (unlisted); study riêng tư thì tải file PGN lên.

const ID = "[A-Za-z0-9]{8}";
const LINK = new RegExp(`(?:^|/)study/(?:embed/)?(${ID})(?:/(${ID}))?(?=$|[/?#\\s])`);

export function docLink(link) {
  const s = link.trim();
  if (new RegExp(`^${ID}$`).test(s)) return { study: s, chuong: null };
  const m = LINK.exec(s.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/^[^/]*lichess\.org/i, ""));
  return m ? { study: m[1], chuong: m[2] || null } : null;
}

export class LoiLichess extends Error {}

export async function taiPgn({ study, chuong }, { lan = 0 } = {}) {
  const duong = `/api/study/${study}` + (chuong ? `/${chuong}` : "") + ".pgn";
  const q = new URLSearchParams({ clocks: "false", comments: "true", variations: "true", orientation: "true" });
  let r;
  try {
    r = await fetch(`https://lichess.org${duong}?${q}`);
  } catch {
    throw new LoiLichess("Không kết nối được lichess.org. Kiểm tra mạng, hoặc tải file PGN từ Lichess rồi chọn file đó.");
  }
  if (r.status === 429 && lan < 1) {
    await new Promise((ok) => setTimeout(ok, 60_000));
    return taiPgn({ study, chuong }, { lan: lan + 1 });
  }
  if (r.status === 429) throw new LoiLichess("Lichess đang bận (gửi quá nhiều yêu cầu). Chờ vài phút rồi thử lại.");
  if (r.status === 401 || r.status === 403 || r.status === 404) {
    throw new LoiLichess("Lichess không cho xem study này: có thể link sai, hoặc study đang để Riêng tư. Đổi study sang Công khai / Không công khai, hoặc tải file PGN rồi chọn file đó.");
  }
  if (!r.ok) throw new LoiLichess(`Lichess trả lỗi ${r.status}. Thử lại sau, hoặc dùng file PGN.`);
  if (+r.headers.get("content-length") > 20 * 1024 * 1024) throw new LoiLichess("Study quá lớn để đọc trong trình duyệt. Hãy tải PGN của từng chương.");
  return await r.text();
}
