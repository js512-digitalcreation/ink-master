// Small inline icons used across the app.
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SearchIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const NavIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><path d="M3 11 22 2l-9 19-2-8-8-2z" /></svg>
);
export const PinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const HomeIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>
);
export const CalendarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
// Tattoo machine (coils, frame, grip), tilted like the app icon.
export const StudioIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p} aria-hidden="true">
    <g transform="translate(-0.3 2.2) rotate(-34 12 12) translate(2.2 -1.2)">
      <path d="M3.5 12.5h11.8V5.5" /><path d="M4.5 4h9" />
      <rect x="4.6" y="6" width="4" height="6.5" rx="1.2" /><rect x="9.6" y="6" width="4" height="6.5" rx="1.2" />
      <path d="M15.3 12.5v5.5" /><rect x="13.8" y="18" width="3" height="3.4" rx="1.2" /><path d="M15.3 21.4v1.8" />
    </g>
  </svg>
);
export const UserIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const BackIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
);
export const NextIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
export const ArrowIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2.2} {...p} aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2.4} {...p} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ShareIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
);
export const InstagramIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);
export const ImageIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2.8} {...p} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24">
          <path
            d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z"
            fill={rating >= i + 0.75 ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
