import { AiBrainConfig } from '../../types';

export interface CharacterTemplate {
  id: string;
  name: string;
  species: string;
  persona: string;
  avatarUrl: string;
  color: string;
  borderColor: string;
  price: number;
  voicePreset: string;
  voiceDescription: string;
  details: string;
  customVoice?: string;
  customBrain?: AiBrainConfig;
}

export class CharacterService {
  async getCharacterList(): Promise<CharacterTemplate[]> {
    const res = await fetch('/api/characters/market');
    if (!res.ok) throw new Error('Failed to fetch character market');
    return res.json();
  }

  async getCharacterManifest(identifier: string): Promise<CharacterTemplate> {
    const res = await fetch(`/api/characters/manifest/${identifier}`);
    if (!res.ok) throw new Error(`Failed to fetch manifest for ${identifier}`);
    return res.json();
  }
}

export const characterService = new CharacterService();
