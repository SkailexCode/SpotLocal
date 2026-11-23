import React from 'react';
import { Heart } from 'lucide-react';

export const SpotLocalLogo: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="16" cy="16" r="15" fill="var(--accent)" />
    <path
      d="M9.3 12.6C13.8 11.2 19.3 11.5 23.2 13.8"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M10.5 16.8C14.2 15.7 18.6 16 21.8 17.9"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M11.8 20.7C14.7 19.9 18 20.1 20.5 21.6"
      stroke="#FFFFFF"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

export const YouTubeLogo: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 28 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <rect x="0.5" y="0.5" width="27" height="19" rx="5" fill="#FF0000" />
    <path d="M11.2 6L18.6 10L11.2 14V6Z" fill="#FFFFFF" />
  </svg>
);

export const LikedTracksPoster: React.FC<{
  className?: string;
  iconClassName?: string;
}> = ({ className = 'w-11 h-11 rounded-md', iconClassName = 'w-4 h-4' }) => (
  <div
    className={`bg-gradient-to-br from-[#450af5] via-[#6b5ce7] to-[#b8e4d8] flex items-center justify-center shrink-0 select-none ${className}`}
  >
    <Heart className={`${iconClassName} text-white fill-white drop-shadow-sm`} />
  </div>
);

export const VideoClipBadge: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <span
    title="Clip / Audio YouTube"
    className={`inline-flex items-center justify-center w-[15px] h-[12px] rounded-[2px] border border-[var(--text-muted)]/60 text-[var(--text-sub)] shrink-0 ${className}`}
  >
    <svg viewBox="0 0 8 8" className="w-[7px] h-[7px] fill-current">
      <path d="M2 1.4L6.6 4L2 6.6V1.4Z" />
    </svg>
  </span>
);
