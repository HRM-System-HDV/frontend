// ============================================================
// Utils dùng chung — HR System
// ============================================================

/** Format số tiền VNĐ */
export function formatVND(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

/** Format số */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** Ghép className có điều kiện */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format ngày hiển thị chuẩn Việt Nam (DD/MM/YYYY) */
export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "";
    const d = String(dateInput.getDate()).padStart(2, "0");
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const y = dateInput.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(dateInput).trim();
  if (!str) return "";

  // Match DD/MM/YYYY hoặc D/M/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[1].padStart(2, "0")}/${slashMatch[2].padStart(2, "0")}/${slashMatch[3]}`;
  }

  // Match DD-MM-YYYY hoặc D-M-YYYY
  const hyphenMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (hyphenMatch) {
    return `${hyphenMatch[1].padStart(2, "0")}/${hyphenMatch[2].padStart(2, "0")}/${hyphenMatch[3]}`;
  }

  // Match YYYY-MM-DD hoặc YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, "0")}/${isoMatch[2].padStart(2, "0")}/${isoMatch[1]}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return str;
}

/** Format ngày + giờ hiển thị chuẩn Việt Nam (DD/MM/YYYY HH:mm).
 *  Chuỗi chỉ có ngày thì trả về DD/MM/YYYY, không tự thêm 00:00. */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "";
    const hh = String(dateInput.getHours()).padStart(2, "0");
    const mi = String(dateInput.getMinutes()).padStart(2, "0");
    return `${formatDate(dateInput)} ${hh}:${mi}`;
  }
  const str = String(dateInput).trim();
  if (!str) return "";

  // ISO có giờ: 2026-11-13T14:05[:ss][Z]
  const isoTime = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})/);
  if (isoTime) {
    // Có múi giờ (Z hoặc ±HH:mm) thì đổi về giờ máy người dùng trước khi format.
    if (/(Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return formatDateTime(parsed);
    }
    const [, y, m, d, hh, mi] = isoTime;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y} ${hh.padStart(2, "0")}:${mi}`;
  }

  // DD/MM/YYYY HH:mm hoặc DD-MM-YYYY HH:mm
  const vnTime = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2})?)?/);
  if (vnTime) {
    const [, d, m, y, hh, mi] = vnTime;
    const date = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    return hh !== undefined ? `${date} ${hh.padStart(2, "0")}:${mi}` : date;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return formatDateTime(parsed);
  return str;
}

/** Parse ngày (DD/MM/YYYY, DD-MM-YYYY, ISO) thành Date local; null nếu không hợp lệ.
 *  Dùng cho so sánh/lọc thay vì new Date(chuỗi) để không lệch định dạng. */
export function parseDate(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  const str = String(dateInput).trim();
  if (!str) return null;

  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (iso) {
    if (iso[4] !== undefined && /(Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const [, y, m, d, hh, mi] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh || 0), Number(mi || 0));
  }

  const vn = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (vn) {
    const [, d, m, y, hh, mi] = vn;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh || 0), Number(mi || 0));
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Giá trị cho <input type="date"> (YYYY-MM-DD) từ ngày DD/MM/YYYY */
export function toInputDate(dateInput?: string | Date | null): string {
  const d = parseDate(dateInput);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Giá trị cho <input type="datetime-local"> (YYYY-MM-DDTHH:mm) từ DD/MM/YYYY HH:mm */
export function toInputDateTime(dateInput?: string | Date | null): string {
  const d = parseDate(dateInput);
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${toInputDate(d)}T${hh}:${mi}`;
}

/** Lấy chuỗi ngày hiện tại định dạng DD/MM/YYYY */
export function getTodayVN(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}
