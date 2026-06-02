import React from 'react';

interface GoldCoinProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const GoldCoin: React.FC<GoldCoinProps> = ({ 
  className = "w-6 h-6", 
  size = 24, 
  animate = true 
}) => {
  return (
    <svg 
      className={`${className} select-none shrink-0 ${animate ? 'hover:rotate-12 hover:scale-110 active:scale-95 transition-all duration-300' : ''}`} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: "drop-shadow(1px 2px 0px #000)"
      }}
    >
      {/* Outer Coin Body with Thick Black Cartoon Border */}
      <circle cx="12" cy="12" r="10" fill="url(#toonCoinBodyGrad)" stroke="black" strokeWidth="2" />
      
      {/* Inner concentric ring */}
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="black" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.4" />
      
      {/* Bold cartoon Dollar Sign in center */}
      <text 
        x="12" 
        y="16.5" 
        textAnchor="middle" 
        fontFamily="Impact, Arial Black, sans-serif" 
        fontSize="13" 
        fontWeight="900" 
        fill="url(#toonCoinTextGrad)" 
        stroke="black" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
      >$</text>
      <text 
        x="12" 
        y="16.5" 
        textAnchor="middle" 
        fontFamily="Impact, Arial Black, sans-serif" 
        fontSize="13" 
        fontWeight="900" 
        fill="url(#toonCoinTextGrad)"
      >$</text>

      {/* Shiny Gloss Reflection on top left */}
      <path 
        d="M3.5 12A8.5 8.5 0 0 1 12 3.5C7.3 3.5 3.5 7.3 3.5 12Z" 
        fill="white" 
        opacity="0.35" 
        pointerEvents="none" 
      />
      
      {/* Sparkles */}
      <circle cx="6" cy="6" r="0.75" fill="white" className={animate ? "animate-ping" : ""} style={{ animationDuration: '2s' }} />
      <circle cx="18" cy="18" r="0.5" fill="white" className={animate ? "animate-ping" : ""} style={{ animationDuration: '1.5s' }} />

      <defs>
        {/* Shiny warm gold gradient for body */}
        <linearGradient id="toonCoinBodyGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="30%" stopColor="#FFCA28" />
          <stop offset="70%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>
        
        {/* Gold text gradient */}
        <linearGradient id="toonCoinTextGrad" x1="12" y1="8" x2="12" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="50%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>
    </svg>
  );
};
