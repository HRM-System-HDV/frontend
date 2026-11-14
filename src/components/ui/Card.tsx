import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

export function Card({ className, flush, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-300 shadow-card",
        flush ? "overflow-hidden" : "",
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  // flex-wrap: trên viewport hẹp, control bên phải (select kỳ, nút bấm) xuống dòng
  // thay vì kéo card - và cả trang - rộng ra.
  return (
    <div
      className={cn(
        "px-5 pt-5 pb-4 flex flex-wrap items-center justify-between gap-4",
        className
      )}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  // min-w-0 để title dài co lại trong hàng flex thay vì đẩy control ra ngoài viewport.
  return (
    <h5 className={cn("mb-0 min-w-0 font-semibold text-gray-800", className)} {...rest} />
  );
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-5", className)} {...rest} />;
}
