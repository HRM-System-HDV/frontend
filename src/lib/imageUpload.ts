import { apiPost } from "./api";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể xử lý file ảnh"));
    img.src = src;
  });
}

/** Giảm ảnh về tối đa 1600px trước khi upload để request nằm trong timeout 5s của gateway. */
export async function fileToDownscaledDataUrl(file: File, maxDim = 1600): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1 && file.size <= 2 * 1024 * 1024) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(mime, 0.85);
}

export async function uploadImageFile(file: File, folder: string): Promise<string> {
  const dataUrl = await fileToDownscaledDataUrl(file);
  const res = await apiPost<{ url?: string }>("/api/upload", { file: dataUrl, folder });
  if (!res || !res.url) {
    throw new Error("Không nhận được đường dẫn ảnh từ máy chủ");
  }
  return res.url;
}