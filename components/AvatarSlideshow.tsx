
import React, { useState, useEffect } from 'react';
import { Contact } from '../types';

interface AvatarSlideshowProps {
  memberIds: string[];
  allContacts: Contact[];
  userAvatarUrl: string;
  className?: string;
}

export const AvatarSlideshow: React.FC<AvatarSlideshowProps> = ({ memberIds, allContacts, userAvatarUrl, className = "" }) => {
  const [index, setIndex] = useState(0);

  const getAvatar = (id: string) => {
    if (id === 'user' || id.startsWith('toon_')) return userAvatarUrl;
    const c = allContacts.find(c => c.id === id);
    return c ? c.avatarUrl : 'https://picsum.photos/50';
  };

  // Create array of valid avatar URLs
  const avatars = memberIds.map(id => getAvatar(id));

  useEffect(() => {
    if (avatars.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % avatars.length);
    }, 3000); // Change every 3 seconds
    return () => clearInterval(interval);
  }, [avatars.length]);

  if (avatars.length === 0) return null;

  return (
    <div className={`relative overflow-hidden rounded-full border-2 border-black bg-gray-200 ${className}`}>
        {avatars.map((src, i) => (
            <img
                key={i}
                src={src}
                alt="Member"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    i === index ? 'opacity-100' : 'opacity-0'
                }`}
            />
        ))}
    </div>
  );
};
