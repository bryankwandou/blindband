/**
 * The mark is the product drawn literally: one solid band with both tails
 * broken up. A published percentile band is exactly that — the middle is
 * legible, the edges are deliberately not. It survives being 16 pixels wide in
 * a browser tab, which is the only real test a logo has to pass.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      strokeLinecap="round"
    >
      <g stroke="currentColor" strokeWidth="2.4" opacity="0.38">
        <path d="M4 6h2.4M10.2 6h3.6M17.6 6H20" />
        <path d="M4 18h2.4M10.2 18h3.6M17.6 18H20" />
      </g>
      <path d="M4 12h16" stroke="var(--color-signal)" strokeWidth="3" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-5 w-5 text-ivory" />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">
        Blind<span className="text-signal">band</span>
      </span>
    </span>
  );
}
