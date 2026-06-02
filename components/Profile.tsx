import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Post, AiBrainConfig, AiProvider, Contact } from '../types';
import { Button } from './Button';
import { useLanguage, LanguageCode } from '../lib/language-context';
import { getEnergyStatus, ENERGY_CONFIG } from '../lib/energy-manager';
import { PRESET_SKILLS, AiSkill } from '../lib/ai-skills';
import { useSkillStore } from '../lib/skill-store';


interface ProfileProps {
  user: UserProfile;
  posts: Post[];
  contacts: Contact[];
  onOpenSubscription: () => void;
  onCheckIn: () => void;
  onOpenMyItems: () => void;
  onOpenMyHighNotes: () => void;
  onLikePost: (postId: string) => void;
  onDislikePost: (postId: string) => void;
  onCommentPost: (postId: string, text: string) => void;
  onLikeComment: (postId: string, commentId: string) => void;
  onLogout: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  chatSoundEnabled: boolean;
  onToggleChatSound: () => void;
  globalAiBrain: AiBrainConfig | null;
  onSaveGlobalAiBrain: (config: AiBrainConfig) => void;
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string; icon: string; needsKey: boolean; defaultModel: string }[] = [
  { value: 'gemini',    label: 'Gemini (Google)',           icon: '✨', needsKey: false, defaultModel: 'gemini-2.5-flash' },
  { value: 'openai',    label: 'OpenAI',                    icon: '⚡', needsKey: true,  defaultModel: 'gpt-4o' },
  { value: 'deepseek',  label: 'DeepSeek',                  icon: '🐳', needsKey: true,  defaultModel: 'deepseek-chat' },
  { value: 'anthropic', label: 'Anthropic Claude',          icon: '🧠', needsKey: true,  defaultModel: 'claude-3-5-sonnet-20241022' },
  { value: 'ollama',    label: 'Ollama (Local)',            icon: '🦙', needsKey: false, defaultModel: 'llama3.1' },
  { value: 'custom',    label: 'Custom (OpenAI Compatible)', icon: '⚙️', needsKey: true, defaultModel: '' },
];

