import COLLEGE_LOGO_BASE64 from '../assets/logoBase64';

interface CollegeLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

export default function CollegeLogo({
  size = 44,
  className = '',
  alt = 'Jaya Sakthi Engineering College Official Logo',
}: CollegeLogoProps) {
  return (
    <div
      className={`relative rounded-full flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={COLLEGE_LOGO_BASE64}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-contain rounded-full drop-shadow-xs"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

