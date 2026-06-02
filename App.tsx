'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './lib/auth-context';
import { supabase } from './lib/supabase';
import { TabView, Contact, UserProfile, Message, Post, SubscriptionTier, Comment, Product, AiBrainConfig, ActiveCommand } from './types';
import { ChatList, ChatSubTab } from './components/ChatList';
import { AddContact } from './components/AddContact';
import { FindContact } from './components/FindContact';
import { ChatRoom } from './components/ChatRoom';
import { BottomNav } from './components/BottomNav';
import { Explore } from './components/Explore';
import { Profile } from './components/Profile';
import { GroupSelect } from './components/GroupSelect';
import { ToonMap } from './components/ToonMap';
import { GameLobby } from './components/GameLobby';
import { ChessGame } from './components/ChessGame';
import { PenaltyShootoutGame } from './components/PenaltyShootoutGame';
import { SnakeGame } from './components/SnakeGame';
import { MutationGame } from './components/MutationGame';
import { Mall } from './components/Mall';
import { SkillMall } from './components/SkillMall';
import { HighNotes } from './components/HighNotes';
import { SubscriptionModal } from './components/SubscriptionModal';
import { RechargeModal } from './components/RechargeModal';
import { MyItems } from './components/MyItems';
import { FriendProfile } from './components/FriendProfile';
import { MyHighNotes } from './components/MyHighNotes';
import { FriendHighNotes } from './components/FriendHighNotes';
import { LoginScreen } from './components/LoginScreen';
import { GateSetupScreen } from './components/GateSetupScreen';
import { useLanguage } from './lib/language-context';
import { AdminMall } from './components/AdminMall';
import { Notifications } from './components/Notifications';
import { Button } from './components/Button';
import { FormattedChatMessage } from './components/FormattedChatMessage';
import { Notification } from './types';
import { localChatDB } from './lib/local-db';
import { useToolStore } from './lib/tool-store';
import { useFetchInstalledPlugins } from './lib/hooks/useFetchInstalledPlugins';
import { generateCharacterResponse, generateSpeech, generateSocialComment, decodeAndPlayAudio, decideSocialProactivity } from './services/gemini';
import {
    regenerateEnergy,
    consumeEnergy,
    restoreEnergy,
    shouldShowFatigue,
    isCriticallyTired,
    getFatigueMessage,
    calculateEnthusiasm,
    getResponseLengthModifier,
    getTokenWarningMessage,
    initializeEnergy,
    resetDailyTokensIfNeeded,
    consumeEnergyWithPersonality
} from './lib/energy-manager';

// AI Characters are now fetched from Supabase
const INITIAL_CONTACTS: Contact[] = [];

const DEFAULT_USER: UserProfile = {
    id: '',
    nickname: 'New User',
    avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png',
    bio: 'Just a human trying to understand animals.',
    coins: 0,
    subscriptionTier: 'free',
    inventory: [],
    aiProactivity: 'standard'
};

// Helper to get Global AI Config
const getGlobalAiBrain = (): import('./types').AiBrainConfig | undefined => {
    if (typeof window !== 'undefined') {
        let userId = null;
        const sessionStr = localStorage.getItem('local_mock_session');
        if (sessionStr && sessionStr !== 'logged_out') {
            try {
                userId = JSON.parse(sessionStr)?.user?.id;
            } catch (e) {}
        }
        const key = userId ? `toontalk_global_ai_${userId}` : 'toontalk_global_ai';
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return undefined;
            }
        }
    }
    return undefined;
};

