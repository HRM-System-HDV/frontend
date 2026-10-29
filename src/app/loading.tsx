export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        <p className="text-sm font-medium text-gray-600">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
