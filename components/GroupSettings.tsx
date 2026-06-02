
import React, { useState } from 'react';
import { Contact, UserProfile } from '../types';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface GroupSettingsProps {
  group: Contact;
  currentUser: UserProfile;
  allContacts: Contact[];
  onRename: (newName: string) => void;
  onAddMember: (contactId: string) => void;
  onRemoveMember: (contactId: string) => void;
  onLeaveGroup: () => void;
  onClose: () => void;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({
  group,
  currentUser,
  allContacts,
  onRename,
  onAddMember,
  onRemoveMember,
  onLeaveGroup,
  onClose
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState(group.name);
  const [isAdding, setIsAdding] = useState(false);

  const isCreator = group.creatorId === currentUser.id;
  const memberIds = group.members || [];
  
  // Contacts not in group
  const availableContacts = allContacts.filter(
    c => !c.isGroup && !memberIds.includes(c.id) && c.id !== currentUser.id
  );

  const handleNameSave = () => {
    if (name.trim() !== group.name) {
      onRename(name);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b-4 border-black flex justify-between items-center bg-yellow-300 rounded-t-2xl">
          <h2 className="font-black text-xl">{t.groupSettingsTitle || 'Group Settings'}</h2>
          <button onClick={onClose} className="font-bold text-lg hover:bg-white/50 rounded px-2">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Rename Section */}
          <div className="mb-6">
            <label className="block font-black mb-2">{t.groupName || 'Group Name'}</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 border-4 border-black rounded-xl p-2 font-bold focus:outline-none focus:ring-4 ring-blue-200"
              />
              <Button onClick={handleNameSave} disabled={name === group.name} className="py-2">{t.save || 'Save'}</Button>
            </div>
          </div>

          {/* Members Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block font-black">{t.membersTitle || 'Members'} ({memberIds.length})</label>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="text-xs font-bold bg-green-400 text-white px-2 py-1 rounded-lg border-2 border-black hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5"
              >
                {isAdding ? (t.doneBtn || 'Done') : (t.addBtn || '+ Add')}
              </button>
            </div>

            {isAdding && (
              <div className="bg-green-50 border-4 border-black rounded-xl p-2 mb-4 max-h-40 overflow-y-auto">
                 {availableContacts.length === 0 ? (
                   <p className="text-center font-bold text-gray-400 text-sm py-2">{t.noFriendsToAdd || 'No friends to add!'}</p>
                 ) : (
                   availableContacts.map(c => (
                     <div key={c.id} className="flex items-center justify-between p-2 hover:bg-green-100 rounded-lg">
                       <div className="flex items-center gap-2">
                         <img src={c.avatarUrl} className="w-8 h-8 rounded-full border-2 border-black" />
                         <span className="font-bold text-sm">{c.name}</span>
                       </div>
                       <button 
                        onClick={() => onAddMember(c.id)}
                        className="font-bold text-green-600 hover:underline text-xs"
                       >
                         {t.addUpper || 'ADD'}
                       </button>
                     </div>
                   ))
                 )}
              </div>
            )}

            <div className="space-y-2">
              {/* Current User */}
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border-2 border-gray-200">
                 <div className="flex items-center gap-3">
                   <img src={currentUser.avatarUrl} className="w-10 h-10 rounded-full border-2 border-black" />
                   <div>
                     <p className="font-bold text-sm">{t.youText || 'You'}</p>
                     {group.creatorId === currentUser.id && <span className="text-[10px] bg-yellow-300 px-1 rounded border border-black font-bold">{t.ownerBadge || 'OWNER'}</span>}
                   </div>
                 </div>
              </div>

              {/* Other Members */}
              {memberIds.filter(id => id !== currentUser.id).map(id => {
                 const contact = allContacts.find(c => c.id === id);
                 if (!contact) return null;
                 return (
                   <div key={id} className="flex items-center justify-between bg-white p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center gap-3">
                        <img src={contact.avatarUrl} className="w-10 h-10 rounded-full border-2 border-black" />
                        <div>
                          <p className="font-bold text-sm">{contact.name}</p>
                          {group.creatorId === contact.id && <span className="text-[10px] bg-yellow-300 px-1 rounded border border-black font-bold">{t.ownerBadge || 'OWNER'}</span>}
                        </div>
                      </div>
                      
                      {isCreator && (
                        <button 
                          onClick={() => onRemoveMember(id)}
                          className="bg-red-100 p-1 rounded-lg border-2 border-transparent hover:border-red-500 text-red-500 font-bold text-xs"
                          title={t.kickBtn || "Kick"}
                        >
                          {t.kickBtn || 'Kick'}
                        </button>
                      )}
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-black bg-gray-50 rounded-b-2xl">
           <Button variant="danger" fullWidth onClick={onLeaveGroup}>
             {t.leaveGroup || 'Leave Group'}
           </Button>
        </div>

      </div>
    </div>
  );
};
