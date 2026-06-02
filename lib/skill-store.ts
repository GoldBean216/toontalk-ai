import { create } from 'zustand';
import { AiSkill } from './ai-skills';
import { localChatDB } from './local-db';

interface SkillState {
  installedSkills: AiSkill[];
  isLoaded: boolean;
  
  // Actions
  loadInstalledSkills: () => Promise<void>;
  installSkill: (skill: AiSkill) => Promise<void>;
  uninstallSkill: (skillId: string) => Promise<void>;
  updateSkill: (skill: AiSkill) => Promise<void>;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  installedSkills: [],
  isLoaded: false,

  loadInstalledSkills: async () => {
    try {
      const { PRESET_SKILLS } = await import('./ai-skills');
      const skills = await localChatDB.getInstalledSkills();
      const validSkills: any[] = [];
      for (const s of skills) {
        const preset = PRESET_SKILLS.find(p => p.id === s.id);
        if (preset) {
          validSkills.push({
            ...preset,
            config: s.config
          });
        } else {
          await localChatDB.deleteSkill(s.id);
        }
      }
      set({ installedSkills: validSkills, isLoaded: true });
    } catch (e) {
      console.error("Failed to load skills from IndexedDB", e);
    }
  },

  installSkill: async (skill: AiSkill) => {
    const { installedSkills } = get();
    if (installedSkills.find(s => s.id === skill.id)) return;
    
    await localChatDB.saveSkill(skill);
    set({ installedSkills: [...installedSkills, skill] });
  },

  uninstallSkill: async (skillId: string) => {
    await localChatDB.deleteSkill(skillId);
    set({ 
      installedSkills: get().installedSkills.filter(s => s.id !== skillId) 
    });
  },

  updateSkill: async (skill: AiSkill) => {
    await localChatDB.saveSkill(skill);
    set({
      installedSkills: get().installedSkills.map(s => s.id === skill.id ? skill : s)
    });
  }
}));
