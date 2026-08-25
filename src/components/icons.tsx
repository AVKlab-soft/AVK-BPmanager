interface P {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function LogoMark({ className }: P) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M9 21l6-10 8 7" stroke="#33445f" strokeWidth="2" fill="none" />
      <circle cx="9" cy="21" r="3.6" fill="#57b6f5" />
      <circle cx="15" cy="11" r="3.6" fill="#f6b83d" />
      <circle cx="23" cy="18" r="3.6" fill="#3ed598" />
    </svg>
  );
}

export function IconQuestion({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.7 9.4a2.4 2.4 0 1 1 3.4 2.3c-.75.35-1.1.85-1.1 1.7" />
      <path d="M12 16.4v.2" strokeWidth="2.4" />
    </svg>
  );
}

export function IconSystem({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconContext({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M12 3.5l8 4-8 4-8-4z" />
      <path d="M4 12.2l8 4 8-4" />
      <path d="M4 16.6l8 4 8-4" />
    </svg>
  );
}

export function IconPrompt({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M7.5 9.5l3 2.8-3 2.8" />
      <path d="M12.5 15.5h4" />
    </svg>
  );
}

export function IconAnswer({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M20.5 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.9A8 8 0 1 1 20.5 11.5z" />
      <path d="M8.8 11.8l2.2 2.2 4.2-4.4" />
    </svg>
  );
}

export function IconNote({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M14.5 5l4.5 4.5L8.5 20H4v-4.5z" />
      <path d="M12.5 7l4.5 4.5" />
    </svg>
  );
}

export function IconFolder({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function IconDownload({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M12 4v10.5M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}

export function IconTrash({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
      <path d="M10.5 11v5M13.5 11v5" />
    </svg>
  );
}

export function IconCopy({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M5.5 14.5h-.5a1.5 1.5 0 0 1-1.5-1.5V5a1.5 1.5 0 0 1 1.5-1.5H13A1.5 1.5 0 0 1 14.5 5v.5" />
    </svg>
  );
}

export function IconClipboard({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 11l2.2 2.2L15.5 9" />
    </svg>
  );
}

export function IconSend({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M20.5 3.5L3.5 10l6.5 2.5L12.5 19z" />
      <path d="M20.5 3.5L10 12.5" />
    </svg>
  );
}

export function IconPlus({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

export function IconMinus({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M5.5 12h13" />
    </svg>
  );
}

export function IconFit({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    </svg>
  );
}

export function IconBack({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconX({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function IconCheck({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconInfo({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5" />
      <path d="M12 7.6v.2" strokeWidth="2.4" />
    </svg>
  );
}

export function IconAlert({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M12 4L2.8 19.5h18.4z" />
      <path d="M12 10v4.2" />
      <path d="M12 16.8v.2" strokeWidth="2.4" />
    </svg>
  );
}

export function TypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "question":
      return <IconQuestion className={className} />;
    case "system":
      return <IconSystem className={className} />;
    case "context":
      return <IconContext className={className} />;
    case "prompt":
      return <IconPrompt className={className} />;
    case "answer":
      return <IconAnswer className={className} />;
    default:
      return <IconNote className={className} />;
  }
}
