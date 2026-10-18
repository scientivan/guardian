// Small inline icons used across the landing page.

type IconProps = { className?: string };

export function ShieldMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 2.5 4.5 7v8.2c0 7 4.9 12.6 11.5 14.3 6.6-1.7 11.5-7.3 11.5-14.3V7L16 2.5Z" fill="#4875a1" />
      <path d="m10.5 16.2 3.8 3.8 7.4-8" fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DoubleCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="m2 10.5 3.5 3.5L12 7.5M8.5 13l1 1 6.5-6.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="m6 6 8 8M14 6l-8 8" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export function Arrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Chevron({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="m5.5 8 4.5 4.5L14.5 8" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hospital({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M4 17V5.5L10 3l6 2.5V17M2.5 17h15M10 7v4M8 9h4M8 17v-3h4v3" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Doc({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M5.5 2.5h6l3.5 3.5v11.5h-9.5zM11.5 2.5V6H15M8 10h5M8 13h5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function People({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-4.5 7c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M13.5 9a2 2 0 1 0 0-4M14.5 11.6c1.8.4 3 2 3 4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Lock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M5 9h10v8H5zM7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

export function EyeOff({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M3 3l14 14M8.3 5.2A8 8 0 0 1 10 5c4.5 0 7.5 5 7.5 5a13 13 0 0 1-2.3 2.8M5.6 6.6C3.7 8 2.5 10 2.5 10s3 5 7.5 5c1.1 0 2.1-.3 3-.7M8.6 8.7a2 2 0 0 0 2.7 2.7" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Chain({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.8-2.8a3 3 0 0 0-4.2-4.2l-1 1M11.5 8.5a3 3 0 0 0-4.2 0l-2.8 2.8a3 3 0 0 0 4.2 4.2l1-1" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- App icons (sidebar and office controls) ---------- */

export function Building({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M3.5 17V7.5L10 3.5l6.5 4V17M3.5 17h13M8 17v-4h4v4M7 9.5h1.5M11.5 9.5H13" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatBubble({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M4 4.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

export function Coins({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M3.5 6.5c0-1.4 2.5-2.5 5.5-2.5s5.5 1.1 5.5 2.5S12 9 9 9 3.5 7.9 3.5 6.5ZM3.5 6.5v3.5C3.5 11.4 6 12.5 9 12.5M3.5 10v3.5C3.5 14.9 6 16 9 16M14.5 6.5V9M11 13.5c0-1.2 1.8-2 3.5-2s3.5.8 3.5 2-1.8 2-3.5 2-3.5-.8-3.5-2Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Upload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 13V4m-3.5 3.5L10 4l3.5 3.5M4 13.5V16h12v-2.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Refund({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M7 6H13a3.5 3.5 0 0 1 0 7H6M7 6l2.5-2.5M7 6l2.5 2.5M6 13l2 2m-2-2 2-2" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Plus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function Minus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M4.5 10h11" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function RotateLeft({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M5 8a5.5 5.5 0 1 1-.5 4.5M5 8V4.5M5 8h3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RotateRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M15 8a5.5 5.5 0 1 0 .5 4.5M15 8V4.5M15 8h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Door({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M5 17V3.5h8V17M3.5 17h13M10.5 10.5h.5M13 5.5l2.5-.5v12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
