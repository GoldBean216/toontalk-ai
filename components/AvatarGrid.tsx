
import React from 'react';
import { Contact } from '../types';

interface AvatarGridProps {
  memberIds: string[];
  allContacts: Contact[];
  userAvatarUrl: string;
  className?: string;
}

export const AvatarGrid: React.FC<AvatarGridProps> = ({ memberIds, allContacts, userAvatarUrl, className = "" }) => {
  // Get the first 9 members (or fewer)
  const displayIds = memberIds.slice(0, 9);
  
  // Calculate grid columns based on count
  // 1 -> full
  // 2-4 -> 2x2
  // 5-9 -> 3x3
  let gridCols = 'grid-cols-1';
  if (displayIds.length >= 2 && displayIds.length <= 4) gridCols = 'grid-cols-2';
  if (displayIds.length >= 5) gridCols = 'grid-cols-3';

  const getAvatar = (id: string) => {
    if (id === 'user' || id.startsWith('toon_')) return userAvatarUrl;
    const c = allContacts.find(c => c.id === id);
    return c ? c.avatarUrl : 'https://picsum.photos/50';
  };

  return (
    <div className={`rounded-full overflow-hidden bg-gray-200 grid ${gridCols} ${className} border-2 border-black`}>
      {displayIds.map((id, index) => (
        <img 
          key={`${id}-${index}`}
          src={getAvatar(id)}
          alt="member"
          className="w-full h-full object-cover"
        />
      ))}
    </div>
  );
};
