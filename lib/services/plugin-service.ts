import { localChatDB } from '../local-db';
import { AiSkill } from '../ai-skills';

export class PluginService {
  async installPlugin(identifier: string, manifest: AiSkill): Promise<void> {
    // In Lobe Chat, this might involve more complex logic in PluginModel.create()
    // Here we wrap our IndexedDB logic
    await localChatDB.saveSkill({ ...manifest, id: identifier });
  }

  async getInstalledPlugins(): Promise<AiSkill[]> {
    return localChatDB.getInstalledSkills();
  }

  async uninstallPlugin(identifier: string): Promise<void> {
    await localChatDB.deleteSkill(identifier);
  }
}

export const pluginService = new PluginService();
