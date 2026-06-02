import { AiSkill } from '../ai-skills';

export class ToolService {
  async getPluginList(): Promise<AiSkill[]> {
    const res = await fetch('/api/skills/market');
    if (!res.ok) throw new Error('Failed to fetch skill market');
    return res.json();
  }

  async getPluginManifest(identifier: string): Promise<AiSkill> {
    const res = await fetch(`/api/skills/manifest/${identifier}`);
    if (!res.ok) throw new Error(`Failed to fetch manifest for ${identifier}`);
    return res.json();
  }
}

export const toolService = new ToolService();
