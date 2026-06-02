
import React, { useState } from 'react';
import { Contact } from '../types';
import { Button } from './Button';

interface GroupSelectProps {
  contacts: Contact[];
  onBack: () => void;
  onCreateGroup: (name: string, selectedIds: string[]) => void;
}

export const GroupSelect: React.FC<GroupSelectProps> = ({ contacts, onBack, onCreateGroup }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter out existing groups from the selection list
  const eligibleContacts = contacts.filter(c => !c.isGroup);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    onCreateGroup(groupName, selectedIds);
  };

  return (
    <div className="flex flex-col h-full bg-yellow-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
        <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
          ←
        </button>
        <h1 className="text-2xl font-black tracking-wider">NEW GROUP</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        
        {/* Group Name Input */}
        <div className="bg-white border-4 border-black rounded-3xl p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
           <label className="block font-black mb-2 text-lg">Group Name</label>
           <input 
              type="text" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border-4 border-black rounded-xl p-3 focus:outline-none focus:ring-4 ring-pink-300 font-bold"
              placeholder="e.g. The Chaos Club"
           />
        </div>

        <h2 className="font-black text-xl mb-4 px-2">Select Members ({selectedIds.length})</h2>

        <div className="space-y-3 pb-24">
            {eligibleContacts.map(contact => {
                const isSelected = selectedIds.includes(contact.id);
                return (
                    <div 
                        key={contact.id}
                        onClick={() => toggleSelection(contact.id)}
                        className={`
                            border-4 rounded-2xl p-3 flex items-center gap-4 cursor-pointer transition-all select-none
                            ${isSelected 
                                ? 'bg-blue-100 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1' 
                                : 'bg-white border-gray-200 hover:border-black opacity-80 hover:opacity-100'
                            }
                        `}
                    >
                        <div className={`
                            w-8 h-8 rounded-full border-4 border-black flex items-center justify-center transition-colors
                            ${isSelected ? 'bg-blue-500 text-white' : 'bg-white'}
                        `}>
                            {isSelected && '✓'}
                        </div>
                        
                        <img 
                            src={contact.avatarUrl} 
                            alt={contact.name} 
                            className="w-14 h-14 rounded-full border-2 border-black bg-gray-200 object-cover" 
                        />
                        
                        <div>
                            <h3 className="font-bold text-lg">{contact.name}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase">{contact.species}</p>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 left-0 right-0 px-6 max-w-2xl mx-auto">
          <Button 
            onClick={handleCreate} 
            fullWidth 
            disabled={!groupName.trim() || selectedIds.length === 0}
            className="text-xl py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          >
            Create Group ({selectedIds.length})
          </Button>
      </div>
    </div>
  );
};
