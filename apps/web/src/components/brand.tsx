import Image from 'next/image';
/** The approved provider mark, independent of each customer's own visual identity. */
export function Brand({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/seitenwerk-mark-128.png"
        width={32}
        height={32}
        alt={compact ? 'SeitenWerk' : ''}
        unoptimized
        loading="eager"
        className="h-8 w-8 shrink-0 object-contain"
      />
      {!compact ? <span className="font-semibold tracking-tight">SeitenWerk</span> : null}
    </span>
  );
}