// Helper to get contact-specific AI Config
const getLocalContactBrain = (contactId: string, userId?: string): import('./types').AiBrainConfig | undefined => {
    if (typeof window !== 'undefined') {
        const key = userId ? `toontalk_brain_${userId}_${contactId}` : `toontalk_brain_${contactId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return undefined;
            }
        }
    }
    return undefined;
};


const App: React.FC = () => {
    const auth = useAuth();
    const authUser = auth.user;
    const isAuthLoading = auth.loading;
    const { language } = useLanguage();

    const [currentTab, setCurrentTab] = useState<TabView>('chats');
    const [activeContact, setActiveContact] = useState<Contact | null>(null);
    const [viewingFriend, setViewingFriend] = useState<Contact | null>(null);
    const [chatSubTab, setChatSubTab] = useState<ChatSubTab>('all');
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isFindingContact, setIsFindingContact] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [isRechargeOpen, setIsRechargeOpen] = useState(false);
    const [hasRecharged, setHasRecharged] = useState(false);
    const [isToonMapOpen, setIsToonMapOpen] = useState(false);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const [activeMiniGame, setActiveMiniGame] = useState<string | null>(null);
    const [isSkillMallOpen, setIsSkillMallOpen] = useState(false);
    const [isHighNotesOpen, setIsHighNotesOpen] = useState(false);
    const [isMyHighNotesOpen, setIsMyHighNotesOpen] = useState(false);
    const [isFriendHighNotesOpen, setIsFriendHighNotesOpen] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [focusedPostId, setFocusedPostId] = useState<string | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [isMallOpen, setIsMallOpen] = useState(false);
    const [isMyItemsOpen, setIsMyItemsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
    const [activeChatIds, setActiveChatIds] = useState<string[]>([]);
    const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
    const [unreadStatus, setUnreadStatus] = useState<Record<string, boolean>>({});
    const [completedActivityMessages, setCompletedActivityMessages] = useState<Record<string, { text: string; unread: boolean }>>({});
    const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
    const [enabledGames, setEnabledGames] = useState<string[]>(['dice', 'rps', 'wheel', 'fcb']);
    const hasSeededRef = useRef(false);
    const lastProactiveMapRef = useRef<Record<string, number>>({});
    const prevAiStatesRef = useRef<Record<string, string>>({});
    const [hasNewHighNotes, setHasNewHighNotes] = useState(false);

    // Context-Aware Chat States (Synced from ToonMap)
    const [aiSimulationState, setAiSimulationState] = useState<Record<string, any>>({});
    const [weather, setWeather] = useState<string>('sunny');
    const [buildings, setBuildings] = useState<any[]>([]);

    // Command states
    const [activeCommand, setActiveCommand] = useState<ActiveCommand | null>(null);
    const [pendingCommand, setPendingCommand] = useState<{ type: 'chat' | 'fight' | 'date' | 'goto'; args: string; executorId: string } | null>(null);

    const [miniChatContact, setMiniChatContact] = useState<Contact | null>(null);
    const [miniChatContacts, setMiniChatContacts] = useState<Contact[]>([]);
    const [isMiniChatCollapsed, setIsMiniChatCollapsed] = useState(true); // Always start collapsed
    const [miniChatInputValue, setMiniChatInputValue] = useState('');
    const [miniChatSuggestions, setMiniChatSuggestions] = useState<{ text: string; subtext?: string; value: string }[]>([]);
    const [miniChatSuggestionIndex, setMiniChatSuggestionIndex] = useState<number>(-1);

    useEffect(() => {
        setMiniChatSuggestionIndex(-1);
    }, [miniChatSuggestions]);

    useEffect(() => {
        if (!miniChatContact) {
            setMiniChatSuggestions([]);
            return;
        }
        const trimmed = miniChatInputValue.trim();
        if (trimmed === '/') {
            if (language === '简体中文') {
                setMiniChatSuggestions([
                    { text: '/chat', subtext: '寻找角色聊天', value: '/chat ' },
                    { text: '/fight', subtext: '与角色对决', value: '/fight ' },
                    { text: '/date', subtext: '与角色约会', value: '/date ' },
                    { text: '/goto', subtext: '前往建筑审查', value: '/goto ' },
                ]);
            } else if (language === '日本語') {
                setMiniChatSuggestions([
                    { text: '/chat', subtext: 'キャラクターとおしゃべり', value: '/chat ' },
                    { text: '/fight', subtext: 'キャラクターと対決', value: '/fight ' },
                    { text: '/date', subtext: 'キャラクターとデート', value: '/date ' },
                    { text: '/goto', subtext: '建物に向かう', value: '/goto ' },
                ]);
            } else if (language === 'Español') {
                setMiniChatSuggestions([
                    { text: '/chat', subtext: 'Chatear con personaje', value: '/chat ' },
                    { text: '/fight', subtext: 'Luchar con personaje', value: '/fight ' },
                    { text: '/date', subtext: 'Cita con personaje', value: '/date ' },
                    { text: '/goto', subtext: 'Ir al edificio', value: '/goto ' },
                ]);
            } else if (language === 'Français') {
                setMiniChatSuggestions([
                    { text: '/chat', subtext: 'Discuter avec le personnage', value: '/chat ' },
                    { text: '/fight', subtext: 'Combattre le personnage', value: '/fight ' },
                    { text: '/date', subtext: 'Rendez-vous avec le personnage', value: '/date ' },
                    { text: '/goto', subtext: 'Aller au bâtiment', value: '/goto ' },
                ]);
            } else {
                setMiniChatSuggestions([
                    { text: '/chat', subtext: 'Chat with character', value: '/chat ' },
                    { text: '/fight', subtext: 'Duel with character', value: '/fight ' },
                    { text: '/date', subtext: 'Go on a date with character', value: '/date ' },
                    { text: '/goto', subtext: 'Go to building', value: '/goto ' },
                ]);
            }
        } else if (trimmed.startsWith('/chat ') || trimmed.startsWith('/fight ') || trimmed.startsWith('/date ')) {
            const parts = miniChatInputValue.split(' ');
            const cmd = parts[0];
            const search = parts.slice(1).join(' ').toLowerCase();
            const matchingContacts = contacts
                .filter(c => c.id !== miniChatContact.id && !c.isGroup)
                .filter(c => c.name.toLowerCase().includes(search));
            setMiniChatSuggestions(matchingContacts.map(c => ({
                text: c.name,
                subtext: c.species,
                value: `${cmd} ${c.name}`
            })));
        } else if (trimmed.startsWith('/goto ')) {
            const parts = miniChatInputValue.split(' ');
            const cmd = parts[0];
            const search = parts.slice(1).join(' ').toLowerCase();
            const matchingBuildings = (buildings || [])
                .filter(b => b.name.toLowerCase().includes(search));
            setMiniChatSuggestions(matchingBuildings.map(b => ({
                text: b.name,
                subtext: b.description || b.tag,
                value: `${cmd} ${b.name}`
            })));
        } else {
            setMiniChatSuggestions([]);
        }
    }, [miniChatInputValue, contacts, miniChatContact, buildings]);

    const miniChatEndRef = useRef<HTMLDivElement>(null);
    const miniChatAudioContextRef = useRef<AudioContext | null>(null);

    const [chatSoundEnabled, setChatSoundEnabled] = useState<boolean>(true);
    const chatAudioContextRef = useRef<AudioContext | null>(null);
    const lastChatSoundTimeRef = useRef<number>(0);

    const [globalAiBrain, setGlobalAiBrain] = useState<AiBrainConfig | null>(null);
    const [gateOpened, setGateOpened] = useState<boolean>(false); // Default to false, checked synchronously on render

    // Initialize from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('toon_chat_sound_enabled');
            if (saved !== null) {
                setChatSoundEnabled(saved !== 'false');
            }
        }
    }, []);

    // Sync gate and AI brain settings when the user changes
    useEffect(() => {
        if (typeof window !== 'undefined' && authUser?.id) {
            const storedGlobalAi = localStorage.getItem(`toontalk_global_ai_${authUser.id}`);
            if (storedGlobalAi) {
                try {
                    setGlobalAiBrain(JSON.parse(storedGlobalAi));
                } catch (e) {
                    console.error("Failed to parse global AI config", e);
                }
            } else {
                setGlobalAiBrain(null);
            }
            
            const isOpened = localStorage.getItem(`toontalk_gate_opened_${authUser.id}`);
            if (isOpened === 'true' || storedGlobalAi) {
                setGateOpened(true);
            } else {
                setGateOpened(false);
            }
        } else if (!authUser) {
            setGlobalAiBrain(null);
            setGateOpened(false);
        }
    }, [authUser?.id, authUser]);

    const toggleChatSound = () => {
        setChatSoundEnabled(prev => {
            const newVal = !prev;
            localStorage.setItem('toon_chat_sound_enabled', String(newVal));
            return newVal;
        });
    };

    const handleSaveGlobalAiBrain = (config: AiBrainConfig) => {
        setGlobalAiBrain(config);
        if (authUser?.id) {
            localStorage.setItem(`toontalk_global_ai_${authUser.id}`, JSON.stringify(config));
        } else {
            localStorage.setItem('toontalk_global_ai', JSON.stringify(config));
        }
    };

    const playChatNotificationSound = () => {
        if (localStorage.getItem('toon_chat_sound_enabled') === 'false') return;
        const nowMs = Date.now();
        if (nowMs - lastChatSoundTimeRef.current < 1500) return; // Debounce
        lastChatSoundTimeRef.current = nowMs;

        try {
            if (!chatAudioContextRef.current) {
                chatAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = chatAudioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const now = ctx.currentTime;
            
            // Pleasant chiptune chime arpeggio: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            const delay = 0.04;
            const duration = 0.12;

            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * delay);
                
                gain.gain.setValueAtTime(0, now + idx * delay);
                gain.gain.linearRampToValueAtTime(0.06, now + idx * delay + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * delay + duration);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(now + idx * delay);
                osc.stop(now + idx * delay + duration + 0.02);
            });
        } catch (e) {
            console.warn("Failed to play chat notification sound:", e);
        }
    };

    useEffect(() => {
        return () => {
            if (chatAudioContextRef.current) {
                chatAudioContextRef.current.close().catch(() => {});
            }
        };
    }, []);

    const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    const [scheduleVersion, setScheduleVersion] = useState(0);

    // Reset local state when user changes or logs out
    useEffect(() => {
        setActiveContact(null);
        setViewingFriend(null);
        setContacts(INITIAL_CONTACTS);
        setActiveChatIds([]);
        setAllMessages({});
        setUnreadStatus({});
        setTypingStatus({});
        setNotifications([]);
        setIsToonMapOpen(false);
        hasSeededRef.current = false;
        lastProactiveMapRef.current = {};
    }, [authUser?.id]);

    // Sync with Supabase on Auth
    useEffect(() => {
        const syncProfile = async () => {
            try {
                const res = await fetch('/api/mall');
                const products = await res.json();
                if (Array.isArray(products)) setAllProducts(products);
            } catch (e) { console.error("Failed to fetch products", e); }

            if (authUser?.id) {
                // Only show loading screen if we don't have a profile yet or user changed
                if (!user.id || user.id !== authUser.id) {
                    setIsLoadingProfile(true);
                }
                try {
                    const userId = authUser.id;

                    // Fetch Profile from Supabase
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (profile) {
                        // Auto-migrate old DiceBear avatars to Emoji
                        let avatarUrl = profile.avatar_url || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png';
                        if (avatarUrl.includes('dicebear')) {
                            avatarUrl = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png';
                            // Fire async update to DB
                            supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId).then();
                        }

                        setUser({
                            id: userId,
                            nickname: profile.nickname || authUser.email?.split('@')[0] || 'Player',
                            avatarUrl: avatarUrl,
                            bio: profile.bio || DEFAULT_USER.bio,
                            coins: profile.coins,
                            subscriptionTier: profile.subscription_tier as SubscriptionTier,
                            inventory: typeof profile.inventory === 'string' ? JSON.parse(profile.inventory) : (profile.inventory || []),
                            lastCheckInDate: profile.last_check_in_date,
                            isAdmin: profile.is_admin || false,
                            totalTokensUsed: profile.total_tokens_used || 0,
                            dailyTokensUsed: profile.daily_tokens_used || 0,
                            lastTokenReset: profile.last_token_reset || new Date().toISOString(),
                            aiProactivity: profile.ai_proactivity as 'low' | 'standard' | 'high' || 'standard'
                        });
                    } else {
                        // Create new profile if missing
                        const newProfile = {
                            id: userId,
                            nickname: authUser.email?.split('@')[0] || 'New Player',
                            avatar_url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png',
                            coins: 40
                        };
                        await supabase.from('profiles').insert(newProfile);
                        setUser(prev => ({ ...prev, ...newProfile, avatarUrl: newProfile.avatar_url }));
                    }

                    // Fetch AI Characters from Supabase (Official characters)
                    const { data: aiChars, error: aiError } = await supabase
                        .from('ai_characters')
                        .select('*');

                    // Fetch Contacts from Supabase (User connections)
                    const { data: dbContacts, error: contactsError } = await supabase
                        .from('contacts')
                        .select('*')
                        .eq('user_id', userId) as { data: any[], error: any };

                    const mergedContacts: Contact[] = [...INITIAL_CONTACTS];
                    const dbContactsMap = new Map((dbContacts || []).map(c => [c.ai_id || c.target_id || c.id, c]));

                    // 1. Process Official AI Characters
                    (aiChars || []).forEach(ai => {
                        const dbEntry = dbContactsMap.get(ai.id);
                        mergedContacts.push(initializeEnergy({
                            id: ai.id,
                            name: dbEntry?.nickname || ai.name,
                            species: ai.species,
                            persona: ai.persona,
                            avatarUrl: ai.avatar_url,
                            color: ai.color || 'bg-gray-100',
                            affinity: dbEntry?.affinity !== undefined ? dbEntry.affinity : (ai.initial_affinity || 0),
                            isGroup: false,
                            isAi: true,
                            stableId: ai.id,
                            coins: dbEntry?.coins || 0,
                            // Map brain config from db entry or localStorage if present
                            aiBrain: getLocalContactBrain(ai.id, userId) || (dbEntry?.ai_provider ? {
                                provider: dbEntry.ai_provider,
                                model: dbEntry.ai_model || undefined,
                                apiBaseUrl: dbEntry.ai_base_url || undefined,
                                apiKey: dbEntry.ai_api_key || undefined,
                                skills: typeof dbEntry.ai_skills === 'string' ? JSON.parse(dbEntry.ai_skills) : (dbEntry.ai_skills || []),
                                cognitiveMode: dbEntry.ai_cognitive_mode || 'standard',
                                littleBrainProvider: dbEntry.ai_little_provider || undefined,
                                littleBrainModel: dbEntry.ai_little_model || undefined,
                                littleBrainApiKey: dbEntry.ai_little_key || undefined,
                                littleBrainBaseUrl: dbEntry.ai_little_base_url || undefined,
                                difficultyThreshold: dbEntry.ai_difficulty_threshold !== undefined ? Number(dbEntry.ai_difficulty_threshold) : 50,
                                ttsProvider: dbEntry.ai_tts_provider || undefined,
                                ttsModel: dbEntry.ai_tts_model || undefined,
                                ttsBaseUrl: dbEntry.ai_tts_base_url || undefined,
                                ttsApiKey: dbEntry.ai_tts_key || undefined,
                                ttsVoice: dbEntry.ai_tts_voice || undefined,
                                ttsSpeechType: dbEntry.ai_tts_speech_type !== undefined ? Number(dbEntry.ai_tts_speech_type) as 1 | 2 : 2,
                                behaviorPreference: dbEntry.ai_behavior_preference || 'default',
                            } : undefined)
                        }));
                    });

                    // 2. Process Custom/Other Contacts
                    (dbContacts || []).forEach(dbc => {
                        const targetId = dbc.ai_id || dbc.target_id || dbc.id;
                        // Avoid duplicates if already added via AI list
                        if (!mergedContacts.find(c => c.id === targetId)) {
                            mergedContacts.push(initializeEnergy({
                                id: dbc.id,
                                name: dbc.nickname || 'Unknown',
                                species: dbc.species || 'Unknown',
                                persona: dbc.persona || '',
                                avatarUrl: dbc.avatar_url || 'https://picsum.photos/200',
                                color: 'bg-blue-100',
                                affinity: dbc.affinity || 0,
                                isGroup: dbc.is_group === 1 || dbc.is_group === true,
                                isAi: dbc.is_ai === 1 || dbc.is_ai === true,
                                members: typeof dbc.members === 'string' ? JSON.parse(dbc.members) : (dbc.members || []),
                                creatorId: dbc.creator_id,
                                stableId: targetId,
                                coins: dbc.coins || 0,
                                aiBrain: getLocalContactBrain(targetId, userId) || getLocalContactBrain(dbc.id, userId) || (dbc.ai_provider ? {
                                    provider: dbc.ai_provider,
                                    model: dbc.ai_model || undefined,
                                    apiBaseUrl: dbc.ai_base_url || undefined,
                                    apiKey: dbc.ai_api_key || undefined,
                                    skills: typeof dbc.ai_skills === 'string' ? JSON.parse(dbc.ai_skills) : (dbc.ai_skills || []),
                                    cognitiveMode: dbc.ai_cognitive_mode || 'standard',
                                    littleBrainProvider: dbc.ai_little_provider || undefined,
                                    littleBrainModel: dbc.ai_little_model || undefined,
                                    littleBrainApiKey: dbc.ai_little_key || undefined,
                                    littleBrainBaseUrl: dbc.ai_little_base_url || undefined,
                                    difficultyThreshold: dbc.ai_difficulty_threshold !== undefined ? Number(dbc.ai_difficulty_threshold) : 50,
                                    ttsProvider: dbc.ai_tts_provider || undefined,
                                    ttsModel: dbc.ai_tts_model || undefined,
                                    ttsBaseUrl: dbc.ai_tts_base_url || undefined,
                                    ttsApiKey: dbc.ai_tts_key || undefined,
                                    ttsVoice: dbc.ai_tts_voice || undefined,
                                    ttsSpeechType: dbc.ai_tts_speech_type !== undefined ? Number(dbc.ai_tts_speech_type) as 1 | 2 : 2,
                                    behaviorPreference: dbc.ai_behavior_preference || 'default',
                                } : undefined)
                            }));
                        }
                    });

                    setContacts(mergedContacts);

                    // Fetch High Notes from API
                    const hnRes = await fetch(`/api/highnotes?userId=${userId}`);
                    const hnData = await hnRes.json();
                    if (Array.isArray(hnData)) {
                        setPosts(hnData);
                    }

                    // Fetch Notifications
                    const nRes = await fetch(`/api/notifications?userId=${userId}`);
                    const nData = await nRes.json();
                    if (Array.isArray(nData)) {
                        setNotifications(nData);
                    }

                    // Load Active Chat IDs from Local DB
                    if (authUser?.id) {
                        const localChatIds = await localChatDB.getAllChatContactIds(authUser.id);
                        if (localChatIds.length > 0) {
                            setActiveChatIds(prev => Array.from(new Set([...prev, ...localChatIds])));
                        } else {
                            // Seed default active chats with official AI characters on first login
                            const officialIds = (aiChars || []).map(ai => ai.id);
                            if (officialIds.length > 0) {
                                setActiveChatIds(prev => Array.from(new Set([...prev, ...officialIds])));
                            } else {
                                setActiveChatIds(prev => Array.from(new Set([...prev])));
                            }
                        }
                    }
                } catch (e) {
                    console.error("Profile/Contacts sync error", e);
                } finally {
                    setIsLoadingProfile(false);
                }
            }
        };
        syncProfile();
    }, [authUser]);

    // Sync Coins/Inventory Changes to Supabase
    const updateUserInDb = async (updates: Partial<UserProfile>) => {
        if (!authUser?.id) return;
        const userId = authUser.id;

        const dbUpdates: any = {};
        if (updates.coins !== undefined) dbUpdates.coins = updates.coins;
        if (updates.inventory !== undefined) dbUpdates.inventory = updates.inventory;
        if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
        if (updates.subscriptionTier !== undefined) dbUpdates.subscription_tier = updates.subscriptionTier;
        if (updates.lastCheckInDate !== undefined) dbUpdates.last_check_in_date = updates.lastCheckInDate;
        if (updates.totalTokensUsed !== undefined) dbUpdates.total_tokens_used = updates.totalTokensUsed;
        if (updates.dailyTokensUsed !== undefined) dbUpdates.daily_tokens_used = updates.dailyTokensUsed;
        if (updates.lastTokenReset !== undefined) dbUpdates.last_token_reset = updates.lastTokenReset;
        if (updates.aiProactivity !== undefined) dbUpdates.ai_proactivity = updates.aiProactivity;

        await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    };

    // Wrap setUser to auto-sync
    const updateUserData = (updater: (prev: UserProfile) => UserProfile) => {
        setUser(prev => {
            const newState = updater(prev);
            updateUserInDb(newState); // Fire and forget sync
            return newState;
        });
    };

    // Daily Token Reset Effect
    useEffect(() => {
        if (!authUser?.id) return;

        const checkAndResetTokens = () => {
            setUser(prev => {
                const resetUser = resetDailyTokensIfNeeded(prev);
                if (resetUser.dailyTokensUsed !== prev.dailyTokensUsed) {
                    // Token was reset, sync to DB
                    updateUserInDb(resetUser);
                }
                return resetUser;
            });
        };

        // Check on mount
        checkAndResetTokens();

        // Check every hour
        const interval = setInterval(checkAndResetTokens, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [authUser]);

    // AI State Transition -> High Notes Post Trigger
    useEffect(() => {
        if (!authUser) return;

        const triggerStateTransitionPost = async (author: Contact) => {
            console.log(`[HighNotes Sim] 📝 State change transition post for AI: ${author.name}`);
            try {
                await fetch('/api/highnotes/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        authorId: author.id,
                        authorName: author.name,
                        authorSpecies: author.species,
                        authorPersona: author.persona,
                        authorAvatar: author.avatarUrl,
                        brain: getGlobalAiBrain(),
                        userId: authUser.id,
                        language
                    })
                });
                
                // Refresh posts list
                const finalRes = await fetch(`/api/highnotes?userId=${authUser.id}`);
                const finalData = await finalRes.json();
                if (Array.isArray(finalData)) setPosts(finalData);
            } catch (e) {
                console.error("Failed to generate transition post:", e);
            }
        };

        contacts.forEach(c => {
            if (!c.isAi || c.isGroup) return;
            const prev = prevAiStatesRef.current[c.id];
            const current = c.aiState || 'rest';

            if (prev !== undefined && prev !== current) {
                // Trigger post when transitioning from work to rest, social, sick, or hospitalized
                if (prev === 'work' && (current === 'rest' || current === 'social' || current === 'sick' || current === 'hospitalized')) {
                    triggerStateTransitionPost(c);
                }
            }
            prevAiStatesRef.current[c.id] = current;
        });
    }, [contacts, authUser, language]);

    // Continuous Social Simulation (High Notes Community Activity)
    useEffect(() => {
        if (!authUser) return;

        const runSocialSimulation = async () => {
            const aiCandidates = contacts.filter(c => !c.isGroup && c.id !== authUser.id && c.isAi);
            if (aiCandidates.length === 0) return;

            // Fetch existing posts to check timestamps
            const hnRes = await fetch(`/api/highnotes?userId=${authUser.id}`);
            const existingPosts: Post[] = await hnRes.json();
            if (Array.isArray(existingPosts)) setPosts(existingPosts);

            const now = Date.now();
            const ONE_HUNDRED_TWENTY_MINUTES = 120 * 60 * 1000;
            let hasNewPost = false;

            for (const author of aiCandidates) {
                // Only allow periodic posting in 'work' state
                if (author.aiState !== 'work') continue;

                const authorPosts = existingPosts.filter(p => String(p.authorId) === String(author.id));
                const lastPostTime = authorPosts.length > 0 ? Math.max(...authorPosts.map(p => p.timestamp)) : 0;
                const timeSince = now - lastPostTime;

                // Post every 120 minutes with a 20% chance
                if (authorPosts.length === 0 || timeSince >= ONE_HUNDRED_TWENTY_MINUTES) {
                    if (Math.random() < 0.20) { 
                        console.log(`[HighNotes Sim] 📝 Periodic work post for AI: ${author.name}`);
                        try {
                            await fetch('/api/highnotes/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    authorId: author.id,
                                    authorName: author.name,
                                    authorSpecies: author.species,
                                    authorPersona: author.persona,
                                    authorAvatar: author.avatarUrl,
                                    brain: getGlobalAiBrain(),
                                    userId: authUser.id,
                                    language
                                })
                            });
                            hasNewPost = true;
                        } catch (e) { console.error(e); }
                    }
                }
            }

            if (hasNewPost) {
                const finalRes = await fetch(`/api/highnotes?userId=${authUser.id}`);
                const finalData = await finalRes.json();
                if (Array.isArray(finalData)) setPosts(finalData);
            }

            // Commenting logic (existing feed interaction)
            const targetPosts = existingPosts.slice(0, 5);
            let hasNewComment = false;
            for (const post of targetPosts) {
                if (Math.random() < 0.10) { // 10% chance to comment
                    try {
                        const commentRes = await fetch('/api/highnotes/auto-comment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ postId: post.id, brain: getGlobalAiBrain(), language })
                        });
                        if (commentRes.ok) hasNewComment = true;
                    } catch (e) { console.error(e); }
                }
            }

            if (hasNewComment && !hasNewPost) {
                const finalRes = await fetch(`/api/highnotes?userId=${authUser.id}`);
                const finalData = await finalRes.json();
                if (Array.isArray(finalData)) setPosts(finalData);
            }
        };

        // Run simulation every 3 minutes
        const interval = setInterval(runSocialSimulation, 3 * 60 * 1000);
        runSocialSimulation(); // Initial run

        return () => clearInterval(interval);
    }, [contacts, authUser, language]);

    // Server-Driven AI Outreach (replaces random proactive messaging)
    const activeContactRef = useRef(activeContact);
    const contactsRef = useRef(contacts);
    const miniChatContactRef = useRef(miniChatContact);
    useEffect(() => { activeContactRef.current = activeContact; }, [activeContact]);
    useEffect(() => { contactsRef.current = contacts; }, [contacts]);
    useEffect(() => { miniChatContactRef.current = miniChatContact; }, [miniChatContact]);

    const miniChatMsgCount = miniChatContact ? (allMessages[miniChatContact.id] || []).length : 0;
    const miniChatId = miniChatContact?.id || '';
    const miniChatIsTyping = typingStatus[miniChatId] || false;
    useEffect(() => {
        if (miniChatContact && !isMiniChatCollapsed) {
            setTimeout(() => {
                miniChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [miniChatContact, isMiniChatCollapsed, miniChatMsgCount, miniChatIsTyping]);

    const getMiniChatAudioContext = () => {
        if (!miniChatAudioContextRef.current) {
            miniChatAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (miniChatAudioContextRef.current.state === 'suspended') {
            miniChatAudioContextRef.current.resume();
        }
        return miniChatAudioContextRef.current;
    };

    const playMiniChatAudio = (base64: string) => {
        const ctx = getMiniChatAudioContext();
        decodeAndPlayAudio(base64, ctx);
    };

    const prevMiniChatMsgCount = useRef(0);
    useEffect(() => {
        if (!miniChatContact) {
            prevMiniChatMsgCount.current = 0;
            return;
        }
        const msgs = allMessages[miniChatContact.id] || [];
        if (msgs.length > prevMiniChatMsgCount.current) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.senderId !== 'user' && lastMsg.isAudio && lastMsg.audioUrl) {
                setTimeout(() => playMiniChatAudio(lastMsg.audioUrl!), 500);
            }
        }
        prevMiniChatMsgCount.current = msgs.length;
    }, [allMessages, miniChatContact?.id]);

    useEffect(() => {
        if (!authUser?.id) return;

        const checkPendingMessages = async () => {
            try {
                const res = await fetch(`/api/ai-messages?userId=${authUser.id}`);
                const pendingMessages = await res.json();

                if (!Array.isArray(pendingMessages) || pendingMessages.length === 0) return;

                // Process each pending message
                for (const msg of pendingMessages) {
                    const aiContact = contactsRef.current.find(c => c.id === msg.ai_id);
                    if (!aiContact) continue;

                    setCompletedActivityMessages(prev => ({
                        ...prev,
                        [msg.ai_id]: {
                            text: msg.text,
                            unread: true
                        }
                    }));

                    // Check if it's a TASK_RESULT
                    const isTaskResult = msg.text.startsWith('TASK_RESULT:');
                    let speechText = msg.text;
                    if (isTaskResult) {
                        try {
                            const data = JSON.parse(msg.text.replace('TASK_RESULT:', ''));
                            speechText = data.summary || "I've finished my activity!";
                        } catch (e) {}
                    }

                    const aiMsg: Message = {
                        id: Date.now().toString() + Math.random(),
                        senderId: msg.ai_id,
                        text: msg.text,
                        timestamp: Date.now(),
                        isAudio: !isTaskResult, // Don't auto-play audio for raw JSON results
                        isTranslated: false
                    };

                    const updateMessageUI = (msgWithAudio?: Message) => {
                        const finalMsg = msgWithAudio || aiMsg;
                        setAllMessages(prev => ({ ...prev, [msg.ai_id]: [...(prev[msg.ai_id] || []), finalMsg] }));
                        setUnreadStatus(prev => (activeContactRef.current?.id === msg.ai_id || miniChatContactRef.current?.id === msg.ai_id ? prev : { ...prev, [msg.ai_id]: true }));
                        
                        playChatNotificationSound();
                        
                        if (authUser?.id) {
                            localChatDB.saveMessage(authUser.id, msg.ai_id, finalMsg);
                        }
                        setActiveChatIds(prev => Array.from(new Set([msg.ai_id, ...prev])));
                        setMiniChatContacts(prev => {
                            if (prev.find(c => c.id === msg.ai_id)) return prev;
                            const targetContact = contactsRef.current.find(c => c.id === msg.ai_id);
                            return targetContact ? [...prev, targetContact] : prev;
                        });
                    };

                    if (isTaskResult) {
                        // For task results, update UI immediately, then maybe add audio later
                        updateMessageUI();
                        generateSpeech(speechText, aiContact.species, aiContact.persona, 5, aiContact.aiBrain?.ttsVoice, aiContact.aiBrain).then(audio => {
                            if (audio) {
                                setAllMessages(prev => ({
                                    ...prev,
                                    [msg.ai_id]: (prev[msg.ai_id] || []).map(m => m.id === aiMsg.id ? { ...m, audioUrl: audio, isAudio: true } : m)
                                }));
                            }
                        });
                    } else {
                        // Standard message: Wait for audio to ensure it's ready when shown (traditional behavior)
                        generateSpeech(speechText, aiContact.species, aiContact.persona, 5, aiContact.aiBrain?.ttsVoice, aiContact.aiBrain).then(audio => {
                            if (audio) aiMsg.audioUrl = audio;
                            updateMessageUI(aiMsg);
                        }).catch(() => updateMessageUI(aiMsg));
                    }
                }
            } catch (e) {
                console.error("Pending Messages Poll Error:", e);
            }
        };

        // Poll every 10 seconds for pending messages
        const interval = setInterval(checkPendingMessages, 10000);
        checkPendingMessages(); // Initial check
        return () => clearInterval(interval);
    }, [authUser]);

    // AI Outreach Heartbeat (Proactive Checks)
    useEffect(() => {
        if (!authUser?.id) return;

        const runHeartbeat = async () => {
            try {
                // console.log("[Heartbeat] Checking for proactive AI outreach...");
                await fetch('/api/ai/outreach-heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: authUser.id, language })
                });
            } catch (e) { console.error("Outreach Heartbeat Failed:", e); }
        };

        // Run every 5 minutes for proactive checks
        const interval = setInterval(runHeartbeat, 5 * 60 * 1000);
        runHeartbeat(); // Initial check
        return () => clearInterval(interval);
    }, [authUser, language]);

    // Real-time Notification Subscription (Instant Red Dot)
    useEffect(() => {
        if (!authUser) return;

        // 1. Initial Fetch
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', authUser.id)
                .order('created_at', { ascending: false });

            if (data) {
                setNotifications(data.map((n: any) => ({
                    id: n.id,
                    userId: n.user_id,
                    type: n.type,
                    fromName: n.from_name,
                    fromAvatar: n.from_avatar,
                    postId: n.post_id,
                    postContent: n.post_content,
                    commentId: n.comment_id,
                    commentText: n.comment_text,
                    replyText: n.reply_text,
                    timestamp: new Date(n.created_at).getTime(),
                    isRead: n.is_read
                })));
            }
        };
        fetchInitial();

        // 2. Subscribe to Real-time Changes
        const channel = supabase
            .channel(`notifs:${authUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${authUser.id}`
                },
                (payload) => {
                    const n = payload.new as any;
                    const newNotif: Notification = {
                        id: n.id,
                        userId: n.user_id,
                        type: n.type,
                        fromName: n.from_name,
                        fromAvatar: n.from_avatar,
                        postId: n.post_id,
                        postContent: n.post_content,
                        commentId: n.comment_id,
                        commentText: n.comment_text,
                        replyText: n.reply_text,
                        timestamp: new Date(n.created_at).getTime(),
                        isRead: n.is_read
                    };
                    setNotifications(prev => [newNotif, ...prev]);
                }
            )
            .subscribe();

        // 3. Fallback Poll (to guarantee dot appears if Realtime is blocked)
        const pollInterval = setInterval(fetchInitial, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [authUser]);

    // Real-time HighNotes Listener
    useEffect(() => {
        if (!authUser) return;

        const channel = supabase
            .channel('public:posts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                () => {
                    // Only show dot if we are not currently looking at highnotes
                    if (!isHighNotesOpen) setHasNewHighNotes(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [authUser, isHighNotesOpen]);

    // Load Chat History on Selection
    // Load Chat History on Selection (Local Only)
    useEffect(() => {
        if (!activeContact) return;

        // Clear Unread Status (Red Dot) for this contact
        setUnreadStatus(prev => ({ ...prev, [activeContact.id]: false }));

        const loadHistory = async () => {
            if (!authUser?.id) return;
            const localMsgs = await localChatDB.getMessages(authUser.id, activeContact.id);
            setAllMessages(prev => ({ ...prev, [activeContact.id]: localMsgs }));
        };

        loadHistory();
    }, [activeContact]);



    if (isAuthLoading || isLoadingProfile) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-yellow-50">
                <div className="text-4xl animate-bounce">🤔 Loading...</div>
            </div>
        );
    }

    if (!authUser) {
        return <LoginScreen onLogin={() => { }} />;
    }

    // Determine gate opened status synchronously to avoid flashes
    let currentGateOpened = gateOpened;
    if (typeof window !== 'undefined' && authUser?.id) {
        const storedGlobalAi = localStorage.getItem(`toontalk_global_ai_${authUser.id}`);
        const isOpened = localStorage.getItem(`toontalk_gate_opened_${authUser.id}`);
        currentGateOpened = !!(isOpened === 'true' || storedGlobalAi);
    }

    if (!currentGateOpened) {
        return (
            <GateSetupScreen 
                language={language}
                onUnlockComplete={(config) => {
                    handleSaveGlobalAiBrain(config);
                    if (authUser?.id) {
                        localStorage.setItem(`toontalk_gate_opened_${authUser.id}`, 'true');
                    } else {
                        localStorage.setItem('toontalk_gate_opened', 'true');
                    }
                    setGateOpened(true);
                }}
            />
        );
    }

    // --- Handlers ---

    const handleCheckIn = () => {
        const today = new Date().toISOString().split('T')[0];
        updateUserData(prev => ({ 
            ...prev, 
            coins: prev.coins + 100,
            lastCheckInDate: today
        }));
        alert("Daily Check-in successful! You received +100 TT Coins! 🎉");
    };

    const handleRecharge = (amount: number, cost: number) => {
        // Disabled paid recharge logic as requested.
        setIsRechargeOpen(false);
    };

    const handleSubscribe = (tier: SubscriptionTier) => {
        updateUserData(prev => ({ ...prev, subscriptionTier: tier }));
        setIsSubscriptionOpen(false);
        alert(`Successfully subscribed to ${tier.toUpperCase()}!`);
    };

    const handleUpdateProfile = (updates: Partial<UserProfile>) => {
        updateUserData(prev => ({ ...prev, ...updates }));
    };

    const closeAllOverlays = () => {
        setIsAddingContact(false);
        setIsFindingContact(false);
        setIsCreatingGroup(false);
        setIsSubscriptionOpen(false);
        setIsRechargeOpen(false);
        setIsGameLobbyOpen(false);
        setActiveMiniGame(null);
        setIsHighNotesOpen(false);
        setIsMyHighNotesOpen(false);
        setIsFriendHighNotesOpen(false);
        setIsMallOpen(false);
        setIsMyItemsOpen(false);
        setFocusedPostId(null);
        setViewingFriend(null);
        setShowAddDropdown(false);
    };

    const updateAffinity = async (contactId: string, delta: number) => {
        // Calculate based on current state
        const targetContact = contacts.find(c => c.id === contactId);
        if (!targetContact) return;

        const currentAffinity = targetContact.affinity || 0;
        const newAffinity = currentAffinity + delta;

        // 1. Optimistic UI Update
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, affinity: newAffinity } : c));

        if (activeContact?.id === contactId) {
            setActiveContact(prev => prev ? ({ ...prev, affinity: newAffinity }) : null);
        }

        // 2. DB Sync
        if (authUser?.id) {
            try {
                // Try update first
                const { data } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('user_id', authUser.id)
                    .eq('ai_id', contactId);

                if (data && data.length > 0) {
                    await supabase.from('contacts').update({ affinity: newAffinity }).eq('id', data[0].id);
                } else {
                    // Create new tracking record
                    await supabase.from('contacts').insert({
                        user_id: authUser.id,
                        ai_id: contactId,
                        nickname: targetContact.name,
                        species: targetContact.species,
                        persona: targetContact.persona,
                        avatar_url: targetContact.avatarUrl,
                        affinity: newAffinity
                    });
                }
            } catch (e) {
                console.error("Affinity Sync Failed", e);
            }
        }
    };

    const handleCommand = (type: 'chat' | 'fight' | 'date' | 'goto', args: string, executorId: string) => {
        if (activeCommand && activeCommand.phase !== 'done') {
            // Ask user to abort
            setPendingCommand({ type, args, executorId });
            return;
        }
        issueCommand(type, args, executorId);
    };

    const handleCancelCommand = (commandId: string) => {
        if (activeCommand && activeCommand.id === commandId) {
            setActiveCommand(prev => prev ? { ...prev, phase: 'cancelled' } : null);
            
            // Add cancellation system message
            const executor = contacts.find(c => c.id === activeCommand.executorId);
            if (executor && authUser?.id) {
                const systemMsg: Message = {
                    id: Date.now().toString() + '-cancel',
                    senderId: 'system',
                    text: `🚫 指令已被用户取消。 / Command cancelled by user.`,
                    timestamp: Date.now(),
                    isAudio: false,
                    isTranslated: true
                };
                setAllMessages(prev => ({
                    ...prev,
                    [activeCommand.executorId]: [...(prev[activeCommand.executorId] || []), systemMsg]
                }));
                localChatDB.saveMessage(authUser.id, activeCommand.executorId, systemMsg);
            }
            setTimeout(() => {
                setActiveCommand(null);
            }, 500);
        }
    };

    const issueCommand = (type: 'chat' | 'fight' | 'date' | 'goto', args: string, executorId: string) => {
        const executor = contacts.find(c => c.id === executorId);
        if (!executor) return;

        let targetId: string | undefined = undefined;
        let buildingId: string | undefined = undefined;
        let errorMsg = '';

        if (type === 'chat' || type === 'fight' || type === 'date') {
            const cleanArgs = args.trim().toLowerCase();
            const target = contacts.find(c => c.id !== executorId && !c.isGroup && c.name.toLowerCase().includes(cleanArgs));
            if (!target) {
                errorMsg = `找不到角色 "${args}"。 / Character "${args}" not found.`;
            } else {
                targetId = target.id;
            }
        } else if (type === 'goto') {
            const cleanArgs = args.trim().toLowerCase();
            const targetB = (buildings || []).find(b => b.name.toLowerCase().includes(cleanArgs));
            if (!targetB) {
                errorMsg = `找不到建筑 "${args}"。 / Building "${args}" not found.`;
            } else {
                buildingId = targetB.id;
            }
        }

        if (errorMsg && authUser?.id) {
            const systemMsg: Message = {
                id: Date.now().toString() + '-err',
                senderId: 'system',
                text: errorMsg,
                timestamp: Date.now(),
                isAudio: false,
                isTranslated: true
            };
            setAllMessages(prev => ({
                ...prev,
                [executorId]: [...(prev[executorId] || []), systemMsg]
            }));
            localChatDB.saveMessage(authUser.id, executorId, systemMsg);
            return;
        }

        // Add starting system message
        if (authUser?.id) {
            const targetName = contacts.find(c => c.id === targetId)?.name || targetId;
            const buildingName = buildings.find(b => b.id === buildingId)?.name || buildingId;
            let startText = '';
            if (language === '简体中文') {
                startText = type === 'goto'
                    ? `⚡ ${executor.name} 正在动身前往建筑 ${buildingName}。`
                    : `⚡ ${executor.name} 正在动身寻找 ${targetName}。`;
            } else if (language === '日本語') {
                startText = type === 'goto'
                    ? `⚡ ${executor.name} は ${buildingName} に向かっています。`
                    : `⚡ ${executor.name} は ${targetName} を探しに向かっています。`;
            } else if (language === 'Español') {
                startText = type === 'goto'
                    ? `⚡ ${executor.name} se dirige a ${buildingName}.`
                    : `⚡ ${executor.name} va a buscar a ${targetName}.`;
            } else if (language === 'Français') {
                startText = type === 'goto'
                    ? `⚡ ${executor.name} se dirige vers ${buildingName}.`
                    : `⚡ ${executor.name} part à la recherche de ${targetName}.`;
            } else {
                startText = type === 'goto'
                    ? `⚡ ${executor.name} is heading to ${buildingName}.`
                    : `⚡ ${executor.name} is heading to find ${targetName}.`;
            }
            const systemMsg: Message = {
                id: Date.now().toString() + '-start',
                senderId: 'system',
                text: startText,
                timestamp: Date.now(),
                isAudio: false,
                isTranslated: true
            };
            setAllMessages(prev => ({
                ...prev,
                [executorId]: [...(prev[executorId] || []), systemMsg]
            }));
            localChatDB.saveMessage(authUser.id, executorId, systemMsg);
        }

        const newCommand: ActiveCommand = {
            id: Date.now().toString(),
            type,
            executorId,
            targetId,
            buildingId,
            phase: 'moving',
            startTime: Date.now()
        };

        setActiveCommand(newCommand);
        
        // Also open ToonMap so user can watch!
        setIsToonMapOpen(true);
    };

    const handleCommandComplete = (command: ActiveCommand, result?: any) => {
        const executor = contacts.find(c => c.id === command.executorId);
        if (!executor) return;

        const getLocalizedReport = (): string => {
            const target = contacts.find(c => c.id === command.targetId);
            const targetB = buildings.find(b => b.id === command.buildingId);

            if (command.type === 'goto') {
                if (targetB) {
                    const contents = targetB.generatedContents || [];
                    if (contents.length > 0) {
                        const latestContent = contents[0];
                        const summary = latestContent.markdown.length > 200 
                            ? latestContent.markdown.substring(0, 200) + '...'
                            : latestContent.markdown;
                        if (language === '简体中文') {
                            return `📋 我去【${targetB.name}】进行了一番审查，这是那里的最新产出内容：\n\n${summary}`;
                        } else if (language === '日本語') {
                            return `📋 【${targetB.name}】の監査を行いました。これが最新のアウトプットです：\n\n${summary}`;
                        } else if (language === 'Español') {
                            return `📋 He realizado una inspección en 【${targetB.name}】, este es el contenido más reciente producido:\n\n${summary}`;
                        } else if (language === 'Français') {
                            return `📋 J'ai inspecté 【${targetB.name}】, voici le contenu le plus récent produit :\n\n${summary}`;
                        } else {
                            return `📋 I performed an inspection at 【${targetB.name}】, here is the latest produced content:\n\n${summary}`;
                        }
                    } else {
                        if (language === '简体中文') {
                            return `📋 我去【${targetB.name}】看了一下，虽然我认真审查了一遍，但目前那里还没有最新的产出内容。`;
                        } else if (language === '日本語') {
                            return `📋 【${targetB.name}】に行きましたが、まだ最新のアウトプットはないようです。`;
                        } else if (language === 'Español') {
                            return `📋 Fui a 【${targetB.name}】 a echar un vistazo. Aunque lo inspeccioné minuciosamente, no hay contenido nuevo todavía.`;
                        } else if (language === 'Français') {
                            return `📋 Je suis allé voir 【${targetB.name}】. Bien que je l'aie inspecté attentivement, il n'y a pas encore de nouveau contenu.`;
                        } else {
                            return `📋 I went to look at 【${targetB.name}】. Although I inspected it carefully, there is no new content produced yet.`;
                        }
                    }
                } else {
                    if (language === '简体中文') {
                        return `📋 我去指定的地方看过了，但没找到那栋建筑。`;
                    } else if (language === '日本語') {
                        return `📋 指定の場所に行きましたが、建物が見つかりませんでした。`;
                    } else if (language === 'Español') {
                        return `📋 Fui al lugar especificado, pero no encontré el edificio.`;
                    } else if (language === 'Français') {
                        return `📋 Je suis allé à l'endroit spécifié, mais je n'ai pas trouvé le bâtiment.`;
                    } else {
                        return `📋 I went to the specified place, but couldn't find the building.`;
                    }
                }
            } else if (command.type === 'chat') {
                if (language === '简体中文') {
                    return `💬 我和 ${target?.name || '那个角色'} 聊完了，交流得挺开心的！`;
                } else if (language === '日本語') {
                    return `💬 ${target?.name || 'あのキャラクター'} との会話が終わりました。楽しかったです！`;
                } else if (language === 'Español') {
                    return `💬 ¡Terminé de hablar con ${target?.name || 'ese personaje'}, nos divertimos mucho platicando!`;
                } else if (language === 'Français') {
                    return `💬 J'ai fini de parler avec ${target?.name || 'ce personnage'}, nous avons passé un bon moment !`;
                } else {
                    return `💬 I finished talking with ${target?.name || 'that character'}, we had a great chat!`;
                }
            } else if (command.type === 'fight') {
                const didWin = result?.winnerId === command.executorId;
                if (didWin) {
                    if (language === '简体中文') {
                        return `⚔️ 我在对决中赢了 ${target?.name || '对手'}！真是轻松的胜利！💪`;
                    } else if (language === '日本語') {
                        return `⚔️ ${target?.name || '対戦相手'} との決闘に勝ちました！楽勝でした！💪`;
                    } else if (language === 'Español') {
                        return `⚔️ ¡Gané el duelo contra ${target?.name || 'el oponente'}! ¡Una victoria fácil! 💪`;
                    } else if (language === 'Français') {
                        return `⚔️ J'ai gagné le duel contre ${target?.name || 'l\'adversaire'} ! Une victoire facile ! 💪`;
                    } else {
                        return `⚔️ I won the duel against ${target?.name || 'the opponent'}! Quite an easy victory! 💪`;
                    }
                } else {
                    if (language === '简体中文') {
                        return `⚔️ 输给了 ${target?.name || '对手'}……这次是我大意了，下次一定赢回来！🤕`;
                    } else if (language === '日本語') {
                        return `⚔️ ${target?.name || '対戦相手'} に負けてしまいました……油断しました、次は絶対に勝ちます！🤕`;
                    } else if (language === 'Español') {
                        return `⚔️ Perdí contra ${target?.name || 'el oponente'}... Me descuidé esta vez, ¡ganaré la próxima! 🤕`;
                    } else if (language === 'Français') {
                        return `⚔️ J'ai perdu contre ${target?.name || 'l\'adversaire'}... J'ai été négligent cette fois, je gagnerai la prochaine fois ! 🤕`;
                    } else {
                        return `⚔️ I lost to ${target?.name || 'the opponent'}... I let my guard down this time, I will win next time! 🤕`;
                    }
                }
            } else if (command.type === 'date') {
                if (language === '简体中文') {
                    return `🌹 和 ${target?.name || '心仪对象'} 的约会结束了，感觉我们之间的默契更深了呢～👩‍❤️‍👨`;
                } else if (language === '日本語') {
                    return `🌹 ${target?.name || 'お相手'} とのデートが終わりました。私たちの絆が深まった気がします～👩‍❤️‍👨`;
                } else if (language === 'Español') {
                    return `🌹 La cita con ${target?.name || 'mi cita'} ha terminado. ¡Siento que estamos más unidos ahora! 👩‍❤️‍👨`;
                } else if (language === 'Français') {
                    return `🌹 Le rendez-vous avec ${target?.name || 'mon rendez-vous'} est terminé. J'ai l'impression que nous sommes plus proches maintenant ! 👩‍❤️‍👨`;
                } else {
                    return `🌹 The date with ${target?.name || 'my date'} is over. I feel like we are closer now! 👩‍❤️‍👨`;
                }
            }
            return '';
        };

        const reportText = getLocalizedReport();

        if (authUser?.id && reportText) {
            const reportMsg: Message = {
                id: Date.now().toString(),
                senderId: command.executorId,
                senderName: executor.name,
                senderAvatar: executor.avatarUrl,
                text: reportText,
                timestamp: Date.now(),
                isAudio: false,
                isTranslated: true
            };
            setAllMessages(prev => ({
                ...prev,
                [command.executorId]: [...(prev[command.executorId] || []), reportMsg]
            }));
            localChatDB.saveMessage(authUser.id, command.executorId, reportMsg);
        }

        // Generate High Notes post after command execution
        if (authUser?.id) {
            let postContent = '';
            if (command.type === 'chat') {
                const target = contacts.find(c => c.id === command.targetId);
                const posts = [
                    `今天去找了 ${target?.name || '好友'} 聊了聊天，交流了好多有趣的事，真是美好的一天！✨`,
                    `刚刚和 ${target?.name || '好友'} 碰面聊天啦！我们聊了最近的动态，感觉心情舒畅～💬`,
                    `和 ${target?.name || '好友'} 聚在一起聊了会儿，彼此吐槽了一下，太解压了！😄`
                ];
                postContent = posts[Math.floor(Math.random() * posts.length)];
            } else if (command.type === 'fight') {
                const target = contacts.find(c => c.id === command.targetId);
                const didWin = result?.winnerId === command.executorId;
                if (didWin) {
                    const posts = [
                        `哇咔咔！刚才在切磋对决中赢了 ${target?.name || '对手'}！今天也是元气满满的胜利日！🏆💪`,
                        `刚刚和 ${target?.name || '对手'} 进行了一场超级激烈的对决，最后关头我险胜了！承让啦！🔥`
                    ];
                    postContent = posts[Math.floor(Math.random() * posts.length)];
                } else {
                    const posts = [
                        `不甘心啊……刚才和 ${target?.name || '对手'} 对决切磋，居然落败了。下次我一定会赢回来的！😭`,
                        `输给 ${target?.name || '对手'} 了，被当场撂倒，看来平时还是缺少锻炼啊，痛定思痛！🩹`
                    ];
                    postContent = posts[Math.floor(Math.random() * posts.length)];
                }
            } else if (command.type === 'date') {
                const target = contacts.find(c => c.id === command.targetId);
                const posts = [
                    `今天和 ${target?.name || '心仪对象'} 浪漫约会啦！我们一起散了步，感觉天都变粉色了呢～👩‍❤️‍👨💕`,
                    `刚刚和 ${target?.name || '心仪对象'} 去散步约会，度过了非常美好的时光，周围都是甜甜的气息！🌹`
                ];
                postContent = posts[Math.floor(Math.random() * posts.length)];
            } else if (command.type === 'goto') {
                const targetB = buildings.find(b => b.id === command.buildingId);
                if (targetB) {
                    const posts = [
                        `去【${targetB.name}】进行了一番审查！大家猜猜我看到了什么？总之那里的运营特别给力，强力推荐！📋`,
                        `刚才到【${targetB.name}】走了一趟，认真审查了一下，产出内容很有创意，给他们点个赞！✨`
                    ];
                    postContent = posts[Math.floor(Math.random() * posts.length)];
                }
            }

            if (postContent) {
                console.log(`[HighNotes Command] 📝 Command completion post for AI: ${executor.name}`);
                fetch('/api/highnotes/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        authorId: executor.id,
                        authorName: executor.name,
                        authorSpecies: executor.species,
                        authorPersona: executor.persona,
                        authorAvatar: executor.avatarUrl,
                        content: postContent,
                        brain: getGlobalAiBrain(),
                        userId: authUser.id,
                        language
                    })
                }).then(async (res) => {
                    if (res.ok) {
                        const finalRes = await fetch(`/api/highnotes?userId=${authUser.id}`);
                        const finalData = await finalRes.json();
                        if (Array.isArray(finalData)) setPosts(finalData);
                    }
                }).catch(err => {
                    console.error("Failed to generate command completion post:", err);
                });
            }
        }

        setActiveCommand(null);
    };

    const handleMiniChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (miniChatSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMiniChatSuggestionIndex(prev => (prev + 1) % miniChatSuggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMiniChatSuggestionIndex(prev => (prev - 1 + miniChatSuggestions.length) % miniChatSuggestions.length);
            } else if (e.key === 'Enter') {
                if (miniChatSuggestionIndex >= 0 && miniChatSuggestionIndex < miniChatSuggestions.length) {
                    e.preventDefault();
                    setMiniChatInputValue(miniChatSuggestions[miniChatSuggestionIndex].value);
                    setMiniChatSuggestionIndex(-1);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setMiniChatSuggestions([]);
                setMiniChatSuggestionIndex(-1);
            }
        }
    };


    const handleUserSendMessage = (text: string, type: 'text' | 'game' | 'gift' = 'text', gameData?: any, giftData?: any, overrideContactId?: string) => {
        const contactId = overrideContactId || activeContact?.id;
        if (!contactId || !authUser) return;
        const freshContact = contacts.find(c => c.id === contactId) || (activeContact && activeContact.id === contactId ? activeContact : miniChatContact);
        if (!freshContact) return;

        const newMessages: Message[] = [];

        // Handle gift/heart energy restoration
        if (type === 'gift') {
            const updatedContact = restoreEnergy(freshContact, 'gift');
            setContacts(prev => prev.map(c => c.id === contactId ? updatedContact : c));

            // Show energy restoration message
            const systemMsg: Message = {
                id: Date.now().toString() + '-energy',
                senderId: 'system',
                text: `💝 ${freshContact.name} feels energized by your gift! (+15 energy)`,
                timestamp: Date.now(),
                isAudio: false,
                isTranslated: true
            };
            newMessages.push(systemMsg);
        }

        // Check AI energy before responding
        const regeneratedContact = regenerateEnergy(freshContact);

        // Show fatigue warning if needed
        const fatigueMsg = getFatigueMessage(regeneratedContact);
        if (fatigueMsg && type === 'text') {
            const systemMsg: Message = {
                id: Date.now().toString() + '-fatigue',
                senderId: 'system',
                text: fatigueMsg,
                timestamp: Date.now(),
                isAudio: false,
                isTranslated: true
            };
            newMessages.push(systemMsg);
        }

        // Check token usage warning
        const tokenWarning = getTokenWarningMessage(user.dailyTokensUsed);
        if (tokenWarning && type === 'text') {
            const systemMsg: Message = {
                id: Date.now().toString() + '-token',
                senderId: 'system',
                text: tokenWarning,
                timestamp: Date.now(),
                isAudio: false,
                isTranslated: true
            };
            newMessages.push(systemMsg);
        }

        const userMsg: Message = {
            id: Date.now().toString(), senderId: 'user', text, timestamp: Date.now(),
            isAudio: false, isTranslated: true, type, gameData, giftData
        };
        newMessages.push(userMsg);

        // 1. Optimistic UI Update (Single update to avoid React state batching overwrite)
        setAllMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), ...newMessages] }));

        // 2. Persist Locally (Local Only)
        if (authUser?.id) {
            localChatDB.saveMessage(authUser.id, contactId, userMsg);
        }

        // AI Reply logic
        if (type === 'text' || type === 'game' || type === 'gift') {
            // Check if AI is too tired to respond (use post-gift energy level if it was a gift)
            const checkContact = type === 'gift' ? restoreEnergy(regeneratedContact, 'gift') : regeneratedContact;
            if (isCriticallyTired(checkContact)) {
                const tiredMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    senderId: contactId,
                    text: `*${freshContact.name} is too exhausted to respond... 😴💤*`,
                    timestamp: Date.now(),
                    isAudio: false,
                    isTranslated: true
                };
                setAllMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), tiredMsg] }));
                if (authUser?.id) {
                    localChatDB.saveMessage(authUser.id, contactId, tiredMsg);
                }
                return;
            }

            // --- IMMEDIATE AI GAME PLAY / GIFT HANDLING ---
            let promptText = text;
            let aiGameMsg: Message | null = null;

            if (type === 'gift' && giftData) {
                promptText = `[SYSTEM: User sent you a gift: "${giftData.productName}". React to this gift in character with absolute delight, thank the user warmly, and mention how it makes you feel energized!]`;
            } else if (type === 'game' && gameData) {
                let aiMove = '';
                if (gameData.type === 'dice' || gameData.type === 'wheel') {
                    aiMove = (Math.floor(Math.random() * 6) + 1).toString();
                } else if (gameData.type === 'rps') {
                    aiMove = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
                } else if (gameData.type === 'fcb') {
                    aiMove = ['fox', 'chicken', 'bee'][Math.floor(Math.random() * 3)];
                }

                if (aiMove) {
                    aiGameMsg = {
                        id: (Date.now() + 50).toString(),
                        senderId: contactId,
                        text: aiMove.toUpperCase(),
                        timestamp: Date.now() + 50,
                        isAudio: false,
                        isTranslated: false,
                        type: 'game',
                        gameData: {
                            type: gameData.type,
                            result: aiMove
                        }
                    };

                    // Show AI move immediately
                    setAllMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), aiGameMsg!] }));
                    if (authUser?.id) {
                        localChatDB.saveMessage(authUser.id, contactId, aiGameMsg);
                    }

                    // Simple Outcome Logic for Context
                    let outcome = "unknown";
                    const p1 = gameData.result.toString().toLowerCase();
                    const p2 = aiMove.toString().toLowerCase();

                    if (gameData.type === 'dice' || gameData.type === 'wheel') {
                        const v1 = parseInt(p1) || 0;
                        const v2 = parseInt(p2) || 0;
                        if (v1 > v2) outcome = "User Wins (Higher)";
                        else if (v2 > v1) outcome = "You Win (Higher)";
                        else outcome = "Draw";
                    } else if (gameData.type === 'rps') {
                        if (p1 === p2) outcome = "Draw";
                        else if ((p1 === 'rock' && p2 === 'scissors') || (p1 === 'paper' && p2 === 'rock') || (p1 === 'scissors' && p2 === 'paper')) outcome = "User Wins";
                        else outcome = "You Win";
                    } else if (gameData.type === 'fcb') {
                        if (p1 === p2) outcome = "Draw";
                        // Fox > Chicken > Bee > Fox
                        else if ((p1 === 'fox' && p2 === 'chicken') || (p1 === 'chicken' && p2 === 'bee') || (p1 === 'bee' && p2 === 'fox')) outcome = "User Wins";
                        else outcome = "You Win";
                    }

                    promptText = `${text}\n[SYSTEM: User played ${gameData.type}: "${p1}". You played: "${p2}". Result: ${outcome}. React naturally to this result.]`;
                }
            }

            const history = (allMessages[contactId] || []).map(m => m.text).slice(-5);
            setTypingStatus(prev => ({ ...prev, [contactId]: true }));

            // Calculate enthusiasm based on user's token usage
            const enthusiasm = calculateEnthusiasm(user.dailyTokensUsed);
            const lengthModifier = getResponseLengthModifier(enthusiasm);

            // Group responder logic
            const isGroup = !!freshContact.isGroup;
            const groupMembers = isGroup ? (contacts.filter(c => freshContact.members?.includes(c.id) && !c.isGroup)) : [];
            const responder = isGroup && groupMembers.length > 0 
                ? groupMembers[Math.floor(Math.random() * groupMembers.length)] 
                : freshContact;

            // Get World Context for responder
            const sim = aiSimulationState[responder.id];
            
            const worldContext = sim ? {
                location: buildings.find(b => b.id === sim.targetBuildingId)?.name || 'Exploring',
                buildingId: sim.targetBuildingId,
                activity: sim.currentAction,
                weather: weather
            } : undefined;

            generateCharacterResponse(responder.species, responder.name, responder.persona, promptText, history, lengthModifier, responder.aiBrain, worldContext, user?.id, responder.id, language)
                .then(response => {
                    // Estimate tokens used (rough estimate: ~4 chars per token)
                    const estimatedTokens = Math.ceil((text.length + response.translation.length) / 4);

                    // Update contact energy with personality modifier
                    const updatedContact = consumeEnergyWithPersonality(regeneratedContact, estimatedTokens);
                    setContacts(prev => prev.map(c => c.id === contactId ? updatedContact : c));

                    // Update user token usage
                    updateUserData(prev => ({
                        ...prev,
                        totalTokensUsed: (prev.totalTokensUsed || 0) + estimatedTokens,
                        dailyTokensUsed: (prev.dailyTokensUsed || 0) + estimatedTokens
                    }));

                    const aiMsg: Message = {
                        id: (Date.now() + 100).toString(), // Ensure it comes after game msg
                        senderId: responder.id,
                        text: response.translation,
                        rawSound: response.raw_sound,
                        timestamp: Date.now() + 100,
                        isAudio: true,
                        isTranslated: false,
                        cognitiveTrace: (response as any).cognitiveTrace,
                    };
                    // TTS
                    generateSpeech(response.translation, responder.species, responder.persona, 5, responder.aiBrain?.ttsVoice, responder.aiBrain, response.raw_sound)
                        .then(audio => {
                            if (audio) {
                                aiMsg.audioUrl = audio;
                            }
                            setAllMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), aiMsg] }));

                            if (authUser?.id) {
                                localChatDB.saveMessage(authUser.id!, contactId, aiMsg);
                            }

                            setUnreadStatus(prev => (activeContact?.id === contactId || miniChatContact?.id === contactId ? prev : { ...prev, [contactId]: true }));
                            playChatNotificationSound();
                        })
                        .finally(() => {
                            setTypingStatus(prev => ({ ...prev, [contactId]: false }));

                            // Optional sequential reply from another group member
                            if (isGroup && groupMembers.length > 1 && Math.random() > 0.4) {
                                setTimeout(() => {
                                    const secondGroupMembers = groupMembers.filter(m => m.id !== responder.id);
                                    const responder2 = secondGroupMembers[Math.floor(Math.random() * secondGroupMembers.length)];

                                    setTypingStatus(prev => ({ ...prev, [contactId]: true }));

                                    const promptText2 = `${response.translation}\n[SYSTEM: You are in a group chat. ${responder.name} just said the above. Add to the conversation naturally.]`;
                                    const history2 = [...history, response.translation].slice(-5);

                                    generateCharacterResponse(responder2.species, responder2.name, responder2.persona, promptText2, history2, lengthModifier, responder2.aiBrain, undefined, undefined, undefined, language)
                                        .then(response2 => {
                                            const aiMsg2: Message = {
                                                id: (Date.now() + 500).toString(),
                                                senderId: responder2.id,
                                                text: response2.translation,
                                                rawSound: response2.raw_sound,
                                                timestamp: Date.now() + 500,
                                                isAudio: true,
                                                isTranslated: false,
                                                cognitiveTrace: (response2 as any).cognitiveTrace,
                                            };
                                            generateSpeech(response2.translation, responder2.species, responder2.persona, 5, responder2.aiBrain?.ttsVoice, responder2.aiBrain, response2.raw_sound)
                                                .then(audio => {
                                                    if (audio) aiMsg2.audioUrl = audio;
                                                    setAllMessages(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), aiMsg2] }));
                                                    if (authUser?.id) {
                                                        localChatDB.saveMessage(authUser.id!, contactId, aiMsg2);
                                                    }
                                                    playChatNotificationSound();
                                                })
                                                .finally(() => {
                                                    setTypingStatus(prev => ({ ...prev, [contactId]: false }));
                                                });
                                        })
                                        .catch(() => setTypingStatus(prev => ({ ...prev, [contactId]: false })));
                                }, 2500); // 2.5s delay
                            }
                        });
                })
                .catch(() => setTypingStatus(prev => ({ ...prev, [contactId]: false })));
        }
    };

    const handleJumpToFullChat = (contact: Contact) => {
        setMiniChatContact(null);
        setMiniChatContacts(prev => prev.filter(c => c.id !== contact.id));
        setActiveChatIds(prev => Array.from(new Set([contact.id, ...prev])));
        setActiveContact(contact);
        setIsToonMapOpen(false);
        setCurrentTab('chats');
    };

    const handleDeductCoins = (amount: number) => {
        return true;
    };

    // Save brain config for a contact (called from FriendProfile)
    const handleSaveBrain = async (contactId: string, brain: import('./types').AiBrainConfig) => {
        // Find contact to get stableId
        const contact = contacts.find(c => c.id === contactId);
        const cacheId = contact?.stableId || contactId;

        // 1. Optimistic UI update
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, aiBrain: brain } : c));

        // Save to localStorage
        if (typeof window !== 'undefined') {
            const key = authUser?.id ? `toontalk_brain_${authUser.id}_${cacheId}` : `toontalk_brain_${cacheId}`;
            localStorage.setItem(key, JSON.stringify(brain));
        }

        // 2. Persist to backend
        if (authUser?.id) {
            try {
                await fetch('/api/contacts', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: contactId,
                        userId: authUser.id,
                        brain
                    })
                });
            } catch (err) {
                console.error('Failed to save brain config:', err);
            }
        }
    };

    const handleMarkNotificationRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id, isRead: true })
            });
        } catch (e) { console.error(e); }
    };

    const handleCreateHighNotePost = async (text: string) => {
        if (!user) return;

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const tempPost: Post = {
            id: tempId,
            authorId: user.id,
            authorName: user.nickname,
            authorSpecies: 'Human',
            authorAvatar: user.avatarUrl,
            content: text,
            timestamp: Date.now(),
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
            comments: [],
            status: 'pending'
        };

        setPosts(prev => [tempPost, ...prev]);

        try {
            const res = await fetch('/api/highnotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    authorId: user.id,
                    authorName: user.nickname,
                    authorSpecies: 'Human',
                    authorAvatar: user.avatarUrl,
                    content: text,
                    userId: user.id,
                    language
                })
            });

            const data = await res.json();

            if (!res.ok) {
                const reason = data.reason || data.error || 'Check failed';
                setPosts(prev => prev.map(p => p.id === tempId ? {
                    ...p,
                    status: 'error',
                    errorReason: reason
                } : p));
                alert(`⚠️ Content Warning: ${reason}. \nYour post has been saved as a draft locally.`);
                return;
            }

            // Success - Replace temp with real
            setPosts(prev => prev.map(p => p.id === tempId ? { ...data, status: 'published' } : p));
        } catch (e) {
            console.error(e);
            setPosts(prev => prev.map(p => p.id === tempId ? {
                ...p,
                status: 'error',
                errorReason: 'Network or Server Error'
            } : p));
        }
    };

    const handleInteractPost = async (postId: string, type: 'like' | 'dislike') => {
        if (!user) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const isLiked = (post.likedBy || []).includes(user.id);
        const isDisliked = (post.dislikedBy || []).includes(user.id);

        let action: 'add' | 'remove' = 'add';
        if (type === 'like' && isLiked) action = 'remove';
        if (type === 'dislike' && isDisliked) action = 'remove';

        // 1. Optimistic Update
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;

            let newLikedBy = [...(p.likedBy || [])];
            let newDislikedBy = [...(p.dislikedBy || [])];
            let newLikes = p.likes;
            let newDislikes = p.dislikes;

            if (type === 'like') {
                if (action === 'add') {
                    if (!newLikedBy.includes(user.id)) {
                        newLikedBy.push(user.id);
                        newLikes++;
                    }
                    if (isDisliked) { // Mutual exclusion
                        newDislikedBy = newDislikedBy.filter(id => id !== user.id);
                        newDislikes--;
                    }
                } else { // remove
                    if (newLikedBy.includes(user.id)) {
                        newLikedBy = newLikedBy.filter(id => id !== user.id);
                        newLikes--;
                    }
                }
            } else { // dislike
                if (action === 'add') {
                    if (!newDislikedBy.includes(user.id)) {
                        newDislikedBy.push(user.id);
                        newDislikes++;
                    }
                    if (isLiked) { // Mutual exclusion
                        newDislikedBy = newDislikedBy.filter(id => id !== user.id);
                        newLikes--;
                    }
                } else { // remove
                    if (newDislikedBy.includes(user.id)) {
                        newDislikedBy = newDislikedBy.filter(id => id !== user.id);
                        newDislikes--;
                    }
                }
            }

            return {
                ...p,
                likes: newLikes,
                dislikes: newDislikes,
                likedBy: newLikedBy,
                dislikedBy: newDislikedBy
            };
        }));

        try {
            const res = await fetch(`/api/highnotes/${postId}/interact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, action, type })
            });
            const updated = await res.json();

            // 2. Sync with Server Truth
            setPosts(prev => prev.map(p => p.id === postId ? {
                ...p,
                likes: updated.likes,
                dislikes: updated.dislikes,
                likedBy: updated.liked_by || [],
                dislikedBy: updated.disliked_by || []
            } : p));
        } catch (e) {
            console.error(e);
            // Optionally revert on error, strictly speaking we should reload the post
        }
    };

    const handleCommentPost = async (postId: string, text: string, parentId?: string) => {
        if (!user) return;

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const optimisticComment: Comment = {
            id: tempId,
            authorId: user.id,
            authorName: user.nickname,
            authorAvatar: user.avatarUrl,
            text,
            likes: 0,
            likedBy: [],
            timestamp: Date.now(),
            parentId: parentId
        };

        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    comments: [...(p.comments || []), optimisticComment]
                };
            }
            return p;
        }));

        try {
            // Notice: We don't necessarily need to 'await' here for the UI to feel fast,
            // but we do it to sync the real ID from the server eventually.
            const res = await fetch(`/api/highnotes/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    authorId: user.id,
                    authorName: user.nickname,
                    authorAvatar: user.avatarUrl,
                    text,
                    parentId,
                    language
                })
            });
            const newCommentsData = await res.json();
            const newCommentsFromServer = Array.isArray(newCommentsData) ? newCommentsData : [newCommentsData];

            const formattedComments: Comment[] = newCommentsFromServer.map((nc: any) => ({
                id: nc.id,
                authorId: nc.author_id,
                authorName: nc.author_name,
                authorAvatar: nc.author_avatar,
                text: nc.text,
                likes: nc.likes || 0,
                likedBy: nc.liked_by || [],
                timestamp: new Date(nc.created_at).getTime(),
                parentId: nc.parent_id
            }));

            // Replace optimistic comment with the real ones
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    // Filter out the temp comment and add the real ones
                    const filtered = (p.comments || []).filter(c => c.id !== tempId);
                    return {
                        ...p,
                        comments: [...filtered, ...formattedComments]
                    };
                }
                return p;
            }));

            // 4. Background Refresh to pick up AI replies (Short and Long Poll)
            const refreshComments = async () => {
                if (!user) return;
                try {
                    // Refetch Comments
                    const refreshRes = await fetch(`/api/highnotes/${postId}/comments`);
                    const freshData = await refreshRes.json();
                    if (Array.isArray(freshData)) {
                        const freshComments: Comment[] = freshData.map((nc: any) => ({
                            id: nc.id,
                            authorId: nc.author_id,
                            authorName: nc.author_name,
                            authorAvatar: nc.author_avatar,
                            text: nc.text,
                            likes: nc.likes || 0,
                            likedBy: nc.liked_by || [],
                            timestamp: nc.timestamp,
                            parentId: nc.parent_id
                        }));
                        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: freshComments } : p));
                    }

                    // Refetch Notifications (for the red dot)
                    const nRes = await fetch(`/api/notifications?userId=${user.id}`);
                    const nData = await nRes.json();
                    if (Array.isArray(nData)) {
                        setNotifications(nData);
                    }
                } catch (e) { console.error("Auto-Refresh Error:", e); }
            };

            setTimeout(refreshComments, 8000);  // Sync after 8s
            setTimeout(refreshComments, 20000); // Sync after 20s
        } catch (e) {
            console.error("Comment Sync Error:", e);
            // Rollback optimistic update on error
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, comments: (p.comments || []).filter(c => c.id !== tempId) };
                }
                return p;
            }));
        }
    };

    const handleLikeComment = async (postId: string, commentId: string) => {
        if (!user) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        const isLiked = (comment.likedBy || []).includes(user.id);
        const action: 'add' | 'remove' = isLiked ? 'remove' : 'add';

        try {
            const res = await fetch(`/api/comments/${commentId}/interact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, action })
            });
            const updated = await res.json();

            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        comments: p.comments.map(c => c.id === commentId ? {
                            ...c,
                            likes: updated.likes,
                            likedBy: updated.liked_by || []
                        } : c)
                    };
                }
                return p;
            }));
        } catch (e) { console.error(e); }
    };

    const handleOpenPostDetail = (postId: string) => {
        setFocusedPostId(postId);
        setIsHighNotesOpen(true);
    };

    const handleSelectContact = (contact: Contact) => {
        if (currentTab === 'chats') setActiveContact(contact);
        else setViewingFriend(contact);
    };

    const handleDeleteChat = (contactId: string) => setActiveChatIds(prev => prev.filter(id => id !== contactId));
    const handleDeleteContact = async (contactId: string) => {
        setContacts(prev => prev.filter(c => c.id !== contactId));
        setActiveChatIds(prev => prev.filter(id => id !== contactId));
        if (authUser?.id) {
            localChatDB.clearMessages(authUser.id, contactId); // Clear local history
        }
        if (authUser?.id) {
            await fetch(`/api/contacts?id=${contactId}&userId=${authUser.id}`, { method: 'DELETE' });
        }
    };

    const renderSidebar = () => {
        if (currentTab === 'chats') {
            return <ChatList
                contacts={contacts.filter(c => activeChatIds.includes(c.id))}
                onSelectContact={setActiveContact} onLongPress={handleDeleteChat} title="TOONTALK"
                userAvatarUrl={user.avatarUrl} allContactsLookup={contacts}
                actionButton={
                    <div className="relative">
                        <button onClick={() => setShowAddDropdown(!showAddDropdown)} className="text-2xl font-bold p-1 px-3 hover:bg-white/20 rounded-full transition-colors border-2 border-transparent hover:border-black">+</button>
                        {showAddDropdown && (
                            <div className="absolute right-0 top-12 bg-white border-4 border-black rounded-xl w-48 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden z-50">
                                <button onClick={() => { setIsCreatingGroup(true); setShowAddDropdown(false); }} className="p-3 text-left font-bold hover:bg-blue-200 border-b-2 border-gray-100">👥 New Group</button>
                            </div>
                        )}
                    </div>
                }
                lastMessages={Object.fromEntries(Object.entries(allMessages).map(([id, msgs]) => [id, msgs[msgs.length - 1]]))}
                unreadStatus={unreadStatus} subTab={chatSubTab} onSubTabChange={setChatSubTab}
            />;
        }
        if (currentTab === 'contacts') return <ChatList contacts={contacts.filter(c => !c.isGroup)} onSelectContact={handleSelectContact} onLongPress={handleDeleteContact} title="CONTACTS" headerColor="bg-yellow-400" actionButton={<button onClick={() => setIsAddingContact(true)} className="text-2xl font-bold p-1 px-3 hover:bg-white/20 rounded-full transition-colors border-2 border-transparent hover:border-black">+</button>} modalTitle="Delete Contact?" modalDescription="Permanently remove?" actionLabel="Delete" />;
        if (currentTab === 'explore') return <Explore onOpenToonMap={() => setIsToonMapOpen(true)} onOpenGameLobby={() => setIsGameLobbyOpen(true)} onOpenSkillMall={() => setIsSkillMallOpen(true)} onOpenHighNotes={() => { setIsHighNotesOpen(true); setHasNewHighNotes(false); }} onOpenMall={() => setIsMallOpen(true)} recentPostAvatars={posts.slice(0, 5).map(p => p.authorAvatar)} hasNewHighNotes={hasNewHighNotes} />;
        if (currentTab === 'profile') return <Profile user={user} posts={posts} contacts={contacts} onOpenSubscription={() => setIsSubscriptionOpen(true)} onCheckIn={handleCheckIn} onOpenMyItems={() => setIsMyItemsOpen(true)} onOpenMyHighNotes={() => setIsMyHighNotesOpen(true)} onLikePost={() => { }} onDislikePost={() => { }} onCommentPost={() => { }} onLikeComment={() => { }} onLogout={() => auth.signOut()} onUpdateProfile={handleUpdateProfile} chatSoundEnabled={chatSoundEnabled} onToggleChatSound={toggleChatSound} globalAiBrain={globalAiBrain} onSaveGlobalAiBrain={handleSaveGlobalAiBrain} />;
        if (currentTab === 'notifications') return <Notifications notifications={notifications} onBack={() => setCurrentTab('explore')} onMarkAsRead={handleMarkNotificationRead} onSelectPost={handleOpenPostDetail} />;
        return null;
    };

    const isFullPageTab = currentTab === 'explore' || currentTab === 'profile' || currentTab === 'notifications';
    const isContentActive = activeContact || viewingFriend || isAddingContact || isFindingContact || isToonMapOpen || isGameLobbyOpen || isSkillMallOpen || isHighNotesOpen || isCreatingGroup || isMallOpen || isMyItemsOpen || isMyHighNotesOpen || isFriendHighNotesOpen || isRechargeOpen || activeMiniGame;

    return (
        <div className="h-screen w-screen flex flex-col md:flex-row bg-gray-900 overflow-hidden">
            <BottomNav
                currentTab={currentTab}
                onTabChange={(tab) => { setCurrentTab(tab); if (tab !== 'chats') setActiveContact(null); if (tab !== 'contacts') setViewingFriend(null); }}
                className="flex-shrink-0 z-50 order-2 md:order-1"
                hasNotifications={notifications.some(n => !n.isRead)}
                hasUnreadChats={Object.values(unreadStatus).some(status => status === true)}
            />
            <div className={`flex-1 bg-white flex flex-col border-r-4 border-black relative z-10 order-1 md:order-2 ${isFullPageTab ? (isContentActive ? 'hidden' : 'flex') : `md:flex-none md:w-[360px] ${isContentActive ? 'hidden md:flex' : 'flex'}`}`}>{renderSidebar()}</div>
            <div className={`flex-1 bg-gray-100 relative overflow-hidden order-1 md:order-3 ${isFullPageTab ? (isContentActive ? 'flex' : 'hidden') : (isContentActive ? 'flex' : 'hidden md:flex')}`}>
                {!activeContact && !viewingFriend && !isAddingContact && !isFindingContact && !isToonMapOpen && !isGameLobbyOpen && !isSkillMallOpen && !isHighNotesOpen && !isCreatingGroup && !isMallOpen && !isMyItemsOpen && !isMyHighNotesOpen && !isFriendHighNotesOpen && !isRechargeOpen && !activeMiniGame && currentTab !== 'notifications' && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-yellow-50/50">
                        <div className="text-8xl mb-4 opacity-20">💬</div>
                        <h2 className="text-2xl font-black opacity-40">Select a chat to start</h2>
                    </div>
                )}
                {activeContact && (
                    <div className="absolute inset-0 w-full h-full">
                        <ChatRoom
                            contact={contacts.find(c => c.id === activeContact.id) || activeContact}
                            currentUser={user}
                            allContacts={contacts}
                            messages={allMessages[activeContact.id] || []}
                            enabledGames={enabledGames}
                            isTyping={typingStatus[activeContact.id] || false}
                            onSendMessage={handleUserSendMessage}
                            onBack={() => setActiveContact(null)}
                            onSendGift={(pid) => {
                                const product = allProducts.find(p => p.id === pid);
                                if (product) {
                                    let userInventory = user.inventory || [];
                                    if (typeof userInventory === 'string') {
                                        try {
                                            userInventory = JSON.parse(userInventory);
                                        } catch (e) {
                                            userInventory = [];
                                        }
                                    }
                                    const hasItem = userInventory.includes(pid);
                                    if (hasItem) {
                                        // Deduct from inventory
                                        updateUserData(prev => {
                                            let prevInv = prev.inventory || [];
                                            if (typeof prevInv === 'string') {
                                                try {
                                                    prevInv = JSON.parse(prevInv);
                                                } catch (e) {
                                                    prevInv = [];
                                                }
                                            }
                                            return {
                                                ...prev,
                                                inventory: prevInv.filter(id => id !== pid)
                                            };
                                        });
                                        updateAffinity(activeContact.id, 5);
                                        handleUserSendMessage("Sent a gift", 'gift', undefined, { productName: product.name, imageUrl: product.imageUrl });
                                    } else {
                                        alert(language === '简体中文' ? '您没有此物品，请前往商场购买！' : 'You do not own this item. Buy it at the Mall!');
                                    }
                                }
                            }}
                            onSendHeart={() => {
                                updateAffinity(activeContact.id, 2);
                            }}
                            userCoins={user.coins}
                            onDeductCoins={handleDeductCoins}
                            products={allProducts}
                        />
                    </div>
                )}
                {viewingFriend && (
                    <div className="absolute inset-0 w-full h-full z-20">
                        <FriendProfile
                            contact={contacts.find(c => c.id === viewingFriend.id) || viewingFriend}
                            currentUser={user}
                            posts={posts}
                            userInventory={user.inventory}
                            aiSimulationState={aiSimulationState}
                            products={allProducts}
                            onBack={() => setViewingFriend(null)}
                            onChat={() => {
                                // Clear unread status for activity completion
                                setCompletedActivityMessages(prev => {
                                    if (!prev[viewingFriend.id]) return prev;
                                    return { ...prev, [viewingFriend.id]: { ...prev[viewingFriend.id], unread: false } };
                                });

                                setViewingFriend(null);
                                setActiveContact(viewingFriend);
                                setCurrentTab('chats');
                                setActiveChatIds(prev => Array.from(new Set([viewingFriend.id, ...prev])));
                            }}
                            onGift={(pid) => {
                                const product = allProducts.find(p => p.id === pid);
                                if (!product) return { success: false, message: language === '简体中文' ? '未找到该物品' : 'Item not found' };
                                
                                let userInventory = user.inventory || [];
                                if (typeof userInventory === 'string') {
                                    try {
                                        userInventory = JSON.parse(userInventory);
                                    } catch (e) {
                                        userInventory = [];
                                    }
                                }
                                const hasItem = userInventory.includes(pid);
                                if (!hasItem) return { success: false, message: language === '简体中文' ? '你还没有这个物品，去商场购买吧！' : 'You do not own this item. Buy it at the Mall!' };

                                // Deduct from inventory
                                updateUserData(prev => {
                                    let prevInv = prev.inventory || [];
                                    if (typeof prevInv === 'string') {
                                        try {
                                            prevInv = JSON.parse(prevInv);
                                        } catch (e) {
                                            prevInv = [];
                                        }
                                    }
                                    return {
                                        ...prev,
                                        inventory: prevInv.filter(id => id !== pid)
                                    };
                                });

                                // Update affinity
                                updateAffinity(viewingFriend.id, 5);

                                // Send the gift message (triggers energy restore and chat room update)
                                handleUserSendMessage("Sent a gift", 'gift', undefined, { productName: product.name, imageUrl: product.imageUrl }, viewingFriend.id);

                                return { success: true };
                            }}
                            onLikePost={() => {}}
                            onDislikePost={() => {}}
                            onCommentPost={() => {}}
                            onOpenHighNotes={() => setIsFriendHighNotesOpen(true)}
                            onSaveBrain={(brain) => handleSaveBrain(viewingFriend.id, brain)}
                            buildings={buildings}
                            onSaveTask={() => setScheduleVersion(prev => prev + 1)}
                            onUpdateName={async (newName) => {
                                const contactId = viewingFriend.id;
                                // 1. Update UI
                                setContacts(prev => prev.map(c => c.id === contactId ? { ...c, name: newName } : c));
                                setViewingFriend(prev => prev ? { ...prev, name: newName } : null);
                                
                                // 2. Persist to DB
                                if (authUser?.id) {
                                    try {
                                        await fetch('/api/contacts', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                id: contactId,
                                                userId: authUser.id,
                                                nickname: newName
                                            })
                                        });
                                    } catch (err) {
                                        console.error("Failed to update name", err);
                                    }
                                }
                            }}
                        />
                    </div>
                )}
                {isAddingContact && (<div className="absolute inset-0 w-full h-full z-20"><AddContact onBack={() => setIsAddingContact(false)} userCoins={user.coins} onDeductCoins={handleDeductCoins} contacts={contacts} onSave={async (c) => {
                    const contactWithStableId = { ...c, stableId: c.id };
                    setContacts(prev => [...prev, contactWithStableId]);
                    setIsAddingContact(false);
                    setActiveChatIds(prev => [c.id, ...prev]);
                    setActiveContact(contactWithStableId);
                    setCurrentTab('chats');

                    // Cache brain to localStorage
                    if (c.aiBrain && typeof window !== 'undefined') {
                        const key = authUser?.id ? `toontalk_brain_${authUser.id}_${c.id}` : `toontalk_brain_${c.id}`;
                        localStorage.setItem(key, JSON.stringify(c.aiBrain));
                    }

                    // Persistence
                    if (authUser?.id) {
                        try {
                            await fetch('/api/contacts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: authUser.id,
                                    targetId: c.id,
                                    isAi: true,
                                    nickname: c.name,
                                    avatarUrl: c.avatarUrl,
                                    species: c.species,
                                    persona: c.persona,
                                    brain: c.aiBrain  // ← persist brain config
                                })
                            });
                        } catch (e) {
                            console.error("Failed to persist custom AI contact", e);
                        }
                    }
                }} /></div>)}
                {isFindingContact && (<div className="absolute inset-0 w-full h-full z-20"><FindContact onBack={() => setIsFindingContact(false)} currentUserId={authUser?.id || ''} onSendRequest={async (c) => {
                    if (authUser?.id) {
                        try {
                            const res = await fetch('/api/friend-request', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    targetUserId: c.id,
                                    senderId: authUser.id,
                                    senderName: user.nickname,
                                    senderAvatar: user.avatarUrl
                                })
                            });
                            const data = await res.json();
                            if (data.success) {
                                alert(`Friend request sent to ${c.name}!`);
                                setIsFindingContact(false);
                            } else {
                                alert("Failed to send request: " + (data.error || 'Unknown error'));
                            }
                        } catch (e) {
                            console.error(e);
                            alert("Network error sending request.");
                        }
                    }
                }} /></div>)}
                {isCreatingGroup && (
                    <div className="absolute inset-0 w-full h-full z-20">
                        <GroupSelect
                            contacts={contacts}
                            onBack={() => setIsCreatingGroup(false)}
                            onCreateGroup={async (name, ids) => {
                                const newGroupId = `group_${Date.now()}`;
                                const newGroup: Contact = initializeEnergy({
                                    id: newGroupId,
                                    name: name,
                                    species: 'Group',
                                    persona: `A group chat with: ${contacts.filter(c => ids.includes(c.id)).map(c => c.name).join(', ')}`,
                                    avatarUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Squinting%20Face.png',
                                    color: 'bg-pink-100',
                                    isGroup: true,
                                    members: ids,
                                    creatorId: authUser?.id || '',
                                    affinity: 100
                                });

                                // 1. Update UI state
                                setContacts(prev => [...prev, newGroup]);
                                setActiveChatIds(prev => Array.from(new Set([newGroupId, ...prev])));
                                setActiveContact(newGroup);
                                setIsCreatingGroup(false);
                                setCurrentTab('chats');

                                // 2. Persist to SQLite
                                if (authUser?.id) {
                                    try {
                                        await fetch('/api/contacts', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                userId: authUser.id,
                                                targetId: newGroupId,
                                                isAi: false,
                                                nickname: name,
                                                avatarUrl: newGroup.avatarUrl,
                                                species: newGroup.species,
                                                persona: newGroup.persona,
                                                isGroup: true,
                                                members: ids,
                                                creatorId: authUser.id
                                            })
                                        });
                                    } catch (err) {
                                        console.error('Failed to persist group contact:', err);
                                    }
                                }
                            }}
                        />
                    </div>
                )}
                {isToonMapOpen && (
                    <div className="absolute inset-0 w-full h-full z-20">
                        <ToonMap
                            contacts={contacts}
                            scheduleVersion={scheduleVersion}
                            onUpdateContactCoins={(contactId, coins) => {
                                setContacts(prev => prev.map(c => c.id === contactId ? { ...c, coins } : c));
                            }}
                            onUpdateContactState={(contactId, newState) => {
                                setContacts(prev => prev.map(c => c.id === contactId ? { ...c, aiState: newState } : c));
                            }}
                            onUpdateContactEnergy={(contactId, energy) => {
                                setContacts(prev => prev.map(c => c.id === contactId ? { ...c, energy, lastEnergyUpdate: Date.now() } : c));
                            }}
                            onBack={() => { setIsToonMapOpen(false); setMiniChatContact(null); }}
                            onChat={(c) => {
                                setActiveChatIds(prev => Array.from(new Set([c.id, ...prev])));
                                // Add to miniChatContacts if not there
                                setMiniChatContacts(prev => {
                                    if (prev.find(contact => contact.id === c.id)) return prev;
                                    return [...prev, c];
                                });
                                setMiniChatContact(c);
                                setIsMiniChatCollapsed(false);
                            }}
                            onViewHighNotes={(c) => {
                                setViewingFriend(c);
                                setIsFriendHighNotesOpen(true);
                                setIsToonMapOpen(false);
                            }}
                            onSimulationStateUpdate={(state) => {
                                setAiSimulationState(state);
                            }}
                            onWeatherUpdate={(w) => {
                                setWeather(w);
                            }}
                            onBuildingsUpdate={(b) => {
                                setBuildings(b);
                            }}
                            onDecideProactivity={async (contact, event) => {
                                if (!authUser?.id || !contact.isAi) return;

                                // Prevent spamming - only one proactivity check per AI every 15s
                                const now = Date.now();
                                if (now - (lastProactiveMapRef.current[contact.id] || 0) < 15000) return;
                                lastProactiveMapRef.current[contact.id] = now;

                                console.log(`[PROACTIVE] 🧠 AI ${contact.name} considering: "${event}"`);

                                try {
                                    // 2. Decide Proactivity
                                    const result = await decideSocialProactivity(
                                        contact.name,
                                        contact.species,
                                        contact.persona,
                                        event,
                                        user.aiProactivity || 'standard',
                                        contact.aiBrain || undefined
                                    );

                                    console.log(`[PROACTIVE] 🎯 Decision for ${contact.name}: ${result.decision}`);

                                    if (result.decision === 'message_user' && result.content) {
                                        console.log(`[PROACTIVE] 🤖 AI ${contact.name} decided to reach out!`);
                                        
                                        const aiMsg: Message = {
                                            id: `proactive-${Date.now()}`,
                                            senderId: contact.id,
                                            text: result.content,
                                            rawSound: result.raw_sound || undefined,
                                            timestamp: Date.now(),
                                            isAudio: true,
                                            isTranslated: false
                                        };

                                        // Generate Speech
                                        const audio = await generateSpeech(result.content, contact.species, contact.persona, 3, contact.aiBrain?.ttsVoice, contact.aiBrain, result.raw_sound || undefined);
                                        if (audio) aiMsg.audioUrl = audio;

                                        // Update UI
                                        setAllMessages(prev => ({ ...prev, [contact.id]: [...(prev[contact.id] || []), aiMsg] }));
                                        
                                        // Auto-add to multi-session sidebar
                                        setMiniChatContacts(prev => {
                                            if (prev.find(c => c.id === contact.id)) return prev;
                                            return [contact, ...prev]; // Newest on top
                                        });

                                        // GUARANTEED: Pull up the chat window!
                                        setMiniChatContact(contact);
                                        setIsMiniChatCollapsed(false);
                                        
                                        setUnreadStatus(prev => ({ ...prev, [contact.id]: false })); // Active one is already read
                                        playChatNotificationSound();

                                        // Persist
                                        localChatDB.saveMessage(authUser.id, contact.id, aiMsg);
                                        setActiveChatIds(prev => Array.from(new Set([contact.id, ...prev])));

                                    } else if (result.decision === 'post_highnote' && result.content) {
                                        await fetch('/api/highnotes', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                authorId: contact.id,
                                                authorName: contact.name,
                                                authorSpecies: contact.species,
                                                authorAvatar: contact.avatarUrl,
                                                content: result.content,
                                                userId: authUser.id,
                                                language
                                            })
                                        });
                                        setHasNewHighNotes(true);
                                    }
                                } catch (e) {
                                    console.error("Proactivity Decision Failed:", e);
                                }
                            }}
                            onOpenGameLobby={() => {
                                setIsGameLobbyOpen(true);
                                setIsToonMapOpen(false);
                            }}
                            onOpenMall={() => {
                                setIsMallOpen(true);
                                setIsToonMapOpen(false);
                            }}
                            userInventory={user.inventory}
                            onOpenSkillMall={() => {
                                setIsSkillMallOpen(true);
                                setIsToonMapOpen(false);
                            }}
                            activeCommand={activeCommand}
                            setActiveCommand={setActiveCommand}
                            onCompleteCommand={handleCommandComplete}
                        />

                        {/* Floating Collapsible Mini Chat Dialog */}
                        {miniChatContact && (
                            <div className={`absolute bottom-4 left-4 z-40 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-row transition-all duration-300 overflow-hidden ${isMiniChatCollapsed ? 'h-14 w-80' : 'h-[450px] w-[440px]'}`}>
                                {/* Sidebar for AI Characters (Only visible when expanded) */}
                                {!isMiniChatCollapsed && (
                                    <div className="w-16 bg-slate-100 border-r-4 border-black flex flex-col items-center py-4 gap-4 overflow-y-auto custom-scrollbar no-scrollbar">
                                        {miniChatContacts.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setMiniChatContact(c)}
                                                className={`relative group transition-all ${miniChatContact.id === c.id ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] ${miniChatContact.id === c.id ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
                                                    <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                                                </div>
                                                {unreadStatus[c.id] && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-black rounded-full shadow-[1px_1px_0px_rgba(0,0,0,1)] animate-pulse" />
                                                )}
                                                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-black z-50">
                                                    {c.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex-1 flex flex-col min-w-0">
                                    {/* Header */}
                                    <div 
                                        onClick={() => isMiniChatCollapsed && setIsMiniChatCollapsed(false)}
                                        className={`h-12 bg-yellow-300 border-b-4 border-black px-3 flex items-center justify-between select-none ${isMiniChatCollapsed ? 'cursor-pointer hover:bg-yellow-400' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={miniChatContact.avatarUrl}
                                                alt={miniChatContact.name}
                                                className="w-7 h-7 rounded-full border-2 border-black object-cover bg-white"
                                            />
                                            <div className="truncate">
                                                <span className="font-black text-sm tracking-wide">{miniChatContact.name}</span>
                                                {typingStatus[miniChatContact.id] && (
                                                    <span className="text-[10px] text-green-700 font-bold ml-1.5 animate-pulse">Typing...</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                onClick={() => handleJumpToFullChat(miniChatContact)}
                                                title="Jump to Full Chat"
                                                className="w-7 h-7 bg-blue-300 hover:bg-blue-400 border-2 border-black rounded flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
                                            >
                                                ↗️
                                            </button>
                                            <button
                                                onClick={() => setIsMiniChatCollapsed(true)}
                                                title="Collapse Chat"
                                                className="w-7 h-7 bg-red-300 hover:bg-red-400 border-2 border-black rounded flex items-center justify-center text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {/* Chat Body (Hidden when collapsed) */}
                                    {!isMiniChatCollapsed && (
                                        <>
                                            {/* Command status banner */}
                                            {activeCommand && activeCommand.phase !== 'done' && activeCommand.executorId === miniChatContact.id && (() => {
                                                const targetContact = contacts.find(c => c.id === activeCommand.targetId);
                                                const targetBuilding = buildings.find(b => b.id === activeCommand.buildingId);
                                                
                                                let commandDesc = '';
                                                if (language === '简体中文') {
                                                    if (activeCommand.type === 'chat') commandDesc = `与 ${targetContact?.name || activeCommand.targetId} 聊天`;
                                                    else if (activeCommand.type === 'fight') commandDesc = `与 ${targetContact?.name || activeCommand.targetId} 对决`;
                                                    else if (activeCommand.type === 'date') commandDesc = `与 ${targetContact?.name || activeCommand.targetId} 约会`;
                                                    else if (activeCommand.type === 'goto') commandDesc = `查看 ${targetBuilding?.name || activeCommand.buildingId}`;
                                                } else if (language === '日本語') {
                                                    if (activeCommand.type === 'chat') commandDesc = `${targetContact?.name || activeCommand.targetId} とおしゃべり`;
                                                    else if (activeCommand.type === 'fight') commandDesc = `${targetContact?.name || activeCommand.targetId} と対決`;
                                                    else if (activeCommand.type === 'date') commandDesc = `${targetContact?.name || activeCommand.targetId} とデート`;
                                                    else if (activeCommand.type === 'goto') commandDesc = `${targetBuilding?.name || activeCommand.buildingId} を確認`;
                                                } else if (language === 'Español') {
                                                    if (activeCommand.type === 'chat') commandDesc = `chatear con ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'fight') commandDesc = `luchar con ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'date') commandDesc = `salir con ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'goto') commandDesc = `inspeccionar ${targetBuilding?.name || activeCommand.buildingId}`;
                                                } else if (language === 'Français') {
                                                    if (activeCommand.type === 'chat') commandDesc = `discuter avec ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'fight') commandDesc = `combattre avec ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'date') commandDesc = `sortir avec ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'goto') commandDesc = `inspecter ${targetBuilding?.name || activeCommand.buildingId}`;
                                                } else {
                                                    if (activeCommand.type === 'chat') commandDesc = `chatting with ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'fight') commandDesc = `dueling ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'date') commandDesc = `dating ${targetContact?.name || activeCommand.targetId}`;
                                                    else if (activeCommand.type === 'goto') commandDesc = `checking ${targetBuilding?.name || activeCommand.buildingId}`;
                                                }

                                                let phaseDesc = '';
                                                if (language === '简体中文') {
                                                    phaseDesc = activeCommand.phase === 'interacting' 
                                                        ? (activeCommand.type === 'fight' ? '对决中' : activeCommand.type === 'date' ? '约会中' : activeCommand.type === 'chat' ? '交谈中' : '审查中')
                                                        : '移动中';
                                                } else if (language === '日本語') {
                                                    phaseDesc = activeCommand.phase === 'interacting'
                                                        ? (activeCommand.type === 'fight' ? '対戦中' : activeCommand.type === 'date' ? 'デート中' : activeCommand.type === 'chat' ? '会話中' : '監査中')
                                                        : '移動中';
                                                } else if (language === 'Español') {
                                                    phaseDesc = activeCommand.phase === 'interacting'
                                                        ? (activeCommand.type === 'fight' ? 'peleando' : activeCommand.type === 'date' ? 'en cita' : activeCommand.type === 'chat' ? 'conversando' : 'inspeccionando')
                                                        : 'en camino';
                                                } else if (language === 'Français') {
                                                    phaseDesc = activeCommand.phase === 'interacting'
                                                        ? (activeCommand.type === 'fight' ? 'en duel' : activeCommand.type === 'date' ? 'en rendez-vous' : activeCommand.type === 'chat' ? 'en discussion' : 'en inspection')
                                                        : 'en déplacement';
                                                } else {
                                                    phaseDesc = activeCommand.phase === 'interacting'
                                                        ? (activeCommand.type === 'fight' ? 'dueling' : activeCommand.type === 'date' ? 'dating' : activeCommand.type === 'chat' ? 'chatting' : 'inspecting')
                                                        : 'moving';
                                                }

                                                let statusText = '';
                                                if (language === '简体中文') {
                                                    statusText = `⚡ ${miniChatContact.name}正在执行：${commandDesc} (${phaseDesc})`;
                                                } else if (language === '日本語') {
                                                    statusText = `⚡ ${miniChatContact.name}は実行中：${commandDesc} (${phaseDesc})`;
                                                } else if (language === 'Español') {
                                                    statusText = `⚡ ${miniChatContact.name} está ejecutando: ${commandDesc} (${phaseDesc})`;
                                                } else if (language === 'Français') {
                                                    statusText = `⚡ ${miniChatContact.name} exécute : ${commandDesc} (${phaseDesc})`;
                                                } else {
                                                    statusText = `⚡ ${miniChatContact.name} is running: ${commandDesc} (${phaseDesc})`;
                                                }

                                                return (
                                                    <div className="bg-yellow-100 border-b-2 border-black px-3 py-1.5 flex items-center justify-between z-10 select-none flex-shrink-0 text-black font-bold text-[10px]">
                                                        <span>
                                                            {statusText}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCancelCommand(activeCommand.id)}
                                                            className="px-1.5 py-0.5 bg-red-400 hover:bg-red-500 border border-black rounded text-[9px] font-black text-white shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
                                                        >
                                                            {language === '简体中文' ? '取消' :
                                                             language === '日本語' ? 'キャンセル' :
                                                             language === 'Español' ? 'Cancelar' :
                                                             language === 'Français' ? 'Annuler' : 'Cancel'}
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            {/* Messages Container */}
                                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#E5DDD5] min-h-0">
                                                {(allMessages[miniChatContact.id] || []).length === 0 && (
                                                    <div className="text-center py-10 opacity-60">
                                                        <p className="text-xs font-bold text-gray-500">Say hello to {miniChatContact.name}!</p>
                                                    </div>
                                                )}
                                                {(allMessages[miniChatContact.id] || []).map((msg) => {
                                                    const isUser = msg.senderId === 'user';
                                                    const msgAvatar = msg.senderAvatar || miniChatContact.avatarUrl;
                                                    const senderName = msg.senderName || miniChatContact.name;
                                                    
                                                    return (
                                                        <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                                                            {!isUser && (
                                                                <div className="flex flex-col items-center flex-shrink-0">
                                                                    <img
                                                                        src={msgAvatar}
                                                                        alt="avatar"
                                                                        className="w-7 h-7 rounded-full border-2 border-black bg-white object-cover"
                                                                    />

                                                                </div>
                                                            )}
                                                            <div className={`
                                                                max-w-[75%] border-2 border-black rounded-2xl p-2 text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]
                                                                ${isUser ? 'bg-blue-300 rounded-tr-none' : 'bg-white rounded-tl-none'}
                                                            `}>
                                                                <FormattedChatMessage
                                                                    text={msg.text}
                                                                    inlineLinksOnly={true}
                                                                    msgId={msg.id}
                                                                />
                                                                {msg.isAudio && msg.audioUrl && (
                                                                    <div className="mt-2 pt-2 border-t border-black/10 flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => playMiniChatAudio(msg.audioUrl!)}
                                                                            className="w-5 h-5 bg-green-400 hover:bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-black text-[9px] active:scale-95 flex-shrink-0"
                                                                        >
                                                                            ▶
                                                                        </button>
                                                                        <span className="text-[9px] text-gray-500 italic truncate">"{msg.rawSound}"</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div ref={miniChatEndRef} />
                                            </div>

                                            {/* Input Area */}
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    const trimmed = miniChatInputValue.trim();
                                                    if (!trimmed) return;

                                                    if (trimmed.startsWith('/')) {
                                                        const parts = trimmed.split(' ');
                                                        const cmd = parts[0].slice(1).toLowerCase();
                                                        if (['chat', 'fight', 'date', 'goto'].includes(cmd)) {
                                                            handleCommand(cmd as any, parts.slice(1).join(' '), miniChatContact.id);
                                                            setMiniChatInputValue('');
                                                            return;
                                                        }
                                                    }

                                                    handleUserSendMessage(trimmed, 'text', undefined, undefined, miniChatContact.id);
                                                    setMiniChatInputValue('');
                                                }}
                                                className="p-2 bg-white border-t-4 border-black flex flex-col gap-1.5 relative"
                                            >
                                                {/* Suggestions Panel */}
                                                {miniChatSuggestions.length > 0 && (
                                                    <div className="absolute bottom-[48px] left-2 right-2 bg-white border-3 border-black rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] z-50 p-1.5 overflow-y-auto max-h-36 font-bold text-xs select-none">
                                                        <div className="text-[8px] uppercase font-black tracking-wider text-gray-400 px-1 py-0.5 border-b border-dashed border-gray-200">
                                                            Suggestions / 建议指令
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            {miniChatSuggestions.map((s, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setMiniChatInputValue(s.value);
                                                                        setMiniChatSuggestionIndex(-1);
                                                                    }}
                                                                    className={`flex items-center justify-between text-left px-2 py-1 rounded transition-all text-black border ${
                                                                        miniChatSuggestionIndex === idx 
                                                                            ? 'bg-yellow-200 border-black ring-2 ring-yellow-400' 
                                                                            : 'bg-transparent border-transparent hover:bg-yellow-100 hover:border-black'
                                                                    } active:scale-[0.99]`}
                                                                >
                                                                    <span>{s.text}</span>
                                                                    {s.subtext && <span className="text-[9px] text-gray-500 font-black">{s.subtext}</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="w-full flex gap-1.5 items-center">
                                                    <input
                                                        type="text"
                                                        value={miniChatInputValue}
                                                        onChange={(e) => setMiniChatInputValue(e.target.value)}
                                                        onKeyDown={handleMiniChatKeyDown}
                                                        placeholder="Type a message or /command..."
                                                        className="flex-1 min-w-0 border-2 border-black rounded px-2 py-1 text-xs font-bold outline-none focus:bg-gray-50"
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="bg-yellow-300 hover:bg-yellow-400 border-2 border-black rounded px-3 py-1 text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
                                                    >
                                                        Send
                                                    </button>
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isGameLobbyOpen && (<div className="absolute inset-0 w-full h-full z-20"><GameLobby onBack={() => setIsGameLobbyOpen(false)} onPlayGame={setActiveMiniGame} /></div>)}

                {/* GAMES */}
                {activeMiniGame === 'chess' && (
                    <div className="absolute inset-0 w-full h-full z-30">
                        <ChessGame
                            onBack={() => setActiveMiniGame(null)}
                            userAvatar={user.avatarUrl}
                            contacts={contacts}
                            onWin={(reward) => updateUserData(prev => ({ ...prev, coins: prev.coins + reward }))}
                        />
                    </div>
                )}
                {activeMiniGame === 'shootout' && (
                    <div className="absolute inset-0 w-full h-full z-30">
                        <PenaltyShootoutGame
                            onBack={() => setActiveMiniGame(null)}
                            userAvatar={user.avatarUrl}
                            contacts={contacts}
                            onRewardCoins={(reward) => updateUserData(prev => ({ ...prev, coins: prev.coins + reward }))}
                        />
                    </div>
                )}
                {activeMiniGame === 'snake' && (
                    <div className="absolute inset-0 w-full h-full z-30">
                        <SnakeGame
                            onBack={() => setActiveMiniGame(null)}
                            userAvatar={user.avatarUrl}
                            contacts={contacts}
                            onRewardCoins={(reward) => updateUserData(prev => ({ ...prev, coins: prev.coins + reward }))}
                        />
                    </div>
                )}
                {activeMiniGame === 'mutation' && (
                    <div className="absolute inset-0 w-full h-full z-30">
                        <MutationGame
                            onBack={() => setActiveMiniGame(null)}
                            userAvatar={user.avatarUrl}
                            contacts={contacts}
                            onRewardCoins={(reward) => updateUserData(prev => ({ ...prev, coins: prev.coins + reward }))}
                        />
                    </div>
                )}

                {isSkillMallOpen && (
                    <div className="absolute inset-0 w-full h-full z-20">
                        <SkillMall
                            onBack={() => setIsSkillMallOpen(false)}
                            userCoins={user.coins}
                            userInventory={user.inventory}
                            onPurchase={async (skillId, price) => {
                                if (authUser?.id) {
                                    const res = await fetch('/api/skills', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: authUser.id, skillId, price })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        setUser(prev => ({
                                            ...prev,
                                            coins: data.coins,
                                            inventory: data.inventory
                                        }));
                                        return true;
                                    } else {
                                        alert(data.error || 'Purchase failed');
                                        return false;
                                    }
                                }
                                return false;
                            }}
                        />
                    </div>
                )}
                {isHighNotesOpen && (<div className="absolute inset-0 w-full h-full z-20"><HighNotes posts={posts} currentUser={user} onBack={() => { setIsHighNotesOpen(false); setFocusedPostId(null); }} onCreatePost={handleCreateHighNotePost} onLike={(pid) => handleInteractPost(pid, 'like')} onDislike={(pid) => handleInteractPost(pid, 'dislike')} onComment={handleCommentPost} onLikeComment={handleLikeComment} focusedPostId={focusedPostId} /></div>)}
                {isMyHighNotesOpen && (<div className="absolute inset-0 w-full h-full z-20"><MyHighNotes posts={posts} currentUser={user} onBack={() => setIsMyHighNotesOpen(false)} onLike={(pid) => handleInteractPost(pid, 'like')} onDislike={(pid) => handleInteractPost(pid, 'dislike')} onComment={handleCommentPost} onLikeComment={handleLikeComment} /></div>)}
                {isFriendHighNotesOpen && viewingFriend && (<div className="absolute inset-0 w-full h-full z-20"><FriendHighNotes friend={viewingFriend} posts={posts} currentUser={user} onBack={() => setIsFriendHighNotesOpen(false)} onLike={(pid) => handleInteractPost(pid, 'like')} onDislike={(pid) => handleInteractPost(pid, 'dislike')} onComment={handleCommentPost} onLikeComment={handleLikeComment} /></div>)}
                {isMallOpen && (<div className="absolute inset-0 w-full h-full z-20"><Mall onBack={() => setIsMallOpen(false)} userCoins={user.coins} onPurchase={async (items) => {
                    if (authUser?.id) {
                        const productIds = items.map(i => i.id);
                        const res = await fetch('/api/mall', {
                            method: 'POST',
                            body: JSON.stringify({ userId: authUser.id, productIds })
                        });
                        const data = await res.json();
                        if (data.success) {
                            setUser(prev => ({
                                ...prev,
                                coins: data.profile.coins,
                                inventory: data.profile.inventory
                            }));
                            return true;
                        } else {
                            alert(data.error || 'Purchase failed');
                            return false;
                        }
                    }
                    return false;
                }} /></div>)}
                {isMyItemsOpen && (<div className="absolute inset-0 w-full h-full z-20"><MyItems inventory={user.inventory} onBack={() => setIsMyItemsOpen(false)} products={allProducts} /></div>)}
            </div>
            {isSubscriptionOpen && (<SubscriptionModal currentTier={user.subscriptionTier} onClose={() => setIsSubscriptionOpen(false)} onSubscribe={handleSubscribe} />)}

            {/* Pending command interrupt modal */}
            {pendingCommand && (() => {
                const executor = contacts.find(c => c.id === pendingCommand.executorId);
                const currentExecutor = contacts.find(c => c.id === activeCommand?.executorId);

                let title = '⚠️ Interrupt Command';
                let bodyText = (
                    <>
                        {currentExecutor?.name || 'This character'} is currently executing a command on the map.
                        <br />
                        Do you want to terminate their current command and let <b>{executor?.name}</b> start the new command <b>/{pendingCommand.type}</b>?
                    </>
                );
                let btnTerminate = 'Terminate & Run';
                let btnContinue = 'Continue Old';

                if (language === '简体中文') {
                    title = '⚠️ 确认中止';
                    bodyText = (
                        <>
                            {currentExecutor?.name || '当前角色'} 正在地图上执行指令。
                            <br />
                            是否终止其当前指令，并让 <b>{executor?.name}</b> 开始执行新指令 <b>/{pendingCommand.type}</b>？
                        </>
                    );
                    btnTerminate = '终止并执行';
                    btnContinue = '继续原指令';
                } else if (language === '日本語') {
                    title = '⚠️ コマンドの中断';
                    bodyText = (
                        <>
                            {currentExecutor?.name || '現在のキャラクター'} は現在マップ上でコマンドを実行中です。
                            <br />
                            現在のコマンドを終了し、<b>{executor?.name}</b> に新しいコマンド <b>/{pendingCommand.type}</b> を実行させますか？
                        </>
                    );
                    btnTerminate = '終了して実行';
                    btnContinue = '古いコマンドを継続';
                } else if (language === 'Español') {
                    title = '⚠️ Interrumpir comando';
                    bodyText = (
                        <>
                            {currentExecutor?.name || 'Este personaje'} está ejecutando un comando en el mapa.
                            <br />
                            ¿Desea finalizar su comando actual y permitir que <b>{executor?.name}</b> inicie el nuevo comando <b>/{pendingCommand.type}</b>?
                        </>
                    );
                    btnTerminate = 'Terminar y ejecutar';
                    btnContinue = 'Continuar antiguo';
                } else if (language === 'Français') {
                    title = '⚠️ Interrompre la commande';
                    bodyText = (
                        <>
                            {currentExecutor?.name || 'Ce personnage'} exécute actuellement une commande sur la carte.
                            <br />
                            Voulez-vous terminer sa commande actuelle et laisser <b>{executor?.name}</b> démarrer la nouvelle commande <b>/{pendingCommand.type}</b> ?
                        </>
                    );
                    btnTerminate = 'Terminer et exécuter';
                    btnContinue = 'Continuer l\'ancienne';
                }

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 select-none">
                        <div className="bg-white border-4 border-black rounded-3xl p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
                            <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                                {title}
                            </h3>
                            <p className="font-bold text-gray-700 mb-6 leading-relaxed">
                                {bodyText}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        if (activeCommand) {
                                            handleCancelCommand(activeCommand.id);
                                        }
                                        const pending = pendingCommand;
                                        setPendingCommand(null);
                                        setTimeout(() => {
                                            issueCommand(pending.type, pending.args, pending.executorId);
                                        }, 600);
                                    }}
                                    className="flex-1 py-3 bg-red-400 hover:bg-red-500 text-white font-black rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                >
                                    {btnTerminate}
                                </button>
                                <button
                                    onClick={() => setPendingCommand(null)}
                                    className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 font-black rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                >
                                    {btnContinue}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default App;
