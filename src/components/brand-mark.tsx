export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="YuriSeason">
      <path d="M32 52V31" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M31.8 32.5C23.2 31.1 16.9 25.6 14 16c9.8-.2 16.1 5.3 17.8 16.5Z" fill="#f0edff" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32.2 32.5C40.8 31.1 47.1 25.6 50 16c-9.8-.2-16.1 5.3-17.8 16.5Z" fill="#f0edff" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 31C27.7 25.5 28 18.5 32 11c4 7.5 4.3 14.5 0 20Z" fill="#dcd6ff" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="34" r="2.2" fill="#8a7de2" />
    </svg>
  );
}
