import { cn } from "@/lib/utils";

/**
 * Bloco esqueleto com shimmer sutil.
 * Usa #E5E7EB (slate-200) com gradiente passando — mais "vivo" que o pulse cru.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[hsl(214_32%_91%)] isolate",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        "before:animate-[shimmer_1.4s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
