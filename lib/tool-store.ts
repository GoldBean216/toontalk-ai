import { create } from 'zustand';
import { AiSkill } from './ai-skills';
import { toolService } from './services/tool-service';
import { pluginService } from './services/plugin-service';

interface ToolState {
  // Plugin Market / Store
  pluginStore: AiSkill[];
  isStoreLoading: boolean;
  
  // Installed Plugins
  installedSkills: AiSkill[];
  isInstalledLoaded: boolean;
  
  // Actions
  loadPluginStore: () => Promise<void>;
  installPlugin: (identifier: string) => Promise<void>;
  uninstallPlugin: (identifier: string) => Promise<void>;
  loadInstalledPlugins: () => Promise<void>;
}

export const useToolStore = create<ToolState>((set, get) => ({
  pluginStore: [],
  isStoreLoading: false,
  
  installedSkills: [],
  isInstalledLoaded: false,

  loadPluginStore: async () => {
    set({ isStoreLoading: true });
    try {
      const list = await toolService.getPluginList();
      set({ pluginStore: list, isStoreLoading: false });
    } catch (e) {
      console.error("Failed to load plugin store", e);
      set({ isStoreLoading: false });
    }
  },

  installPlugin: async (identifier: string) => {
    try {
      // 1. Fetch manifest
      const manifest = await toolService.getPluginManifest(identifier);
      
      // 2. Install to local DB
      await pluginService.installPlugin(identifier, manifest);
      
      // 3. Refresh local state
      const installed = await pluginService.getInstalledPlugins();
      set({ installedSkills: installed });
    } catch (e) {
      console.error(`Failed to install plugin: ${identifier}`, e);
    }
  },

  uninstallPlugin: async (identifier: string) => {
    try {
      await pluginService.uninstallPlugin(identifier);
      set({ 
        installedSkills: get().installedSkills.filter(s => s.id !== identifier) 
      });
    } catch (e) {
      console.error(`Failed to uninstall plugin: ${identifier}`, e);
    }
  },

  loadInstalledPlugins: async () => {
    try {
      const skills = await pluginService.getInstalledPlugins();
      set({ installedSkills: skills, isInstalledLoaded: true });
    } catch (e) {
      console.error("Failed to load installed plugins", e);
    }
  }
}));