export const Profile: React.FC<ProfileProps> = ({
  user,
  posts,
  contacts,
  onOpenSubscription,
  onCheckIn,
  onOpenMyItems,
  onOpenMyHighNotes,
  onLikePost,
  onDislikePost,
  onCommentPost,
  onLikeComment,
  onLogout,
  onUpdateProfile,
  chatSoundEnabled,
  onToggleChatSound,
  globalAiBrain,
  onSaveGlobalAiBrain
}) => {
  const { t, language, setLanguage } = useLanguage();
  const { installedSkills, loadInstalledSkills, uninstallSkill } = useSkillStore();

  useEffect(() => {
    loadInstalledSkills();
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user.nickname);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showMySkillsModal, setShowMySkillsModal] = useState(false);


  // AI Provider Configuration States
  const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);

  // Cognitive Mode
  const [cognitiveMode, setCognitiveMode] = useState<'standard' | 'big_little'>('standard');
  const [littleBrainProvider, setLittleBrainProvider] = useState<AiProvider>('gemini');
  const [littleBrainModel, setLittleBrainModel] = useState<string>('gemini-2.5-flash');
  const [littleBrainApiKey, setLittleBrainApiKey] = useState<string>('');
  const [littleBrainBaseUrl, setLittleBrainBaseUrl] = useState<string>('');
  const [showLittleKey, setShowLittleKey] = useState(false);
  const [difficultyThreshold, setDifficultyThreshold] = useState<number>(50);

  const [isSaving, setIsSaving] = useState(false);

  // Global Skills
  const [globalSkills, setGlobalSkills] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // World Config
  const [mapConfig, setMapConfig] = useState<any>(null);
  const [isSavingWorld, setIsSavingWorld] = useState(false);

  // Test Connection States
  const [isTestingMain, setIsTestingMain] = useState(false);
  const [testResultMain, setTestResultMain] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingLittle, setIsTestingLittle] = useState(false);
  const [testResultLittle, setTestResultLittle] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async (
    targetProvider: string,
    targetModel: string,
    targetApiKey: string,
    targetBaseUrl: string,
    type: 'main' | 'little'
  ) => {
    const setTesting = type === 'main' ? setIsTestingMain : setIsTestingLittle;
    const setResult = type === 'main' ? setTestResultMain : setTestResultLittle;

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          model: targetModel,
          apiKey: targetApiKey,
          apiBaseUrl: targetBaseUrl
        })
      });

      const data = await response.json();
      if (response.ok && !data.error) {
        setResult({ success: true, message: t.connectionSuccess || 'Connection successful!' });
      } else {
        const errMsg = data.error || 'Connection failed';
        setResult({ success: false, message: `${t.connectionFailed || 'Failed: '}${errMsg}` });
      }
    } catch (err: any) {
      setResult({ success: false, message: `${t.connectionFailed || 'Failed: '}${err.message || 'Network error'}` });
    } finally {
      setTesting(false);
    }
  };

  const resetStates = useCallback(() => {
    const brain = globalAiBrain;
    setProvider(brain?.provider || 'gemini');
    setModel(brain?.model || 'gemini-2.5-flash');
    setBaseUrl(brain?.apiBaseUrl || '');
    setApiKey(brain?.apiKey || '');
    setCognitiveMode(brain?.cognitiveMode || 'standard');
    setLittleBrainProvider(brain?.littleBrainProvider || 'gemini');
    setLittleBrainModel(brain?.littleBrainModel || 'gemini-2.5-flash');
    setLittleBrainApiKey(brain?.littleBrainApiKey || '');
    setLittleBrainBaseUrl(brain?.littleBrainBaseUrl || '');
    setDifficultyThreshold(brain?.difficultyThreshold ?? 50);
    setGlobalSkills(brain?.skills || []);
    setTestResultMain(null);
    setTestResultLittle(null);
  }, [globalAiBrain, t.connectionSuccess, t.connectionFailed]);

  useEffect(() => {
    resetStates();
  }, [globalAiBrain, resetStates]);

  useEffect(() => {
    if (!mapConfig) {
      fetch('/api/map-config')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setMapConfig(data);
        })
        .catch(err => console.error('Failed to fetch map config:', err));
    }
  }, []);

  const handleSaveGlobalAi = () => {
    setIsSaving(true);
    const skillConfigs: Record<string, any> = {};
    installedSkills.forEach(s => {
      if (s.config) {
        skillConfigs[s.id] = s.config;
      }
    });

    const updatedBrain: AiBrainConfig = {
      provider,
      model,
      apiBaseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      cognitiveMode,
      littleBrainProvider: cognitiveMode === 'big_little' ? littleBrainProvider : undefined,
      littleBrainModel: cognitiveMode === 'big_little' ? littleBrainModel : undefined,
      littleBrainApiKey: cognitiveMode === 'big_little' && littleBrainApiKey ? littleBrainApiKey : undefined,
      littleBrainBaseUrl: cognitiveMode === 'big_little' && littleBrainBaseUrl ? littleBrainBaseUrl : undefined,
      difficultyThreshold: cognitiveMode === 'big_little' ? difficultyThreshold : undefined,
      skills: globalSkills,
      skillConfigs: Object.keys(skillConfigs).length > 0 ? skillConfigs : undefined
    };

    try {
      onSaveGlobalAiBrain(updatedBrain);
      alert("✨ " + (t.saveSuccess || "AI Configuration saved successfully!"));
      setShowAiSettingsModal(false);
    } catch (error) {
      console.error(error);
      alert("❌ " + (t.saveFailed || "Failed to save configuration."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWorldConfig = async () => {
    if (!mapConfig) return;
    setIsSavingWorld(true);
    try {
      const response = await fetch('/api/map-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapConfig)
      });
      if (response.ok) {
        alert("🌍 " + (t.saveSuccess || "World configuration saved!"));
      } else {
        alert("❌ " + (t.saveFailed || "Failed to save world configuration."));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Network error.");
    } finally {
      setIsSavingWorld(false);
    }
  };

  const handleUpdateBuildingFunction = (buildingId: string, functionId: string, updates: any) => {
    if (!mapConfig) return;
    const newBuildings = mapConfig.buildings.map((b: any) => {
      if (b.id !== buildingId) return b;
      const newFunctions = b.functions?.map((f: any) => {
        if (f.id !== functionId) return f;
        return { ...f, ...updates };
      });
      return { ...b, functions: newFunctions };
    });
    setMapConfig({ ...mapConfig, buildings: newBuildings });
  };

  const handleImportSkill = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const skill = JSON.parse(event.target?.result as string) as AiSkill;
        // Basic validation
        if (skill.id && skill.name && skill.handlerPrompt) {
          await useSkillStore.getState().installSkill(skill);
          alert("✨ " + (t.importSuccess || `Successfully imported skill: ${skill.name}`));
        } else {
          alert("❌ " + (t.invalidFormat || "Invalid skill format. Missing required fields."));
        }
      } catch (err) {
        alert("❌ " + (t.importFailed || "Failed to parse skill file."));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  // Filter posts for current user to show count
  const myPostsCount = posts.filter(p => p.authorId === user.id).length;

  const isCheckInAvailable = () => {
    const today = new Date().toISOString().split('T')[0];
    return user.lastCheckInDate !== today;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-blue-100 text-blue-600 border-blue-400';
      case 'premium_plus': return 'bg-purple-100 text-purple-600 border-purple-400';
      default: return 'bg-gray-100 text-gray-600 border-gray-400';
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'premium': return 'Premium';
      case 'premium_plus': return 'Premium+';
      default: return 'Free';
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onUpdateProfile({ nickname: editName });
    }
    setIsEditingName(false);
  };

  const handleToggleGlobalSkill = (skillId: string) => {
    if (globalSkills.includes(skillId)) {
      setGlobalSkills(prev => prev.filter(id => id !== skillId));
    } else {
      if (globalSkills.length >= 3) {
        alert(`${t.selectUpTo || 'Select up to'} 3 ${t.skillsSuffix || 'skills'}!`);
        return;
      }
      setGlobalSkills(prev => [...prev, skillId]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-blue-50 overflow-y-auto relative">
      <div className="bg-yellow-400 border-b-4 border-black p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-3xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] tracking-wider uppercase">
          Profile
        </h1>
      </div>

      <div className="p-6 flex flex-col items-center pb-24 max-w-3xl mx-auto w-full">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full border-4 border-black bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <img
              src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png"
              alt="Profile"
              className="w-28 h-28 object-contain"
            />
          </div>
          <button className="absolute bottom-0 right-0 bg-white border-2 border-black p-2 rounded-full hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ✏️
          </button>
        </div>

        {isEditingName ? (
          <div className="flex flex-col items-center gap-2 mb-2 w-full max-w-xs animate-fadeIn">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border-4 border-black rounded-xl px-3 py-2 font-black text-xl text-center w-full focus:outline-none focus:ring-4 ring-yellow-200"
              autoFocus
            />
            <div className="flex gap-2 w-full">
              <button onClick={handleSaveName} className="flex-1 bg-green-400 text-white font-bold px-4 py-2 rounded-lg border-2 border-black hover:bg-green-500 shadow-sm active:translate-y-0.5">Save</button>
              <button onClick={() => { setIsEditingName(false); setEditName(user.nickname); }} className="flex-1 bg-gray-200 text-gray-500 font-bold px-4 py-2 rounded-lg border-2 border-black hover:bg-gray-300 shadow-sm active:translate-y-0.5">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1 group relative">
            <h2 className="text-3xl font-black">{user.nickname}</h2>
            <button
              onClick={() => { setIsEditingName(true); setEditName(user.nickname); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-100 p-1 rounded-lg border-2 border-black text-xs shadow-sm"
              title="Edit Nickname"
            >
              ✏️
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          <span className="font-mono text-gray-500 font-bold">ID: {user.id}</span>
          <span className="text-xs font-black bg-black text-white px-2 py-0.5 rounded border-2 uppercase cursor-not-allowed" title="Species cannot be changed">HUMAN</span>
          <span className={`text-xs font-black px-2 py-0.5 rounded border-2 uppercase ${getTierColor(user.subscriptionTier)}`}>
            {getTierName(user.subscriptionTier)}
          </span>
        </div>

        {/* 1. Bio Section */}
        <div className="w-full bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
          <h3 className="font-bold text-gray-400 text-xs uppercase mb-1">Bio</h3>
          <p className="font-bold text-lg">{user.bio}</p>
        </div>

        {/* 2. High Notes Section Button */}
        <div className="w-full mb-6">
          <Button
            onClick={onOpenMyHighNotes}
            variant="secondary"
            fullWidth
            className="py-4 flex justify-between items-center px-6"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">📣</span>
              <span className="font-black text-xl">My High Notes</span>
            </div>
            <div className="bg-black text-white text-xs font-bold px-2 py-1 rounded-full">
              {myPostsCount} Posts
            </div>
          </Button>
        </div>

        {/* 3. Wallet Section */}
        <div className="w-full bg-white border-4 border-black rounded-3xl p-6 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-200 rounded-full blur-2xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>

          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="font-bold text-gray-400 text-xs uppercase mb-1">My Wallet</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-black">{user.coins}</span>
                <span className="text-lg font-bold text-yellow-500">TT</span>
              </div>
            </div>
            <button
              onClick={onOpenSubscription}
              className="bg-black text-white px-3 py-1 rounded-lg font-bold text-xs hover:bg-gray-800 transition-colors"
            >
              UPGRADE
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onCheckIn}
              disabled={!isCheckInAvailable()}
              fullWidth
              className={`py-3 text-lg transition-all ${!isCheckInAvailable() ? 'opacity-50 grayscale' : 'animate-pulse'}`}
            >
              {isCheckInAvailable() ? '💰 Check-In' : '✅ Done'}
            </Button>

            <Button
              variant="secondary"
              fullWidth
              onClick={onOpenMyItems}
              className="py-3 text-lg"
            >
              📦 My Items
            </Button>
          </div>
        </div>

        {/* 4. My Skills Section Button */}
        <div className="w-full mb-6">
          <Button
            onClick={() => setShowMySkillsModal(true)}
            variant="secondary"
            fullWidth
            className="py-4 flex justify-between items-center px-6"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <span className="font-black text-xl">{t.skillsTab || 'My Skills'}</span>
            </div>
            <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {installedSkills.length} {t.installed || 'Installed'}
            </div>
          </Button>
        </div>

        {/* 6. Settings Section */}
        <div className="w-full bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
          <h3 className="font-bold text-gray-400 text-xs uppercase mb-2">{t.settings || 'Settings'}</h3>
          <ul className="space-y-3">
            <li 
              onClick={onToggleChatSound}
              className="flex justify-between font-bold cursor-pointer hover:text-blue-500"
            >
              <span>{t.messageChime || 'Message Chime'}</span>
              <span className={chatSoundEnabled ? 'text-green-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                {chatSoundEnabled ? (t.statusOn || 'ON') : (t.statusOff || 'OFF')}
              </span>
            </li>

            <li 
              onClick={() => setShowAiSettingsModal(true)}
              className="border-t border-gray-200 pt-2 flex justify-between font-bold cursor-pointer hover:text-blue-500"
            >
              <span>{t.aiConfig || '🤖 AI Configuration'}</span>
              <span className="text-blue-600 font-extrabold">
                {globalAiBrain?.provider ? `${globalAiBrain.provider.toUpperCase()} (${globalAiBrain.model})` : (t.defaultLabel || 'Default')}
              </span>
            </li>
            <li 
              onClick={() => setShowLanguageModal(true)}
              className="border-t border-gray-200 pt-2 flex justify-between font-bold cursor-pointer hover:text-blue-500"
            >
              <span>{t.language || 'Language'}</span>
              <span className="text-blue-600 font-extrabold">{language}</span>
            </li>

            <li className="border-t border-gray-200 pt-3 flex flex-col gap-2">
              <div className="flex justify-between items-center font-bold">
                <span>{t.aiProactivityLevel || '🤖 AI Proactivity Level'}</span>
                <span className="text-indigo-600 font-black uppercase text-xs">
                  {user.aiProactivity === 'low' ? (t.levelLow || 'Low') : user.aiProactivity === 'high' ? (t.levelHigh || 'High') : (t.levelStandard || 'Standard')}
                </span>
              </div>
              <input 
                type="range"
                min="0"
                max="2"
                step="1"
                value={user.aiProactivity === 'low' ? 0 : user.aiProactivity === 'high' ? 2 : 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const level = val === 0 ? 'low' : val === 2 ? 'high' : 'standard';
                  onUpdateProfile({ aiProactivity: level });
                }}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 border-2 border-black"
              />
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase px-1">
                <span>{t.levelLow || 'Low'}</span>
                <span>{t.levelStandard || 'Standard'}</span>
                <span>{t.levelHigh || 'High'}</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Log Out Button */}
        <div className="w-full mt-2 animate-fadeIn">
          <Button
            onClick={() => setShowLogoutConfirm(true)}
            variant="danger"
            fullWidth
            className="py-4 font-black text-xl"
          >
            🚪 {t.logOut || 'Log Out'}
          </Button>
        </div>
      </div>

      {/* AI Configuration Modal */}
      {showAiSettingsModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md md:max-w-lg flex flex-col max-h-[85vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="bg-purple-200 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
              <h2 className="font-black text-xl uppercase flex items-center gap-2">
                {t.brainSettings || 'Brain Settings'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAiSettingsModal(false);
                  resetStates();
                }}
                className="font-black text-xl hover:bg-white/50 rounded px-2.5 py-1 border-2 border-transparent hover:border-black transition-all"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-left">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-700">{t.aiProvider || 'AI Provider'}</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const val = e.target.value as AiProvider;
                    setProvider(val);
                    const opt = PROVIDER_OPTIONS.find(o => o.value === val);
                    if (opt) setModel(opt.defaultModel);
                  }}
                  className="w-full bg-white border-2 border-black rounded-xl p-2.5 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {PROVIDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-700">
                  {t.modelName || 'Model Name'}
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={t.modelPlaceholder || 'e.g. gpt-4o, gemini-2.5-flash, deepseek-chat'}
                  className="w-full bg-white border-2 border-black rounded-xl p-2.5 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-700">
                  {t.apiBaseUrl || 'API Base URL'} <span className="text-[10px] text-gray-400">
                    {provider === 'openai' ? t.defaultOpenai : provider === 'deepseek' ? 'https://api.deepseek.com' : provider === 'ollama' ? t.defaultOllama : provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : ''}
                  </span>
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : provider === 'deepseek' ? 'https://api.deepseek.com' : provider === 'ollama' ? 'http://localhost:11434/v1' : provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'https://api.yourprovider.com/v1'}
                  className="w-full bg-white border-2 border-black rounded-xl p-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-700">{t.apiKey || 'API Key'}</label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t.leaveEmpty || 'Leave empty to keep existing key'}
                    className="flex-1 bg-white border-2 border-black rounded-xl p-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 border-2 border-black rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xs"
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-bold leading-tight">{t.keyStoredSecurely || 'Key is stored securely on the server.'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(provider, model, apiKey, baseUrl, 'main')}
                    disabled={isTestingMain}
                    className="px-3 py-1 border-2 border-black rounded-xl bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 font-black text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                  >
                    {isTestingMain ? (t.testing || 'Testing...') : (t.testConnection || '🔌 Test Connection')}
                  </button>
                  {testResultMain && (
                    <span className={`text-[10px] font-black ${testResultMain.success ? 'text-green-600' : 'text-red-500'}`}>
                      {testResultMain.message}
                    </span>
                  )}
                </div>
              </div>

              {provider === 'gemini' && !baseUrl && !apiKey && (
                <p className="text-xs text-emerald-600 font-bold italic">{t.usingServerGeminiKey || '✓ Using default server Gemini key (gemini-2.5-flash)'}</p>
              )}

              {/* Cognitive Mode (Dual Brain) */}
              <div className="border-t-2 border-dashed border-black pt-4 space-y-4">
                <label className="block text-xs font-black text-gray-700">{t.cognitiveMode || 'Cognitive Mode'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCognitiveMode('standard')}
                    className={`p-2.5 border-2 border-black rounded-xl font-bold transition-all text-xs flex flex-col items-center justify-center gap-1 ${
                      cognitiveMode === 'standard'
                        ? 'bg-purple-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">🧠</span>
                    <span>{t.standardMode || 'Standard (Single Brain)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCognitiveMode('big_little')}
                    className={`p-2.5 border-2 border-black rounded-xl font-bold transition-all text-xs flex flex-col items-center justify-center gap-1 ${
                      cognitiveMode === 'big_little'
                        ? 'bg-purple-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span>{t.dualBrainMode || 'Dual-Brain'}</span>
                  </button>
                </div>

                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{t.dualBrainDesc || 'Dual-Brain mode offloads simple tasks to the Little Brain to save tokens.'}</p>

                {cognitiveMode === 'big_little' && (
                  <div className="border-t border-gray-200 pt-3 space-y-3">
                    <h4 className="font-black text-xs text-purple-700 flex items-center gap-1">
                      <span>🌊</span> {t.littleBrainSettings || 'Little Brain Settings'}
                    </h4>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-700">{t.littleBrainProvider || 'Little Brain Provider'}</label>
                      <select
                        value={littleBrainProvider}
                        onChange={(e) => {
                          const val = e.target.value as AiProvider;
                          setLittleBrainProvider(val);
                          const opt = PROVIDER_OPTIONS.find(o => o.value === val);
                          if (opt) setLittleBrainModel(val === 'gemini' ? 'gemini-2.5-flash' : opt.defaultModel);
                        }}
                        className="w-full bg-white border-2 border-black rounded-xl p-2 font-bold text-xs focus:outline-none"
                      >
                        {PROVIDER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-700">{t.littleBrainModel || 'Little Brain Model'}</label>
                      <input
                        type="text"
                        value={littleBrainModel}
                        onChange={(e) => setLittleBrainModel(e.target.value)}
                        placeholder="e.g. gemini-2.5-flash"
                        className="w-full bg-white border-2 border-black rounded-xl p-2 font-bold text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-700">
                        {t.baseUrl || 'Base URL'} <span className="text-[9px] text-gray-400">
                          {littleBrainProvider === 'openai' ? t.defaultOpenai : littleBrainProvider === 'deepseek' ? t.defaultDeepseek : littleBrainProvider === 'ollama' ? t.defaultOllama : littleBrainProvider === 'gemini' ? t.defaultGemini : ''}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={littleBrainBaseUrl}
                        onChange={(e) => setLittleBrainBaseUrl(e.target.value)}
                        placeholder={littleBrainProvider === 'openai' ? 'https://api.openai.com/v1' : littleBrainProvider === 'deepseek' ? 'https://api.deepseek.com' : littleBrainProvider === 'ollama' ? 'http://localhost:11434/v1' : littleBrainProvider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'https://api.yourprovider.com/v1'}
                        className="w-full bg-white border-2 border-black rounded-xl p-2 font-bold text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-700">{t.apiKey || 'API Key'}</label>
                      <div className="flex gap-2">
                        <input
                          type={showLittleKey ? 'text' : 'password'}
                          value={littleBrainApiKey}
                          onChange={(e) => setLittleBrainApiKey(e.target.value)}
                          placeholder={t.leaveEmpty || 'Leave empty to keep existing key'}
                          className="flex-1 bg-white border-2 border-black rounded-xl p-2 font-bold text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLittleKey(!showLittleKey)}
                          className="px-2.5 border-2 border-black rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xs"
                        >
                          {showLittleKey ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(littleBrainProvider, littleBrainModel, littleBrainApiKey, littleBrainBaseUrl, 'little')}
                          disabled={isTestingLittle}
                          className="px-3 py-1 border-2 border-black rounded-xl bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 font-black text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                        >
                          {isTestingLittle ? (t.testing || 'Testing...') : (t.testConnection || '🔌 Test Connection')}
                        </button>
                        {testResultLittle && (
                          <span className={`text-[10px] font-black ${testResultLittle.success ? 'text-green-600' : 'text-red-500'}`}>
                            {testResultLittle.message}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>{t.difficultyThreshold || 'Offload Difficulty Threshold'}</span>
                        <span className="text-purple-600 font-black">{difficultyThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={difficultyThreshold}
                        onChange={(e) => setDifficultyThreshold(parseInt(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t-4 border-black bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiSettingsModal(false);
                  resetStates();
                }}
                className="flex-1 py-3 border-2 border-black rounded-xl bg-gray-200 hover:bg-gray-300 font-black text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGlobalAi}
                disabled={isSaving}
                className="flex-1 py-3 border-2 border-black rounded-xl bg-purple-400 hover:bg-purple-500 text-white font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
              >
                {isSaving ? (t.saving || 'Saving...') : '💾 Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Skills Modal */}
      {showMySkillsModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md flex flex-col max-h-[80vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="bg-blue-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
              <h2 className="font-black text-xl uppercase flex items-center gap-2">
                <span>✨</span> {t.skillsTab || 'My Skills'}
              </h2>
              <button
                type="button"
                onClick={() => setShowMySkillsModal(false)}
                className="font-black text-xl hover:bg-white/50 rounded px-2.5 py-1 border-2 border-transparent hover:border-black transition-all"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {installedSkills.length > 0 ? installedSkills.map(skill => {
                  const isActive = globalSkills.includes(skill.id);
                  return (
                    <div
                      key={skill.id}
                      className={`w-full text-left p-3 border-2 border-black rounded-xl transition-all flex items-start gap-3 relative ${
                        isActive
                            ? 'bg-blue-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]'
                            : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      <button 
                        onClick={() => handleToggleGlobalSkill(skill.id)}
                        className="flex-1 flex items-start gap-3 text-left"
                      >
                        <span className="text-3xl">{skill.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <h5 className="font-black text-sm truncate">{skill.name}</h5>
                            {isActive && <span className="text-blue-600 font-black text-xs mr-8">ACTIVE</span>}
                          </div>
                          <p className="text-xs font-bold text-gray-500 line-clamp-2 mt-1">
                            {skill.description}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); uninstallSkill(skill.id); }}
                        className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center bg-white hover:bg-red-50 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-px"
                        title="Uninstall Skill"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
                    <span className="text-4xl">🔍</span>
                    <p className="font-bold italic text-sm">{t.noSkillsFound || 'No skills installed. Visit the Mall!'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t-4 border-black bg-gray-50 flex flex-col gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportSkill}
                accept=".json"
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                fullWidth
                className="bg-blue-400 hover:bg-blue-500 text-white border-2 py-3 font-black"
              >
                📥 {t.importSkill || 'Import Skill'}
              </Button>
              <Button 
                onClick={() => {
                   handleSaveGlobalAi(); // Reuse the save logic to persist skill selection
                   setShowMySkillsModal(false);
                }} 
                fullWidth
                className="bg-purple-400 hover:bg-purple-500 text-white border-2 py-3 font-black"
              >
                💾 {t.doneBtn || 'Done'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black rounded-3xl p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black mb-2">{t.logoutConfirmTitle || 'Log Out?'}</h3>
            <p className="font-bold text-gray-500 mb-6">
              {t.logoutConfirmDesc || 'Are you sure you want to exit ToonTalk?'}
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="danger" onClick={onLogout} fullWidth>{t.logoutConfirmYes || 'Yes, Log Out'}</Button>
              <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)} fullWidth>{t.logoutConfirmCancel || 'Cancel'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Language Settings Modal */}
      {showLanguageModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="bg-yellow-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
              <h2 className="font-black text-xl uppercase flex items-center gap-2">
                <span>🌐</span> {t.language || 'Language'}
              </h2>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="font-black text-xl hover:bg-white/50 rounded px-2.5 py-1 border-2 border-transparent hover:border-black transition-all"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-3">
              {(['English', '简体中文', '日本語', 'Español', 'Français'] as LanguageCode[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLanguageModal(false);
                  }}
                  className={`w-full py-3 px-4 border-2 border-black rounded-xl font-bold text-sm text-left transition-all flex justify-between items-center ${
                    language === lang
                      ? 'bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span>{lang}</span>
                  {language === lang && <span className="text-emerald-600 font-black">✓</span>}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t-4 border-black bg-gray-50 flex">
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="flex-1 py-3 border-2 border-black rounded-xl bg-gray-200 hover:bg-gray-300 font-black text-sm transition-all animate-none"
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
