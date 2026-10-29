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
  return (
    <div
      className={cn("px-5 pt-5 pb-4 flex items-center justify-between gap-4", className)}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-0 font-semibold text-gray-800", className)} {...rest} />;
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-5", className)} {...rest} />;
}
