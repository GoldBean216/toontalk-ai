
import React from 'react';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface ExploreProps {
   onOpenToonMap: () => void;
   onOpenGameLobby: () => void;
   onOpenSkillMall: () => void;
   onOpenHighNotes: () => void;
   onOpenMall: () => void;
   recentPostAvatars: string[];
   hasNewHighNotes?: boolean;
}

export const Explore: React.FC<ExploreProps> = ({
   onOpenToonMap,
   onOpenGameLobby,
   onOpenSkillMall,
   onOpenHighNotes,
   onOpenMall,
   recentPostAvatars,
   hasNewHighNotes = false
}) => {
   const { t } = useLanguage();

   return (
      <div className="flex flex-col h-full bg-pink-50 overflow-y-auto">
         <div className="bg-purple-400 border-b-4 border-black p-4 sticky top-0 z-10 shadow-md">
            <h1 className="text-3xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] tracking-wider">
               {t.exploreTitle || 'EXPLORE'}
            </h1>
         </div>

         <div className="p-4 space-y-8 pb-24 max-w-4xl mx-auto w-full">

            {/* 1. High Notes */}
            <section>
               <h2 className="text-2xl font-black mb-4">🚀 {t.highNotesBtn || 'High Notes'}</h2>
               <div className="bg-white border-4 border-black rounded-3xl p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                  {/* Decorative */}
                  <div className="absolute top-[-20px] left-[-20px] w-16 h-16 bg-yellow-300 rounded-full border-4 border-black z-0 opacity-50"></div>

                  <div className="relative z-10">
                     <div className="text-5xl mb-2">📣</div>
                     <h3 className="font-bold text-xl mb-1">{t.communityHighlights || 'Community Highlights'}</h3>
                     <p className="text-sm text-gray-600 mb-6 font-bold">
                        {t.communityHighlightsDesc || 'The best, funniest, and weirdest conversations from the ToonTalk universe.'}
                     </p>

                     {/* Dynamic Avatars of Recent Posters */}
                     {recentPostAvatars.length > 0 ? (
                        <div className="mb-4">
                           <p className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-widest">New updates from</p>
                           <div className="flex justify-center -space-x-3">
                              {recentPostAvatars.slice(0, 5).map((src, i) => (
                                 <img
                                    key={i}
                                    src={src}
                                    alt="friend"
                                    className="w-10 h-10 rounded-full border-2 border-black bg-white object-cover"
                                 />
                              ))}
                              {recentPostAvatars.length > 5 && (
                                 <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">
                                    +
                                  </div>
                              )}
                           </div>
                        </div>
                     ) : (
                        <div className="mb-4 h-10"></div> // Spacer if no posts yet
                     )}

                     <Button
                        onClick={onOpenHighNotes}
                        variant="secondary"
                        className="w-full text-sm border-2 relative"
                     >
                        {t.browseHighNotes || 'Browse High Notes'}
                        {hasNewHighNotes && (
                           <div className="absolute top-[-5px] right-[-5px] w-4 h-4 bg-red-500 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
                        )}
                     </Button>
                  </div>
               </div>
            </section>

            {/* 2. Toon world */}
            <section>
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black">{t.toonMapBtn || '🌍 Toon world'}</h2>
                  <span className="text-xs font-bold bg-black text-white px-2 py-1 rounded">LIVE</span>
               </div>

               <div
                  onClick={onOpenToonMap}
                  className="bg-white border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-purple-100 transition-colors active:translate-y-1 active:shadow-none"
               >
                  <div className="flex items-center gap-4">
                     <div className="text-5xl">🌍</div>
                     <div>
                        <h3 className="font-black text-xl">{t.exploreHq || 'Explore Headquarters'}</h3>
                        <p className="font-bold text-gray-500 text-sm">
                           {t.exploreHqDesc || 'Locate and track all summoned AI characters. Workstations, restrooms, café, and more!'}
                        </p>
                     </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                     <button className="bg-purple-500 text-white font-bold px-4 py-2 rounded-xl border-2 border-black hover:bg-purple-600">
                        {t.openMap || 'Enter world ➤'}
                     </button>
                  </div>
               </div>
            </section>

            {/* 3. Skill Mall */}
            <section>
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black">{t.skillMallBtn || '✨ Skill Mall'}</h2>
                  <span className="text-xs font-bold bg-purple-500 text-white px-2 py-1 rounded border-2 border-black">NEW</span>
               </div>

               <div
                  onClick={onOpenSkillMall}
                  className="bg-white border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-purple-100 transition-colors active:translate-y-1 active:shadow-none"
               >
                  <div className="flex items-center gap-4">
                     <div className="text-5xl">⚡</div>
                     <div>
                        <h3 className="font-black text-xl">{t.aiSkillStore || 'AI Skill Store'}</h3>
                        <p className="font-bold text-gray-500 text-sm">
                           {t.aiSkillStoreDesc || 'Supercharge your AI friends with custom capabilities. Includes MCP servers, special Skills, and advanced Workflows!'}
                        </p>
                     </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                     <button className="bg-purple-500 text-white font-bold px-4 py-2 rounded-xl border-2 border-black hover:bg-purple-600">
                        {t.browseSkills || 'Browse Skills ➤'}
                     </button>
                  </div>
               </div>
            </section>

            {/* 5. Toon Mall */}
            <section>
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black">{t.toonMallBtn || '🛍️ Toon Mall'}</h2>
               </div>

               <div
                  onClick={onOpenMall}
                  className="bg-white border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-cyan-100 transition-colors active:translate-y-1 active:shadow-none"
               >
                  <div className="flex items-center gap-4">
                     <div className="text-5xl">🛒</div>
                     <div>
                        <h3 className="font-black text-xl">{t.shopStyle || 'Shop & Style'}</h3>
                        <p className="font-bold text-gray-500 text-sm">
                           {t.shopStyleDesc || 'Food, Furniture, Accessories. Spend your TT Coins here!'}
                        </p>
                     </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                     <button className="bg-cyan-400 text-white font-bold px-4 py-2 rounded-xl border-2 border-black hover:bg-cyan-500">
                        {t.goShopping || 'Go Shopping ➤'}
                     </button>
                  </div>
               </div>
            </section>

         </div>
      </div>
   );
};
