import React from 'react';
import { TabView } from '../types';
import { useLanguage } from '../lib/language-context';

interface BottomNavProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  className?: string;
  hasNotifications?: boolean;
  hasUnreadChats?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, className = '', hasNotifications = false, hasUnreadChats = false }) => {
  const { t } = useLanguage();

  const tabs: { id: TabView; label: string; icon: string }[] = [
    { id: 'chats', label: t.navChats || 'Chats', icon: '💬' },
    { id: 'contacts', label: t.navContacts || 'Contacts', icon: '📒' },
    { id: 'explore', label: t.navExplore || 'Explore', icon: '🧭' },
    { id: 'profile', label: t.navMe || 'Me', icon: '👤' },
  ];

  return (
    <div className={`
      bg-white border-black z-30 transition-all
      
      /* Mobile: Bottom Bar */
      border-t-4 h-20 w-full flex flex-row justify-around items-center px-2 pb-2
      
      /* Desktop: Left Vertical Sidebar */
      md:flex-col md:h-full md:w-24 md:border-t-0 md:border-r-4 md:justify-start md:pt-8 md:gap-6 md:pb-0
      
      ${className}
    `}>
      {/* Desktop Logo Placeholder */}
      <div className="hidden md:flex flex-col items-center mb-4">
        <div className="w-12 h-12 bg-green-400 rounded-full border-4 border-black mb-2 flex items-center justify-center text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          T
        </div>
      </div>

      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const showRedDot = (tab.id === 'notifications' && hasNotifications) || (tab.id === 'chats' && hasUnreadChats);

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex flex-col items-center justify-center transition-all outline-none
              md:w-full md:py-2
              ${isActive ? 'text-blue-500 -translate-y-2 md:translate-x-1 md:-translate-y-0' : 'text-gray-400 hover:text-gray-800'}
            `}
          >
            <div className={`
              text-2xl mb-1 transition-all border-2 rounded-xl p-2 relative
              ${isActive ? 'bg-blue-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-transparent'}
            `}>
              {tab.icon}
              {showRedDot && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
              )}
            </div>
            <span className={`text-xs font-black tracking-wide ${isActive ? 'text-black' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};