import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types';
import { Button } from './Button';

interface FindContactProps {
  onBack: () => void;
  onSendRequest: (contact: Contact) => void;
  currentUserId: string;
}

export const FindContact: React.FC<FindContactProps> = ({ onBack, onSendRequest, currentUserId }) => {
  const [view, setView] = useState<'search' | 'result'>('search');
  const [searchId, setSearchId] = useState('');
  const [foundProfile, setFoundProfile] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  // Real Database Search
  const performSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', searchId)
        .single();

      if (error || !data) {
        alert("User not found. Please check the ID.");
        setLoading(false);
        return;
      }

      const friend: Contact = {
        id: data.id,
        name: data.nickname || 'Unknown User',
        avatarUrl: data.avatar_url || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png',
        species: 'Human', // Default for Humans
        persona: data.bio || 'New ToonTalk User',
        color: 'bg-blue-200',
        affinity: 0
      };

      setFoundProfile(friend);
      setView('result');

    } catch (e) {
      console.error("Search failed:", e);
      alert("An error occurred while searching.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = () => {
    if (foundProfile) {
      onSendRequest(foundProfile);
    }
  };

  const isSelf = foundProfile?.id === currentUserId;

  return (
    <div className="flex flex-col h-full bg-yellow-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
        <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
          ←
        </button>
        <h1 className="text-2xl font-black tracking-wider">ADD FRIEND</h1>
      </div>

      <div className="p-6 max-w-md mx-auto w-full flex-1">

        {view === 'search' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Search Section */}
            <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-black mb-4">🔎 Search ID</h2>
              <p className="text-sm font-bold text-gray-400 mb-4">Enter user ID to find friends.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter Toon ID..."
                  className="flex-1 border-4 border-black rounded-xl p-3 focus:outline-none focus:ring-4 ring-yellow-300 font-bold"
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                />
                <button
                  onClick={performSearch}
                  disabled={loading}
                  className="bg-blue-400 border-4 border-black rounded-xl px-4 font-bold text-white hover:bg-blue-500 active:translate-y-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? '...' : 'GO'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && foundProfile && (
          <div className="animate-popIn">
            <div className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="h-32 bg-blue-400 border-b-4 border-black relative">
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                  <img
                    src={foundProfile.avatarUrl}
                    className="w-32 h-32 rounded-full border-4 border-black bg-white object-cover"
                    alt={foundProfile.name}
                  />
                </div>
              </div>

              <div className="pt-20 pb-8 px-6 text-center space-y-4">
                <div>
                  <h2 className="text-3xl font-black">{foundProfile.name}</h2>
                  <p className="font-mono text-gray-500 font-bold text-xs mt-1">ID: {foundProfile.id}</p>
                </div>

                <div className="flex justify-center gap-2">
                  <span className="bg-gray-100 border-2 border-black px-3 py-1 rounded-full font-bold text-xs uppercase">
                    {foundProfile.species}
                  </span>
                </div>

                <div className="bg-yellow-50 border-2 border-black rounded-xl p-4 text-sm font-bold text-gray-600 italic">
                  "{foundProfile.persona}"
                </div>

                <div className="pt-4">
                  {isSelf ? (
                    <div className="bg-gray-200 border-4 border-gray-400 rounded-xl p-4 font-bold text-gray-500">
                      This is you!
                    </div>
                  ) : (
                    <Button onClick={handleSendRequest} fullWidth className="text-xl bg-blue-400 hover:bg-blue-500">
                      Send Friend Request
                    </Button>
                  )}

                  <button
                    onClick={() => { setView('search'); setSearchId(''); setFoundProfile(null); }}
                    className="mt-4 text-gray-500 font-bold hover:underline"
                  >
                    Search Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
