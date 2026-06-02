
import React, { useState, useRef } from 'react';
import { Contact, Message } from '../types';
import { Button } from './Button';
import { AvatarGrid } from './AvatarGrid';

export type ChatSubTab = 'all' | 'unread' | 'groups';

interface ChatListProps {
  contacts: Contact[];
  allContactsLookup?: Contact[]; // Needed for avatar grid
  userAvatarUrl?: string; // Needed for avatar grid
  onSelectContact: (contact: Contact) => void;
  onLongPress?: (contactId: string) => void;
  title: string;
  headerColor?: string;
  actionButton?: React.ReactNode;
  actionLabel?: string; 
  modalTitle?: string;
  modalDescription?: string;
  
  // New props for Sorting and UI
  lastMessages?: Record<string, Message>;
  unreadStatus?: Record<string, boolean>;

  // Sub Navigation Props
  subTab?: ChatSubTab;
  onSubTabChange?: (tab: ChatSubTab) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ 
  contacts, 
  allContactsLookup = [],
  userAvatarUrl = "",
  onSelectContact, 
  onLongPress,
  title, 
  headerColor = "bg-green-400",
  actionButton,
  actionLabel = "Delete",
  modalTitle = "Delete Item?",
  modalDescription = "Are you sure you want to do this?",
  lastMessages = {},
  unreadStatus = {},
  subTab,
  onSubTabChange
}) => {
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Filter Contacts based on SubTab
  const filteredContacts = contacts.filter(contact => {
    if (!subTab || subTab === 'all') return true;
    if (subTab === 'unread') return unreadStatus[contact.id];
    if (subTab === 'groups') return contact.isGroup;
    return true;
  });

  // Sorting Logic: 
  // 1. Contacts with messages come first, sorted by timestamp (newest first).
  // 2. Contacts without messages come last, sorted by ID (creation time roughly).
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    const msgA = lastMessages[a.id];
    const msgB = lastMessages[b.id];
    const timeA = msgA ? msgA.timestamp : 0;
    const timeB = msgB ? msgB.timestamp : 0;
    
    if (timeA === 0 && timeB === 0) return 0; // Keep original order if no messages
    return timeB - timeA; // Descending
  });

  const handlePressStart = (contact: Contact) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        if (onLongPress) {
            setContactToDelete(contact);
            if (navigator.vibrate) navigator.vibrate(50);
        }
    }, 600);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  const handleClick = (contact: Contact) => {
    if (isLongPress.current) {
        return;
    }
    onSelectContact(contact);
  };

  const confirmAction = () => {
    if (contactToDelete && onLongPress) {
        onLongPress(contactToDelete.id);
        setContactToDelete(null);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-yellow-50 relative">
      {/* Header - Fixed Height for Uniformity */}
      <div className={`${headerColor} border-b-4 border-black p-4 flex justify-between items-center shadow-md z-20`}>
        <h1 className="text-3xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] tracking-wider uppercase">
          {title}
        </h1>
        {actionButton && (
          <div>
              {actionButton}
          </div>
        )}
      </div>
      
      {/* Sub Navigation Bar - Separated to keep Header size consistent */}
      {/* Removed border-b-4 border-black to remove the line below */}
      {onSubTabChange && subTab && (
          <div className="bg-yellow-50 p-2 z-10 relative">
              <div className="flex bg-white/50 p-1 rounded-xl gap-1 border-2 border-black/10">
                  {(['all', 'unread', 'groups'] as const).map((tab) => (
                      <button
                          key={tab}
                          onClick={() => onSubTabChange(tab)}
                          className={`
                              flex-1 py-1 px-3 rounded-lg font-bold text-sm transition-all border-2
                              ${subTab === tab 
                                  ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                                  : 'bg-transparent border-transparent text-gray-500 hover:bg-white/50'
                              }
                          `}
                      >
                          {tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Groups'}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedContacts.length === 0 ? (
          <div className="text-center mt-20 opacity-50">
            <p className="text-xl font-bold">
                {subTab === 'unread' ? 'No unread messages' : subTab === 'groups' ? 'No active groups' : 'No items found!'}
            </p>
            {subTab === 'all' && <p>Try adding a new friend.</p>}
          </div>
        ) : (
          sortedContacts.map((contact) => {
            const lastMsg = lastMessages[contact.id];
            const hasUnread = unreadStatus[contact.id];

            return (
              <div 
                key={contact.id}
                onMouseDown={() => handlePressStart(contact)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(contact)}
                onTouchEnd={handlePressEnd}
                onClick={() => handleClick(contact)}
                className="bg-white border-4 border-black rounded-3xl p-3 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none select-none"
              >
                <div className="relative">
                  {contact.isGroup && (contact.members?.length || 0) > 0 ? (
                    <AvatarGrid 
                        memberIds={contact.members || []} 
                        allContacts={allContactsLookup} 
                        userAvatarUrl={userAvatarUrl}
                        className="w-16 h-16"
                    />
                  ) : (
                    <img 
                        src={contact.avatarUrl} 
                        alt={contact.name} 
                        className="w-16 h-16 rounded-full border-2 border-black object-cover bg-gray-200"
                    />
                  )}
                  
                  {hasUnread && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-black animate-bounce z-10" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-lg truncate text-black">{contact.name}</h3>
                    {lastMsg ? (
                        <span className="text-xs font-bold text-gray-400 whitespace-nowrap ml-2">{formatTime(lastMsg.timestamp)}</span>
                    ) : (
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">{contact.species}</span>
                    )}
                  </div>
                  
                  {lastMsg ? (
                    <p className={`text-sm truncate ${hasUnread ? 'font-black text-black' : 'text-gray-500 font-medium'}`}>
                        {lastMsg.senderId === 'user' ? `You: ${lastMsg.text}` : (lastMsg.isAudio ? `🔊 ${lastMsg.rawSound}` : lastMsg.text)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 truncate italic">Start a conversation...</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {contactToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white border-4 border-black rounded-3xl p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-black mb-2">{modalTitle}</h3>
                <p className="font-bold text-gray-500 mb-6">
                    {modalDescription} <span className="text-black">{contactToDelete.name}</span>?
                </p>
                <div className="flex flex-col gap-3">
                    <Button variant="danger" onClick={confirmAction} fullWidth>{actionLabel}</Button>
                    <Button variant="secondary" onClick={() => setContactToDelete(null)} fullWidth>Cancel</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
