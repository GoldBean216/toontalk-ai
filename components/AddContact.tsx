import React, { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { Contact, AiBrainConfig, AiProvider } from '../types';
import { Button } from './Button';
import { GoldCoin } from './GoldCoin';
import { useLanguage } from '../lib/language-context';
import { useCharacterStore } from '../lib/character-store';
import { CharacterTemplate, characterService } from '../lib/services/character-service';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface AddContactProps {
  onBack: () => void;
  onSave: (contact: Contact) => void;
  userCoins: number;
  onDeductCoins: (amount: number) => boolean;
  contacts: Contact[];
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string; icon: string; needsKey: boolean; defaultModel: string }[] = [
  { value: 'gemini',    label: 'Gemini (Google)',           icon: '✨', needsKey: false, defaultModel: 'gemini-2.5-flash' },
  { value: 'openai',    label: 'OpenAI',                    icon: '⚡', needsKey: true,  defaultModel: 'gpt-4o' },
  { value: 'deepseek',  label: 'DeepSeek',                  icon: '🐳', needsKey: true,  defaultModel: 'deepseek-chat' },
  { value: 'anthropic', label: 'Anthropic Claude',          icon: '🧠', needsKey: true,  defaultModel: 'claude-3-5-sonnet-20241022' },
  { value: 'ollama',    label: 'Ollama (Local)',            icon: '🦙', needsKey: false, defaultModel: 'llama3.1' },
  { value: 'custom',    label: 'Custom (OpenAI Compatible)', icon: '⚙️', needsKey: true, defaultModel: '' },
];

const PRESET_AVATARS = [
  { char: '🐶', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png' },
  { char: '🐱', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' },
  { char: '🦊', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fox.png' },
  { char: '🦝', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Raccoon.png' },
  { char: '🐼', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Panda.png' },
  { char: '🦙', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Llama.png' },
  { char: '🤖', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png' },
  { char: '🦖', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/T-Rex.png' },
];

export const AddContact: React.FC<AddContactProps> = ({ onBack, onSave, userCoins, onDeductCoins, contacts }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'mall' | 'custom'>('mall');
  
  // Zustand Store
  const { customTemplates, loadCustomTemplates, saveCustomTemplate } = useCharacterStore();
  
  // SWR for Market
  const { data: marketCharacters, isLoading: isMarketLoading } = useSWR<CharacterTemplate[]>('/api/characters/market', fetcher);

  useEffect(() => {
    loadCustomTemplates();
  }, []);

  // Generate dynamic presets from current AI contacts (Discovered Species)
  const uniqueSpeciesMap = new Map<string, Contact>();
  (contacts || []).forEach(c => {
    if (!c.isGroup && c.isAi && c.species && !uniqueSpeciesMap.has(c.species)) {
      uniqueSpeciesMap.set(c.species, c);
    }
  });

  const discoveredTemplates: CharacterTemplate[] = Array.from(uniqueSpeciesMap.values())
    .map(c => ({
      id: `discovered-${c.species.replace(/\s+/g, '-').toLowerCase()}`,
      name: `${c.species} Spirit`,
      species: c.species,
      persona: c.persona || '',
      avatarUrl: c.avatarUrl,
      color: c.color || 'bg-slate-100',
      borderColor: 'border-slate-400',
      price: 0,
      voicePreset: 'classic',
      voiceDescription: 'Discovered in your world',
      details: `World discovery species: ${c.species}`,
      customBrain: c.aiBrain 
    }));

  // Final list: Market + Custom (IndexedDB) + Discovered
  const allAvailableTemplates = [
    ...(marketCharacters || []),
    ...customTemplates,
    ...discoveredTemplates
  ];

  // Remove duplicates by species (Case insensitive)
  const finalTemplates: CharacterTemplate[] = [];
  const seenSpecies = new Set<string>();
  allAvailableTemplates.forEach(tpl => {
    const key = tpl.species.toLowerCase();
    if (!seenSpecies.has(key)) {
      seenSpecies.add(key);
      finalTemplates.push(tpl);
    }
  });

  // UI States
  const [mallLoadingId, setMallLoadingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [persona, setPersona] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voicePreset, setVoicePreset] = useState<string>('classic');
  const [customVoice, setCustomVoice] = useState('');
  const [avatarMethod, setAvatarMethod] = useState<'preset' | 'upload'>('preset');
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState(PRESET_AVATARS[0].url);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brain config
  const [showBrain, setShowBrain] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  const [ttsProvider, setTtsProvider] = useState<AiProvider>('gemini');
  const [ttsModel, setTtsModel] = useState<string>('');
  const [ttsBaseUrl, setTtsBaseUrl] = useState<string>('');
  const [ttsApiKey, setTtsApiKey] = useState<string>('');
  const [showTtsApiKey, setShowTtsApiKey] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<'default' | string>('default');

  const providerInfo = PROVIDER_OPTIONS.find(p => p.value === provider)!;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePurchasePreset = async (template: CharacterTemplate) => {
    if (template.price > 0 && userCoins < template.price) {
      alert(t.insufficientCoins || "Insufficient coins!");
      return;
    }

    setMallLoadingId(template.id);
    try {
      // 1. Fetch full manifest (Lobe style)
      const manifest = await characterService.getCharacterManifest(template.id.replace('discovered-', '').replace('dynamic-', ''));
      const finalTemplate = { ...template, ...manifest };

      if (finalTemplate.price > 0) {
        onDeductCoins(finalTemplate.price);
      }

      const newContact: Contact = {
        id: `summon-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: finalTemplate.name,
        species: finalTemplate.species,
        persona: finalTemplate.persona,
        avatarUrl: finalTemplate.avatarUrl,
        color: finalTemplate.color,
        affinity: 0,
        aiBrain: finalTemplate.customBrain,
      };

      onSave(newContact);
    } catch (err) {
      // Fallback if manifest fetch fails (e.g. for dynamic ones)
      const newContact: Contact = {
        id: `summon-${Date.now()}`,
        name: template.name,
        species: template.species,
        persona: template.persona,
        avatarUrl: template.avatarUrl,
        color: template.color,
        affinity: 0,
        aiBrain: template.customBrain,
      };
      onSave(newContact);
    } finally {
      setMallLoadingId(null);
    }
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !species || !persona) return;
    setIsLoading(true);

    try {
      let avatarUrl = avatarMethod === 'upload' && customAvatarPreview ? customAvatarPreview : selectedPresetAvatar;
      
      const finalBrain: AiBrainConfig = {
        provider,
        model,
        apiBaseUrl: baseUrl || undefined,
        apiKey: apiKey || undefined,
        ttsProvider: ttsProvider !== 'gemini' ? ttsProvider : undefined,
        ttsModel: ttsModel || undefined,
        ttsBaseUrl: ttsBaseUrl || undefined,
        ttsApiKey: ttsApiKey || undefined,
        ttsVoice: ttsVoice !== 'default' ? ttsVoice : undefined
      };

      const newContact: Contact = {
        id: `custom-${Date.now()}`,
        name,
        species,
        persona,
        avatarUrl,
        color: 'bg-indigo-100',
        affinity: 0,
        aiBrain: finalBrain,
      };

      // Also save as template in IndexedDB (Lobe Style)
      await saveCustomTemplate({
        id: `custom-tpl-${Date.now()}`,
        name: `${name} Spirit`,
        species,
        persona,
        avatarUrl,
        color: 'bg-indigo-100',
        borderColor: 'border-indigo-400',
        price: 0,
        voicePreset: 'custom',
        voiceDescription: 'Custom created character',
        details: 'Manually summoned spirit',
        customBrain: finalBrain
      });

      onSave(newContact);
    } catch (e) {
      console.error(e);
      alert("Failed to create custom AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (val: AiProvider) => {
    const info = PROVIDER_OPTIONS.find(p => p.value === val)!;
    setProvider(val);
    setModel(info.defaultModel);
    setBaseUrl('');
    setApiKey('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Neobrutalist Header */}
      <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 font-black text-xl w-10 h-10 flex items-center justify-center bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 transition-all">←</button>
          <div>
            <h1 className="text-xl font-black">{t.aiSummonerTitle || 'AI SUMMONER'}</h1>
            <span className="text-xs font-bold text-gray-400">{t.aiSummonerSubtitle || 'Bring cartoon spirits to life'}</span>
          </div>
        </div>
        <div className="bg-amber-100 border-2 border-black rounded-xl px-3 py-1.5 font-black text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-1">
          <GoldCoin className="w-5 h-5" size={20} />
          <span>{userCoins} TT</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-black px-4 py-2 flex gap-4 sticky top-[72px] z-20 shadow-sm">
        <button onClick={() => setActiveTab('mall')} className={`flex-1 max-w-[200px] py-2 font-black text-sm border-2 rounded-xl transition-all ${activeTab === 'mall' ? 'bg-yellow-400 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]' : 'border-transparent text-gray-400'}`}>🏪 Mall</button>
        <button onClick={() => setActiveTab('custom')} className={`flex-1 max-w-[200px] py-2 font-black text-sm border-2 rounded-xl transition-all ${activeTab === 'custom' ? 'bg-purple-400 text-white border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]' : 'border-transparent text-gray-400'}`}>⚙️ Creator</button>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full flex-1">
        {activeTab === 'mall' ? (
          <div className="space-y-6">
            {isMarketLoading ? (
                <div className="flex flex-col items-center py-20 animate-pulse">
                    <span className="text-6xl mb-4">🧙‍♂️</span>
                    <p className="font-black text-slate-400 uppercase tracking-widest">Opening Spirit Portal...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {finalTemplates.map(tpl => {
                    const isSummoned = (contacts || []).some(c => !c.isGroup && c.isAi && c.species.toLowerCase() === tpl.species.toLowerCase());
                    return (
                        <div key={tpl.id} className="bg-white border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-y-[-2px] transition-all">
                        <div>
                            <div className="flex gap-4 items-center mb-4">
                            <div className={`w-14 h-14 ${tpl.color} border-2 border-black rounded-2xl flex items-center justify-center p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]`}>
                                <img src={tpl.avatarUrl} className="w-12 h-12 object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-sm truncate">{tpl.name}</h3>
                                <span className="bg-gray-100 text-[8px] font-black border border-black px-1.5 py-0.5 rounded text-gray-500 uppercase">{tpl.species}</span>
                            </div>
                            </div>
                            <p className="text-xs font-medium text-gray-600 mb-4 line-clamp-3 italic">"{tpl.persona}"</p>
                            <div className="bg-slate-50 border-2 border-dashed border-gray-200 p-2 rounded-xl text-[10px] mb-4">
                            <div className="font-black text-slate-400 uppercase tracking-tighter mb-1">Spirit Essence</div>
                            <p className="font-bold text-slate-600 leading-tight">{tpl.details}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t-2 border-dashed border-gray-100 pt-4 mt-auto">
                            <span className="font-black text-sm text-indigo-600 uppercase tracking-tighter">{tpl.price === 0 ? 'FREE' : `${tpl.price} TT`}</span>
                            <Button 
                                onClick={() => handlePurchasePreset(tpl)} 
                                disabled={!!mallLoadingId}
                                className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-1.5 text-xs font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-px transition-all"
                            >
                            {mallLoadingId === tpl.id ? 'Summoning...' : isSummoned ? 'Summoned ✨' : 'Summon 🔮'}
                            </Button>
                        </div>
                        </div>
                    );
                })}
                </div>
            )}
          </div>
        ) : (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl p-6 relative overflow-hidden mb-8 text-left">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-50 rounded-full border-4 border-black z-0 opacity-50"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black">{t.summonCustomSpirit || 'Summon Custom Spirit'}</h2>
                <span className="font-bold text-xs bg-green-200 px-3 py-1 rounded-full border-2 border-black">{t.costFree || 'Cost: Free'}</span>
              </div>
              <p className="text-xs font-bold text-gray-400 mb-6">{t.customSpiritDesc || 'Build a completely custom character, configure personality prompts, upload an avatar, and set voice properties!'}</p>

              <form onSubmit={handleSubmitCustom} className="space-y-6">
                
                {/* Custom Avatar Settings */}
                <div className="border-4 border-black p-4 rounded-2xl bg-slate-50 space-y-4">
                  <span className="block font-black text-sm">{t.characterPortrait || '👤 Character Portrait Avatar'}</span>
                  
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setAvatarMethod('preset')}
                      className={`flex-1 py-1.5 px-3 border-2 border-black rounded-lg font-bold text-xs transition-all ${
                        avatarMethod === 'preset' ? 'bg-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-gray-400'
                      }`}
                    >
                      {t.cutePresets || 'Cute Presets'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMethod('upload')}
                      className={`flex-1 py-1.5 px-3 border-2 border-black rounded-lg font-bold text-xs transition-all ${
                        avatarMethod === 'upload' ? 'bg-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-gray-400'
                      }`}
                    >
                      {t.uploadCustomFile || 'Upload Custom File'}
                    </button>
                  </div>

                  {avatarMethod === 'preset' ? (
                    <div className="space-y-2 text-left">
                      <p className="text-[11px] font-bold text-gray-500">{t.pickPremiumEmoji || 'Pick from our premium animated animal emojis:'}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {PRESET_AVATARS.map((av, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedPresetAvatar(av.url)}
                            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center p-1 bg-white hover:border-black transition-all ${
                              selectedPresetAvatar === av.url ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500' : 'border-gray-200'
                            }`}
                          >
                            <img src={av.url} alt={av.char} className="w-9 h-9 object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 border-2 border-black rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {customAvatarPreview ? (
                            <img src={customAvatarPreview} alt="Preview" className="w-14 h-14 object-cover" />
                          ) : (
                            <span className="text-xl">🖼️</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 border-2 border-black bg-white font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-all"
                          >
                            {t.chooseImageFile || 'Choose Image file'}
                          </button>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">{t.acceptsImageFormats || 'Accepts PNG, JPG or WebP images.'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Name & Species */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="block font-black mb-1.5 text-sm">{t.characterName || 'Character Name'}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-black rounded-xl p-3 focus:outline-none focus:ring-4 ring-yellow-300 font-bold text-sm" placeholder="e.g. Inspector Barnaby" required />
                    </div>
                    <div>
                    <label className="block font-black mb-1.5 text-sm">{t.speciesOrObject || 'Species'}</label>
                    <input type="text" value={species} onChange={e => setSpecies(e.target.value)} className="w-full border-2 border-black rounded-xl p-3 focus:outline-none focus:ring-4 ring-green-300 font-bold text-sm" placeholder="e.g. Detective Owl" required />
                    </div>
                </div>

                {/* Persona */}
                <div>
                  <label className="block font-black mb-1.5 text-sm">{t.charPersonalityPrompt || 'Personality / Prompt Setting'}</label>
                  <textarea value={persona} onChange={e => setPersona(e.target.value)} className="w-full border-2 border-black rounded-xl p-3 h-28 focus:outline-none focus:ring-4 ring-pink-300 resize-none font-medium text-sm" placeholder="How should this spirit act and talk?" required />
                </div>

                {/* Advanced Brain Toggle */}
                <div className="border-2 border-black rounded-xl overflow-hidden bg-white text-left">
                  <button type="button" onClick={() => setShowBrain(s => !s)} className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧠</span>
                      <span className="font-black text-sm">{t.advancedAiConfig || 'Advanced Brain & TTS Settings'}</span>
                    </div>
                    <span className="font-black text-sm text-gray-400">{showBrain ? '▲' : '▼'}</span>
                  </button>

                  {showBrain && (
                    <div className="p-4 border-t-2 border-black space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block font-black text-xs">AI Provider</label>
                                <select value={provider} onChange={(e) => handleProviderChange(e.target.value as AiProvider)} className="w-full border-2 border-black rounded-lg p-2 text-xs font-bold">
                                    {PROVIDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block font-black text-xs">Model Name</label>
                                <input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full border-2 border-black rounded-lg p-2 text-xs font-bold" placeholder={providerInfo.defaultModel} />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block font-black text-xs">TTS Voice</label>
                            <select value={voicePreset} onChange={e => setVoicePreset(e.target.value)} className="w-full border-2 border-black rounded-lg p-2 text-xs font-bold">
                                <option value="classic">Standard</option>
                                <option value="deep">Deep</option>
                                <option value="squeaky">Squeaky</option>
                                <option value="robotic">Robotic</option>
                                <option value="whispery">Whispery</option>
                            </select>
                        </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button type="submit" fullWidth disabled={isLoading} variant="primary" className="text-lg py-4 font-black shadow-[6px_6px_0px_black] active:translate-y-1 active:shadow-none transition-all">
                    {isLoading ? 'CREATING MAGIC... ✨' : 'SUMMON SPIRIT 🪄'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
