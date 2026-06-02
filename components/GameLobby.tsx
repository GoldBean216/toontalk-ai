
import React from 'react';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface GameLobbyProps {
  onBack: () => void;
  onPlayGame: (gameId: string) => void;
}

interface MiniGame {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: 'hot' | 'top' | 'new';
  rating: number;
}

const GAMES: MiniGame[] = [
  // HOT
  { id: 'mutation', name: 'Mutation Mode', icon: '🧟', color: 'bg-orange-200', category: 'hot', rating: 4.9 },

  // TOP RATED
  { id: 'chess', name: 'Chess', icon: '♟️', color: 'bg-gray-400', category: 'top', rating: 5.0 },

  // NEW ARRIVALS
  { id: 'shootout', name: 'Penalty Shootout', icon: '⚽', color: 'bg-green-200', category: 'new', rating: 4.9 },
  { id: 'snake', name: 'Multiplayer Snake', icon: '🐍', color: 'bg-yellow-200', category: 'new', rating: 4.7 }
];

export const GameLobby: React.FC<GameLobbyProps> = ({ onBack, onPlayGame }) => {
  const { t } = useLanguage();

  const handleGameClick = (gameId: string) => {
    if (['mutation', 'chess', 'shootout', 'snake'].includes(gameId)) {
      onPlayGame(gameId);
    } else {
      alert(t.comingSoon || "This game is coming soon!");
    }
  };

  const renderSection = (title: string, category: 'hot' | 'top' | 'new', icon: string) => {
    const categoryGames = GAMES.filter(g => g.category === category);
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 px-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-black text-xl uppercase tracking-wide">{title}</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
          {categoryGames.map(game => (
            <div
              key={game.id}
              className={`${game.color} border-4 border-black rounded-3xl p-4 flex flex-col items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all flex-shrink-0 w-36 h-40`}
              onClick={() => handleGameClick(game.id)}
            >
              <div className="text-5xl mt-2 drop-shadow-md">{game.icon}</div>
              <div className="text-center w-full">
                <span className="font-black text-xs uppercase leading-tight block mb-1 truncate">{game.name}</span>
                <div className="bg-black/10 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <span className="text-[10px]">⭐</span>
                  <span className="text-[10px] font-bold">{game.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-yellow-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
        <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all" aria-label={t.mapBack || "Back"}>
          ←
        </button>
        <h1 className="text-2xl font-black tracking-wider uppercase">{t.gameLobbyTitle || 'Game Lobby'}</h1>
      </div>

      <div className="p-6 pb-24">
        {/* Featured Banner */}
        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400"></div>
          <h2 className="text-3xl font-black mb-2">ARCADE ZONE</h2>
          <p className="font-bold text-gray-500 text-sm">{t.arcadeZoneBannerDesc || 'Challenge your friends or beat high scores!'}</p>
        </div>

        {renderSection(t.hotGames || 'Hot Games', 'hot', '🔥')}
        {renderSection(t.topRated || 'Top Rated', 'top', '🏆')}
        {renderSection(t.newArrivals || 'New Arrivals', 'new', '✨')}

      </div>
    </div>
  );
};
