interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#atlas-gradient)" />
      <path d="M21 46L31.5 18H34.5L45 46H39.5L37.2 39.4H28.8L26.5 46H21Z" fill="white" />
      <path d="M30.3 34.9H35.7L33 26.7L30.3 34.9Z" fill="#F6C453" />
      <circle cx="47.5" cy="18.5" r="4.5" fill="#F6C453" />
      <defs>
        <linearGradient id="atlas-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0E4668" />
          <stop offset="1" stopColor="#12344D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
