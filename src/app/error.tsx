"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-bold text-gray-800">Đã xảy ra lỗi</h2>
      <p className="max-w-md text-sm text-gray-600">
        {error.message || "Không thể tải nội dung. Vui lòng thử lại."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        Thử lại
      </button>
    </div>
  );
}
