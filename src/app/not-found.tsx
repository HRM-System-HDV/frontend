import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-2xl font-bold text-gray-800">404 — Không tìm thấy trang</h2>
      <p className="text-sm text-gray-600">
        Trang bạn truy cập không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        Về trang Dashboard
      </Link>
    </div>
  );
}
