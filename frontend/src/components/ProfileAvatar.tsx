import React, { useState } from 'react';

interface ProfileAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
};

/**
 * Renders the user's Google profile photo with a letter-initial fallback.
 * Never shows a broken image. Never uses hardcoded/mock avatar URLs.
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ photoURL, displayName, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const initial = (displayName || '?')[0].toUpperCase();
  const sizeClass = SIZES[size];

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={displayName || 'Profile'}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  // Initial-based fallback
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-[#5D0623] to-[#8c0834] flex items-center justify-center text-white font-bold select-none ${className}`}>
      {initial}
    </div>
  );
};
