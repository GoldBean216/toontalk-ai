import React, { useState } from 'react';
import useSWR from 'swr';
import { AiSkill } from '../lib/ai-skills';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';
import { useSkillStore } from '../lib/skill-store';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SkillMallProps {
    onBack: () => void;
    userCoins: number;
    userInventory: string[];
    onPurchase: (skillId: string, price: number) => Promise<boolean>;
}

export const SkillMall: React.FC<SkillMallProps> = ({
    onBack,
    userCoins,
    userInventory = [],
    onPurchase
}) => {
    const { t } = useLanguage();
    const { installedSkills, installSkill } = useSkillStore();
    const { data: marketSkills, error, isLoading: isMarketLoading } = useSWR<AiSkill[]>('/api/skills/market', fetcher);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [checkoutSkill, setCheckoutSkill] = useState<AiSkill | null>(null);
    const [showConfigModal, setShowConfigModal] = useState<AiSkill | null>(null);
    const [placesApiKey, setPlacesApiKey] = useState('');
    const [bodyStats, setBodyStats] = useState('');
    const [userAddress, setUserAddress] = useState('');
    const [tmdbApiKey, setTmdbApiKey] = useState('');
    const [igdbClientId, setIgdbClientId] = useState('');
    const [igdbClientSecret, setIgdbClientSecret] = useState('');
    const [spoonacularApiKey, setSpoonacularApiKey] = useState('');
    const [meituanClientId, setMeituanClientId] = useState('');
    const [meituanClientSecret, setMeituanClientSecret] = useState('');

    const filteredSkills = (marketSkills || []).filter(skill => {
        const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skill.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const isInstalled = (skillId: string) => {
        return installedSkills.some(s => s.id === skillId);
    };

    const isUnlocked = (skill: AiSkill) => {
        return skill.price === 0 || userInventory.includes(skill.id);
    };

    const handleBuyClick = (skill: AiSkill) => {
        if (isUnlocked(skill)) {
            // If already unlocked but not installed, just install
            if (!isInstalled(skill.id)) {
                if (skill.id === 'places_cafe' || skill.id === 'places_gourmet' || skill.id === 'places_travel' || skill.id === 'gaode_gourmet') {
                    const existing = installedSkills.find(s => s.id === skill.id);
                    setPlacesApiKey(existing?.config?.apiKey || '');
                    setUserAddress(existing?.config?.address || '');
                    setShowConfigModal(skill);
                } else if (skill.id === 'igdb_game') {
                    const existing = installedSkills.find(s => s.id === skill.id);
                    setIgdbClientId(existing?.config?.clientId || '');
                    setIgdbClientSecret(existing?.config?.clientSecret || '');
                    setShowConfigModal(skill);
                } else if (skill.id === 'meituan_gourmet') {
                    const existing = installedSkills.find(s => s.id === skill.id);
                    setMeituanClientId(existing?.config?.clientId || '');
                    setMeituanClientSecret(existing?.config?.clientSecret || '');
                    setShowConfigModal(skill);
                } else if (skill.id === 'diet_fitness') {
                    const existing = installedSkills.find(s => s.id === skill.id);
                    setBodyStats(existing?.config?.bodyStats || '');
                    setShowConfigModal(skill);
                } else if (skill.id === 'grocery_spoonacular') {
                    const existing = installedSkills.find(s => s.id === skill.id);
                    setSpoonacularApiKey(existing?.config?.apiKey || '');
                    setShowConfigModal(skill);
                } else if (skill.id === 'cinema_tmdb') {
                    const existing = installedSkills.find(s => s.id === skill.id);
                    setTmdbApiKey(existing?.config?.apiKey || '');
                    setShowConfigModal(skill);
                } else {
                    installSkill(skill);
                }
            }
            return;
        }
        if (userCoins < skill.price) {
            alert(t.needCoins || `Uh oh! You need more TT Coins!`);
            return;
        }
        setCheckoutSkill(skill);
    };

    const handleConfirmPurchase = async () => {
        if (!checkoutSkill || isPurchasing) return;
        setIsPurchasing(true);
        try {
            const success = await onPurchase(checkoutSkill.id, checkoutSkill.price);
            if (success) {
                const msg = (t.skillUnlockedSuccess || '✨ Successfully unlocked "{name}"!')
                    .replace('{name}', checkoutSkill.name);
                alert(msg);
                
                if (checkoutSkill.id === 'places_cafe' || checkoutSkill.id === 'places_gourmet' || checkoutSkill.id === 'places_travel' || checkoutSkill.id === 'gaode_gourmet') {
                    setPlacesApiKey('');
                    setUserAddress('');
                    setShowConfigModal(checkoutSkill);
                } else if (checkoutSkill.id === 'igdb_game') {
                    setIgdbClientId('');
                    setIgdbClientSecret('');
                    setShowConfigModal(checkoutSkill);
                } else if (checkoutSkill.id === 'meituan_gourmet') {
                    setMeituanClientId('');
                    setMeituanClientSecret('');
                    setShowConfigModal(checkoutSkill);
                } else if (checkoutSkill.id === 'diet_fitness') {
                    setBodyStats('');
                    setShowConfigModal(checkoutSkill);
                } else if (checkoutSkill.id === 'grocery_spoonacular') {
                    setSpoonacularApiKey('');
                    setShowConfigModal(checkoutSkill);
                } else if (checkoutSkill.id === 'cinema_tmdb') {
                    setTmdbApiKey('');
                    setShowConfigModal(checkoutSkill);
                } else {
                    await installSkill(checkoutSkill);
                }
                setCheckoutSkill(null);
            }
        } catch (error) {
            console.error('Failed to buy skill:', error);
            alert('Something went wrong during purchase.');
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!showConfigModal) return;
        
        let updatedSkill = { ...showConfigModal };
        if (showConfigModal.id === 'places_cafe' || showConfigModal.id === 'places_gourmet' || showConfigModal.id === 'places_travel' || showConfigModal.id === 'gaode_gourmet') {
            if (!placesApiKey.trim() || !userAddress.trim()) {
                alert('Please fill out all fields! / 请填写所有字段！');
                return;
            }
            updatedSkill.config = {
                apiKey: placesApiKey.trim(),
                address: userAddress.trim()
            };
        } else if (showConfigModal.id === 'igdb_game') {
            if (!igdbClientId.trim() || !igdbClientSecret.trim()) {
                alert('Please fill out both Client ID and Secret! / 请填写 Client ID 和 Secret！');
                return;
            }
            updatedSkill.config = {
                clientId: igdbClientId.trim(),
                clientSecret: igdbClientSecret.trim()
            };
        } else if (showConfigModal.id === 'meituan_gourmet') {
            if (!meituanClientId.trim() || !meituanClientSecret.trim()) {
                alert('Please fill out both Client ID and Secret! / 请填写 Client ID 和 Secret！');
                return;
            }
            updatedSkill.config = {
                clientId: meituanClientId.trim(),
                clientSecret: meituanClientSecret.trim()
            };
        } else if (showConfigModal.id === 'diet_fitness') {
            if (!bodyStats.trim()) {
                alert('Please enter your physical stats! / 请输入您的身体数据！');
                return;
            }
            updatedSkill.config = {
                bodyStats: bodyStats.trim()
            };
        } else if (showConfigModal.id === 'grocery_spoonacular') {
            if (!spoonacularApiKey.trim()) {
                alert('Please enter your Spoonacular API Key! / 请输入 Spoonacular API Key！');
                return;
            }
            updatedSkill.config = {
                apiKey: spoonacularApiKey.trim()
            };
        } else if (showConfigModal.id === 'cinema_tmdb') {
            if (!tmdbApiKey.trim()) {
                alert('Please enter your TMDB API Key! / 请输入 TMDB API Key！');
                return;
            }
            updatedSkill.config = {
                apiKey: tmdbApiKey.trim()
            };
        }

        await installSkill(updatedSkill);
        setShowConfigModal(null);
    };


    return (
        <div className="flex flex-col h-full bg-indigo-50/50 overflow-hidden relative">
            {/* Header */}
            <div className="bg-indigo-600 border-b-4 border-black p-4 sticky top-0 z-10 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack} 
                        className="text-white hover:text-yellow-300 text-2xl font-black p-1 transition-colors"
                        aria-label={t.mapBack || "Back"}
                    >
                        ←
                    </button>
                    <h1 className="text-2xl font-black tracking-wider uppercase text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                        {t.skillStoreTitle || '⚡ AI Skill Store'}
                    </h1>
                </div>
                <div className="bg-yellow-300 px-4 py-1.5 rounded-full border-2 border-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5">
                    💰 {userCoins} TT
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search */}
                <div className="p-4 bg-white border-b-4 border-black">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.searchSkillsPlaceholder || "Search for AI skills..."}
                        className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                    />
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 pb-24">
                    {isMarketLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <span className="text-6xl mb-4">🏪</span>
                            <p className="font-black text-slate-400 uppercase tracking-widest">Entering the Market...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredSkills.map(skill => {
                                const unlocked = isUnlocked(skill);
                                const installed = isInstalled(skill.id);
                                return (
                                    <div
                                        key={skill.id}
                                        className={`
                                            bg-white border-4 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
                                            flex flex-col hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all
                                            ${installed ? 'border-green-400 bg-green-50/10' : (unlocked ? 'border-indigo-400 bg-indigo-50/10' : '')}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="text-4xl bg-gray-100 p-2 rounded-2xl border-2 border-black/10">
                                                {skill.icon}
                                            </div>
                                            {installed && (
                                                <span className="bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase">
                                                    Installed
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-black text-lg mb-1 leading-tight text-gray-900">
                                            {skill.name}
                                        </h3>
                                        
                                        <p className="text-xs font-bold text-gray-500 flex-1 mb-4 leading-relaxed">
                                            {skill.description}
                                        </p>

                                        <div className="mt-auto pt-2 border-t-2 border-dashed border-gray-100 flex items-center justify-between gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.price || 'Price'}</span>
                                                <span className="font-black text-sm text-indigo-600">
                                                    {skill.price === 0 ? 'FREE' : `${skill.price} TT`}
                                                </span>
                                            </div>

                                            {installed ? (
                                                  (skill.id === 'places_cafe' || skill.id === 'places_gourmet' || skill.id === 'places_travel' || skill.id === 'meituan_gourmet' || skill.id === 'gaode_gourmet' || skill.id === 'cinema_tmdb' || skill.id === 'igdb_game' || skill.id === 'grocery_spoonacular' || skill.id === 'diet_fitness') ? (
                                                      <button
                                                          onClick={() => {
                                                              const existing = installedSkills.find(s => s.id === skill.id);
                                                              if (skill.id === 'places_cafe' || skill.id === 'places_gourmet' || skill.id === 'places_travel' || skill.id === 'gaode_gourmet') {
                                                                  setPlacesApiKey(existing?.config?.apiKey || '');
                                                                  setUserAddress(existing?.config?.address || '');
                                                              } else if (skill.id === 'diet_fitness') {
                                                                  setBodyStats(existing?.config?.bodyStats || '');
                                                              } else if (skill.id === 'meituan_gourmet') {
                                                                  setMeituanClientId(existing?.config?.clientId || '');
                                                                  setMeituanClientSecret(existing?.config?.clientSecret || '');
                                                              } else if (skill.id === 'igdb_game') {
                                                                  setIgdbClientId(existing?.config?.clientId || '');
                                                                  setIgdbClientSecret(existing?.config?.clientSecret || '');
                                                              } else if (skill.id === 'grocery_spoonacular') {
                                                                  setSpoonacularApiKey(existing?.config?.apiKey || '');
                                                              } else {
                                                                  setTmdbApiKey(existing?.config?.apiKey || '');
                                                              }
                                                              setShowConfigModal(skill);
                                                          }}
                                                          className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
                                                      >
                                                          ⚙️ Config
                                                      </button>
                                                  ) : (
                                                      <div className="px-4 py-2 bg-green-100 border-2 border-green-500 text-green-700 rounded-xl font-black text-xs flex items-center gap-1">
                                                          {t.installed || '✓ Ready'}
                                                     </div>
                                                 )
                                            ) : unlocked ? (
                                                <button
                                                    onClick={() => handleBuyClick(skill)}
                                                    className="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                                >
                                                    {t.install || '📥 Install'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleBuyClick(skill)}
                                                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                                >
                                                    {t.unlock || '🛒 Unlock'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredSkills.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-400 font-black text-lg">
                                    {t.noSkillsFound || '🕵️ No matching AI skills found. Try searching something else!'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Purchase Confirmation Modal */}
            {checkoutSkill && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col animate-scaleUp">
                        <div className="bg-indigo-600 p-4 border-b-4 border-black flex justify-between items-center text-white">
                            <h2 className="font-black text-lg uppercase tracking-wide">{t.confirmPurchase || 'Confirm Purchase'}</h2>
                            <button 
                                onClick={() => setCheckoutSkill(null)} 
                                className="font-black text-xl hover:text-yellow-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 text-center space-y-4">
                            <div className="text-6xl animate-bounce mb-2">{checkoutSkill.icon}</div>
                            <h3 className="font-black text-xl text-gray-900">{checkoutSkill.name}</h3>
                            <p className="text-sm font-bold text-gray-500 px-2">
                                {t.unlockPremiumSkill || 'Unlock this premium AI skill for your characters. It will cost:'}
                            </p>
                            <div className="bg-yellow-100 border-2 border-yellow-400 inline-block px-4 py-2 rounded-2xl font-black text-xl text-yellow-800 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                                💰 {checkoutSkill.price} TT
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600">
                                <span>{(t.yourBalance || 'Your balance') + ': ' + userCoins + ' TT'}</span>
                                <span>{(t.afterPurchase || 'After purchase') + ': ' + (userCoins - checkoutSkill.price) + ' TT'}</span>
                            </div>
                        </div>

                        <div className="p-4 border-t-4 border-black bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setCheckoutSkill(null)}
                                className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-black text-sm hover:bg-gray-100 transition-colors"
                            >
                                {t.cancel || 'Cancel'}
                            </button>
                            <Button
                                onClick={handleConfirmPurchase}
                                disabled={isPurchasing}
                                variant="primary"
                                className="flex-1"
                            >
                                {isPurchasing ? (t.unlocking || 'Unlocking...') : (t.confirmPay || 'Confirm Pay')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Places for Cafe / Cinema TMDB Config Modal */}
            {showConfigModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col animate-scaleUp">
                        <div className="bg-indigo-600 p-4 border-b-4 border-black flex justify-between items-center text-white">
                            <h2 className="font-black text-lg uppercase tracking-wide">
                                {showConfigModal.id === 'places_cafe' ? '☕' : (showConfigModal.id === 'places_gourmet' ? '🍔' : (showConfigModal.id === 'places_travel' ? '✈️' : (showConfigModal.id === 'meituan_gourmet' ? '🛵' : (showConfigModal.id === 'diet_fitness' ? '🥗' : (showConfigModal.id === 'gaode_gourmet' ? '🗺️' : (showConfigModal.id === 'igdb_game' ? '🎮' : (showConfigModal.id === 'grocery_spoonacular' ? '🛒' : '🎬')))))))} {showConfigModal.name} Config
                            </h2>
                            <button 
                                onClick={() => setShowConfigModal(null)} 
                                className="font-black text-xl hover:text-yellow-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {(showConfigModal.id === 'places_cafe' || showConfigModal.id === 'places_gourmet' || showConfigModal.id === 'places_travel' || showConfigModal.id === 'gaode_gourmet') ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">
                                            {showConfigModal.id === 'gaode_gourmet' ? 'Gaode Web Service Key' : 'Google Places API Key'}
                                        </label>
                                        <input 
                                            type="text" 
                                            value={placesApiKey}
                                            onChange={(e) => setPlacesApiKey(e.target.value)}
                                            placeholder={showConfigModal.id === 'gaode_gourmet' ? "Amap Web Service API Key..." : "AIzaSy..."} 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                        <a 
                                            href={showConfigModal.id === 'gaode_gourmet' ? "https://lbs.amap.com/dev/key/app" : "https://console.cloud.google.com/google/maps-apis/credentials"} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1 block self-start"
                                        >
                                            {showConfigModal.id === 'gaode_gourmet' ? '🔑 Click here to get your Gaode Web Service Key' : '🔑 Click here to configure or get Google Places API Key'}
                                        </a>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Your Location Address</label>
                                        <input 
                                            type="text" 
                                            value={userAddress}
                                            onChange={(e) => setUserAddress(e.target.value)}
                                            placeholder={showConfigModal.id === 'gaode_gourmet' ? "例如：北京市朝阳区北苑路" : "e.g. 1600 Amphitheatre Pkwy, Mountain View, CA"} 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                                        * {showConfigModal.id === 'gaode_gourmet' ? 'Gaode API key will be saved locally and used securely by AI to locate gourmet restaurants near you.' : `Places API key will be saved locally and used securely by AI to locate ${showConfigModal.id === 'places_cafe' ? 'coffee shops' : (showConfigModal.id === 'places_travel' ? 'tourist attractions' : 'gourmet restaurants')} near you.`}
                                    </p>
                                </>
                            ) : showConfigModal.id === 'igdb_game' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Twitch Client ID</label>
                                        <input 
                                            type="text" 
                                            value={igdbClientId}
                                            onChange={(e) => setIgdbClientId(e.target.value)}
                                            placeholder="Enter Twitch Client ID..." 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Twitch Client Secret</label>
                                        <input 
                                            type="password" 
                                            value={igdbClientSecret}
                                            onChange={(e) => setIgdbClientSecret(e.target.value)}
                                            placeholder="Enter Twitch Client Secret..." 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                        <a 
                                            href="https://dev.twitch.tv/console/apps" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1 block self-start"
                                        >
                                            🔑 Click here to get your Twitch Client ID & Secret
                                        </a>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                                        * Twitch Developer credentials will be saved locally and used securely by AI to fetch gaming details from IGDB.
                                    </p>
                                </>
                            ) : showConfigModal.id === 'meituan_gourmet' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Meituan Client ID</label>
                                        <input 
                                            type="text" 
                                            value={meituanClientId}
                                            onChange={(e) => setMeituanClientId(e.target.value)}
                                            placeholder="Enter Meituan Client ID..." 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Meituan Client Secret</label>
                                        <input 
                                            type="password" 
                                            value={meituanClientSecret}
                                            onChange={(e) => setMeituanClientSecret(e.target.value)}
                                            placeholder="Enter Meituan Client Secret..." 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                        <a 
                                            href="https://h5.dianping.com/app/bep-docs/sky-doc/api.html" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1 block self-start"
                                        >
                                            🔑 Click here to view Meituan Enterprise Doc
                                        </a>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                                        * Meituan Client ID & Secret will be saved locally. Mock data will be automatically used if empty or invalid.
                                    </p>
                                </>
                            ) : showConfigModal.id === 'diet_fitness' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Your Physical Stats & Goals / 您的体征数据与减脂目标</label>
                                        <textarea 
                                            value={bodyStats}
                                            onChange={(e) => setBodyStats(e.target.value)}
                                            placeholder="e.g. 28 years old, 180cm, 85kg, target 75kg / 例如：28岁, 180cm, 85kg, 目标减到75kg" 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200 h-24 resize-none"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                                        * These parameters will be securely utilized by AI to design a customized calorie target, daily menu guides, and personalized exercise schedules.
                                    </p>
                                </>
                            ) : showConfigModal.id === 'grocery_spoonacular' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">Spoonacular API Key</label>
                                        <input 
                                            type="text" 
                                            value={spoonacularApiKey}
                                            onChange={(e) => setSpoonacularApiKey(e.target.value)}
                                            placeholder="Enter Spoonacular API Key..." 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                        <a 
                                            href="https://spoonacular.com/food-api/console" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1 block self-start"
                                        >
                                            🔑 Click here to get your Spoonacular API Key
                                        </a>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                                        * Spoonacular API Key will be saved locally and used securely by AI to search supermarket products.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-black text-xs uppercase text-slate-700">TMDB API Key (v3 auth)</label>
                                        <input 
                                            type="text" 
                                            value={tmdbApiKey}
                                            onChange={(e) => setTmdbApiKey(e.target.value)}
                                            placeholder="Enter your TMDB API Key..." 
                                            className="w-full border-4 border-black rounded-xl p-3 font-bold text-sm focus:outline-none focus:ring-4 ring-indigo-200"
                                        />
                                        <a 
                                            href="https://www.themoviedb.org/settings/api" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1 block self-start"
                                        >
                                            🎬 Click here to get your TMDB API Key
                                        </a>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                                        * TMDB API Key will be saved locally and used securely by AI to fetch now playing movies.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t-4 border-black bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowConfigModal(null)}
                                className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-black text-sm hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                            >
                                Save & Install
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
