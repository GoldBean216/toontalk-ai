import React from 'react';
import { MapBuildingContent } from './ToonMap/types';

interface BuildingTrackProps {
  buildingType: string;
  generatedContents?: MapBuildingContent[];
  onSelectContent?: (content: MapBuildingContent) => void;
}

const getTitleFromMarkdown = (markdown: string, defaultTitle: string) => {
  if (!markdown) return defaultTitle;
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '');
    }
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return trimmed.replace(/^\*\*|\*\*$/g, '');
    }
    if (trimmed.length > 0) {
      return trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed;
    }
  }
  return defaultTitle;
};

export const BuildingTrack: React.FC<BuildingTrackProps> = ({ 
  buildingType, 
  generatedContents, 
  onSelectContent 
}) => {
  // Determine item configuration based on building type
  const getTrackItems = () => {
    const type = (buildingType || '').toLowerCase();
    if (type.includes('lake')) {
      return {
        icon: '🐠',
        label: 'SWIMMING...',
        colorClass: 'border-cyan-400 bg-cyan-50 text-cyan-600',
        hoverAnim: 'hover:bounce-anim hover:scale-125 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]',
        sparkleEmoji: '🐟'
      };
    }
    if (type.includes('park') || type.includes('fountain') || type.includes('garden') || type.includes('forest')) {
      return {
        icon: '🌸',
        label: 'STROLLING...',
        colorClass: 'border-emerald-400 bg-emerald-50 text-emerald-600',
        hoverAnim: 'hover:bounce-anim hover:scale-125 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]',
        sparkleEmoji: '🦋'
      };
    }
    if (type.includes('mountain') || type.includes('peak') || type.includes('hill') || type.includes('climb')) {
      return {
        icon: '🏔️',
        label: 'CLIMBING...',
        colorClass: 'border-slate-400 bg-slate-50 text-slate-700',
        hoverAnim: 'hover:bounce-anim hover:scale-125 hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]',
        sparkleEmoji: '❄️'
      };
    }
    if (type.includes('office') || type.includes('hq')) {
      return {
        icon: '💻',
        label: 'COMPILING...',
        colorClass: 'border-blue-400 bg-blue-50 text-blue-600',
        hoverAnim: 'hover:rotate-12 hover:scale-125 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]',
        sparkleEmoji: '💾'
      };
    }
    if (type.includes('cafe') || type.includes('shop') || type.includes('boba')) {
      return {
        icon: '☕',
        label: 'BREWING...',
        colorClass: 'border-amber-400 bg-amber-50 text-amber-700',
        hoverAnim: 'hover:bounce-anim hover:scale-125 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]',
        sparkleEmoji: '✨'
      };
    }
    if (type.includes('training') || type.includes('gym')) {
      return {
        icon: '🏋️',
        label: 'PUMPING...',
        colorClass: 'border-red-400 bg-red-50 text-red-600',
        hoverAnim: 'hover:-translate-y-2 hover:scale-125 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]',
        sparkleEmoji: '🔥'
      };
    }
    if (type.includes('education') || type.includes('library')) {
      return {
        icon: '📚',
        label: 'READING...',
        colorClass: 'border-emerald-400 bg-emerald-50 text-emerald-700',
        hoverAnim: 'hover:rotate-6 hover:scale-125 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]',
        sparkleEmoji: '💡'
      };
    }
    if (type.includes('entertainment') || type.includes('arcade') || type.includes('cinema')) {
      return {
        icon: '🎮',
        label: 'LOADING...',
        colorClass: 'border-purple-400 bg-purple-50 text-purple-600',
        hoverAnim: 'hover:spin-anim hover:scale-125 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]',
        sparkleEmoji: '👾'
      };
    }
    if (type.includes('hospital')) {
      return {
        icon: '💊',
        label: 'HEALING...',
        colorClass: 'border-cyan-400 bg-cyan-50 text-cyan-600',
        hoverAnim: 'hover:pulse-anim hover:scale-125 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]',
        sparkleEmoji: '❤️'
      };
    }
    return {
      icon: '📦',
      label: 'PROCESSING...',
      colorClass: 'border-slate-400 bg-slate-50 text-slate-600',
      hoverAnim: 'hover:scale-110',
      sparkleEmoji: '⭐'
    };
  };

  const itemInfo = getTrackItems();

  return (
    <div className="w-full bg-slate-200 border-t-4 border-b-4 border-black py-2.5 overflow-hidden relative select-none z-10 flex flex-col justify-center">
      {/* Clean rail line (No stripes) */}
      <div className="w-full h-1 bg-black/30 absolute top-1/2 -translate-y-1/2 z-0" />
      
      {/* Sliding items from left to right */}
      <div className="w-full relative z-10 h-12 overflow-hidden">
        {[1, 2, 3, 4].map((id) => {
          const content = generatedContents && generatedContents.length > 0
            ? generatedContents[(id - 1) % generatedContents.length]
            : undefined;

          return (
            <div 
              key={id}
              className="track-move-item"
              style={{
                animationDelay: `${-(id - 1) * 4}s`
              }}
            >
              <TrackItem 
                itemInfo={itemInfo} 
                itemId={id} 
                boundContent={content}
                onSelectContent={onSelectContent}
              />
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes trackMoveLeftToRight {
          0% { left: -15%; }
          100% { left: 115%; }
        }
        .track-move-item {
          position: absolute;
          top: 0;
          height: 100%;
          display: flex;
          align-items: center;
          animation: trackMoveLeftToRight 16s linear infinite;
          transform: translate3d(0, 0, 0);
          will-change: left;
        }
        .track-move-item:hover {
          animation-play-state: paused;
          z-index: 50;
        }
        @keyframes bounceItem {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .bounce-anim {
          animation: bounceItem 0.6s infinite ease-in-out;
        }
        @keyframes spinItem {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spinItem 1.5s infinite linear;
        }
        @keyframes pulseItem {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .pulse-anim {
          animation: pulseItem 0.8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

interface TrackItemProps {
  itemInfo: {
    icon: string;
    label: string;
    colorClass: string;
    hoverAnim: string;
    sparkleEmoji: string;
  };
  itemId: number;
  boundContent?: MapBuildingContent;
  onSelectContent?: (content: MapBuildingContent) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({ 
  itemInfo, 
  itemId, 
  boundContent, 
  onSelectContent 
}) => {
  const [hovered, setHovered] = React.useState(false);
  const [clickCount, setClickCount] = React.useState(0);

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);
  
  const handleClick = () => {
    setClickCount(prev => prev + 1);
    if (boundContent && onSelectContent) {
      onSelectContent(boundContent);
    }
  };

  const getDisplayIcon = () => {
    if (itemInfo.icon === '🐠') {
      const fishIcons = ['🐠', '🐟', '🐡', '🐙', '🦑'];
      return fishIcons[itemId % fishIcons.length];
    }
    if (itemInfo.icon === '🌸') {
      const parkIcons = ['🌸', '🌱', '🦋', '🐦', '🍃', '🐞', '🚲', '🐿️'];
      return parkIcons[itemId % parkIcons.length];
    }
    if (itemInfo.icon === '🏔️') {
      const mountainIcons = ['🏔️', '⛰️', '🚩', '🧗', '🏕️', '🥾', '🌲', '🐐'];
      return mountainIcons[itemId % mountainIcons.length];
    }
    return itemInfo.icon;
  };

  const getDisplaySparkle = () => {
    if (itemInfo.sparkleEmoji === '🐟') {
      const sparkleEmojis = ['🐟', '🫧', '✨', '🐠', '🐡'];
      return sparkleEmojis[itemId % sparkleEmojis.length];
    }
    if (itemInfo.sparkleEmoji === '🦋') {
      const sparkleEmojis = ['🦋', '✨', '🌸', '🍃', '🌼'];
      return sparkleEmojis[itemId % sparkleEmojis.length];
    }
    if (itemInfo.sparkleEmoji === '❄️') {
      const sparkleEmojis = ['❄️', '☁️', '✨', '🏔️'];
      return sparkleEmojis[itemId % sparkleEmojis.length];
    }
    return itemInfo.sparkleEmoji;
  };

  const displayLabel = boundContent
    ? getTitleFromMarkdown(boundContent.markdown, itemInfo.label)
    : itemInfo.label;

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Floating particles on hover */}
      {hovered && (
        <div className="absolute -top-9 flex gap-1 animate-bounce text-xs pointer-events-none select-none z-20">
          <span>{getDisplaySparkle()}</span>
          <span className="bg-black text-white text-[7px] font-black px-1.5 py-0.5 rounded border border-white whitespace-nowrap shadow-md">
            {displayLabel}
          </span>
        </div>
      )}

      {/* Styled Item Container */}
      <div 
        className={`w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-300 transform select-none bg-white
          ${itemInfo.colorClass} 
          ${itemInfo.hoverAnim}
          ${clickCount % 2 === 1 ? 'scale-90 rotate-12' : ''}
        `}
      >
        {getDisplayIcon()}
      </div>
    </div>
  );
};
