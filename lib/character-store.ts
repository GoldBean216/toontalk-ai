import { create } from 'zustand';
import { CharacterTemplate, characterService } from './services/character-service';
import { localChatDB } from './local-db';

interface CharacterState {
  // Market / Mall
  characterMarket: CharacterTemplate[];
  isMarketLoading: boolean;
  
  // Discovered / Custom Templates (stored in IndexedDB)
  customTemplates: CharacterTemplate[];
  isTemplatesLoaded: boolean;
  
  // Actions
  loadCharacterMarket: () => Promise<void>;
  loadCustomTemplates: () => Promise<void>;
  saveCustomTemplate: (template: CharacterTemplate) => Promise<void>;
  removeCustomTemplate: (id: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characterMarket: [],
  isMarketLoading: false,
  
  customTemplates: [],
  isTemplatesLoaded: false,

  loadCharacterMarket: async () => {
    set({ isMarketLoading: true });
    try {
      const list = await characterService.getCharacterList();
      set({ characterMarket: list, isMarketLoading: false });
    } catch (e) {
      console.error("Failed to load character market", e);
      set({ isMarketLoading: false });
    }
  },

  loadCustomTemplates: async () => {
    try {
      const templates = await localChatDB.getCharacterTemplates();
      set({ customTemplates: templates, isTemplatesLoaded: true });
    } catch (e) {
      console.error("Failed to load custom templates", e);
    }
  },

  saveCustomTemplate: async (template: CharacterTemplate) => {
    await localChatDB.saveCharacterTemplate(template); 
    const current = get().customTemplates;
    set({ customTemplates: [...current.filter(t => t.id !== template.id), template] });
  },

  removeCustomTemplate: async (id: string) => {
    await localChatDB.deleteCharacterTemplate(id);
    set({ customTemplates: get().customTemplates.filter(t => t.id !== id) });
  }
}));
