
import React, { useState, useEffect } from 'react';
import { Contact, Post, UserProfile, Product, AiBrainConfig, AiProvider } from '../types';
import { Button } from './Button';
import { GoldCoin } from './GoldCoin';
import { useLanguage } from '../lib/language-context';

interface FriendProfileProps {
    contact: Contact;
    currentUser: UserProfile;
    posts: Post[];
    userInventory: string[];
    aiSimulationState?: Record<string, any>;
    onBack: () => void;
    onChat: () => void;
    onGift: (productId: string) => { success: boolean; message?: string };
    onOpenHighNotes: () => void; // New Prop
    // Interactive props still needed for passing through if needed, but mainly handled in sub-page
    onLikePost: (postId: string) => void;
    onDislikePost: (postId: string) => void;
    onCommentPost: (postId: string, text: string) => void;
    products?: Product[];
    onSaveBrain?: (brain: AiBrainConfig) => void;
    onUpdateName?: (name: string) => void;
    buildings?: any[];
    onSaveTask?: () => void;
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string; icon: string; needsKey: boolean; defaultModel: string }[] = [
  { value: 'gemini',    label: 'Gemini (Google)',           icon: '✨', needsKey: false, defaultModel: 'gemini-2.5-flash' },
  { value: 'openai',    label: 'OpenAI',                    icon: '⚡', needsKey: true,  defaultModel: 'gpt-4o' },
  { value: 'deepseek',  label: 'DeepSeek',                  icon: '🐳', needsKey: true,  defaultModel: 'deepseek-chat' },
  { value: 'anthropic', label: 'Anthropic Claude',          icon: '🧠', needsKey: true,  defaultModel: 'claude-3-5-sonnet-20241022' },
  { value: 'ollama',    label: 'Ollama (Local)',            icon: '🦙', needsKey: false, defaultModel: 'llama3.1' },
  { value: 'custom',    label: 'Custom (OpenAI Compatible)', icon: '⚙️', needsKey: true, defaultModel: '' },
];

export const FriendProfile: React.FC<FriendProfileProps> = ({
    contact,
    currentUser,
    posts,
    userInventory,
    aiSimulationState,
    onBack,
    onChat,
    onGift,
    onOpenHighNotes,
    products,
    onSaveBrain,
    onUpdateName,
    buildings = [],
    onSaveTask
}) => {
    const [showGiftModal, setShowGiftModal] = useState(false);
    const { t, language } = useLanguage();
    const [showBrainModal, setShowBrainModal] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showBehaviorModal, setShowBehaviorModal] = useState(false);

    // Task settings states
    const [showTaskSettingsModal, setShowTaskSettingsModal] = useState(false);
    const [tasksList, setTasksList] = useState<any[]>([]);
    const [selectedAssignTaskId, setSelectedAssignTaskId] = useState<string>('');
    const [selectedAssignTaskRole, setSelectedAssignTaskRole] = useState<'executor' | 'verifier' | 'both'>('executor');
    const [isSavingAssignTask, setIsSavingAssignTask] = useState(false);

    // Custom Task creation states
    const [taskModalTab, setTaskModalTab] = useState<'assign' | 'create'>('assign');
    const [customTaskTitle, setCustomTaskTitle] = useState('');
    const [customTaskBuildingId, setCustomTaskBuildingId] = useState('');
    const [customTaskRole, setCustomTaskRole] = useState<'executor' | 'verifier' | 'both'>('executor');
    const [customTaskReward, setCustomTaskReward] = useState<number>(50);

    // Auto-select first building when list loads
    useEffect(() => {
        if (buildings && buildings.length > 0 && !customTaskBuildingId) {
            setCustomTaskBuildingId(buildings[0].id);
        }
    }, [buildings, customTaskBuildingId]);

    // Fetch tasks list (user-assigned activities with priority > 0)
    useEffect(() => {
        if (!showTaskSettingsModal || !currentUser?.id) return;
        const fetchTasks = async () => {
            try {
                const res = await fetch(`/api/ai-activities?userId=${currentUser.id}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter tasks: priority > 0 and status !== 'done'
                    const filteredTasks = (data || []).filter((act: any) => act.priority > 0 && act.status !== 'done');
                    setTasksList(filteredTasks);
                    if (filteredTasks.length > 0) {
                        setSelectedAssignTaskId(filteredTasks[0].id);
                    }
                }
            } catch (err) {
                console.error("Error fetching tasks for dropdown:", err);
            }
        };
        fetchTasks();
    }, [showTaskSettingsModal, currentUser?.id]);

    const handleSaveTaskSetting = async () => {
        if (!selectedAssignTaskId || !currentUser?.id) return;
        setIsSavingAssignTask(true);
        try {
            const selectedTask = tasksList.find(t => t.id === selectedAssignTaskId);
            if (!selectedTask) {
                alert(language === "简体中文" ? "请选择有效的任务！" : "Please select a valid task!");
                setIsSavingAssignTask(false);
                return;
            }

            // Resolve target building
            let targetBuilding = (buildings || []).find((b: any) => {
                const name = (b.name || "").toLowerCase();
                const id = (b.id || "").toLowerCase();
                return `${selectedTask.title}`.toLowerCase().includes(name) || `${selectedTask.title}`.toLowerCase().includes(id);
            });
            if (!targetBuilding && (buildings || []).length > 0) {
                targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
            }
            if (!targetBuilding) {
                alert(language === "简体中文" ? "没有可用的地点！" : "No buildings available!");
                setIsSavingAssignTask(false);
                return;
            }

            // Find any currently 'doing' activity for this character in database and set it to pending
            const schedRes = await fetch(`/api/ai-activities?userId=${currentUser.id}&aiId=${contact.id}`);
            if (schedRes.ok) {
                const schedData = await schedRes.json();
                const currentDoingActivity = (schedData || []).find((act: any) => act.status === 'doing');
                if (currentDoingActivity) {
                    await fetch("/api/ai-activities", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: currentDoingActivity.id,
                            status: "pending"
                        })
                    });
                }
            }

            // Compute transition rules for executor and verifier ids
            const prevExecutorId = selectedTask.executor_id || (
                (!selectedTask.role || selectedTask.role === 'executor' || selectedTask.role === 'both') 
                ? selectedTask.ai_id 
                : null
            );
            const prevVerifierId = selectedTask.verifier_id || (
                (selectedTask.role === 'verifier' || selectedTask.role === 'both') 
                ? selectedTask.ai_id 
                : null
            );
            const targetAiId = contact.id;

            let nextExecutorId = prevExecutorId;
            let nextVerifierId = prevVerifierId;

            if (selectedAssignTaskRole === "executor") {
                nextExecutorId = targetAiId;
                if (prevVerifierId === targetAiId) {
                    nextVerifierId = null;
                }
            } else if (selectedAssignTaskRole === "verifier") {
                nextVerifierId = targetAiId;
                if (prevExecutorId === targetAiId) {
                    nextExecutorId = null;
                }
            } else if (selectedAssignTaskRole === "both") {
                nextExecutorId = targetAiId;
                nextVerifierId = targetAiId;
            }

            // Update the selected activity in the DB
            const res = await fetch("/api/ai-activities", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedTask.id,
                    status: "doing",
                    priority: 2,
                    role: selectedAssignTaskRole,
                    aiId: contact.id,
                    executorId: nextExecutorId,
                    verifierId: nextVerifierId,
                    buildingId: targetBuilding.id
                })
            });

            if (res.ok) {
                alert(language === "简体中文" ? "任务分配成功！" : "Task assigned successfully!");
                setShowTaskSettingsModal(false);
                if (onSaveTask) {
                    onSaveTask();
                }
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || "Failed to assign task"}`);
            }
        } catch (err: any) {
            console.error("Error saving task assignment:", err);
            alert(`Error: ${err.message || "Failed to assign task"}`);
        } finally {
            setIsSavingAssignTask(false);
        }
    };

    const handleCreateCustomTask = async () => {
        if (!customTaskTitle.trim() || !currentUser?.id) {
            alert(language === "简体中文" ? "请输入任务内容！" : "Please enter task content!");
            return;
        }
        setIsSavingAssignTask(true);
        try {
            const targetBuilding = (buildings || []).find(b => b.id === customTaskBuildingId) || buildings[0];
            if (!targetBuilding) {
                alert(language === "简体中文" ? "没有可用的地点！" : "No buildings available!");
                setIsSavingAssignTask(false);
                return;
            }

            // Find any currently 'doing' activity for this character in database and set it to pending
            const schedRes = await fetch(`/api/ai-activities?userId=${currentUser.id}&aiId=${contact.id}`);
            if (schedRes.ok) {
                const schedData = await schedRes.json();
                const currentDoingActivity = (schedData || []).find((act: any) => act.status === 'doing');
                if (currentDoingActivity) {
                    await fetch("/api/ai-activities", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: currentDoingActivity.id,
                            status: "pending"
                        })
                    });
                }
            }

            const targetAiId = contact.id;
            let nextExecutorId = null;
            let nextVerifierId = null;

            if (customTaskRole === "executor") {
                nextExecutorId = targetAiId;
            } else if (customTaskRole === "verifier") {
                nextVerifierId = targetAiId;
            } else if (customTaskRole === "both") {
                nextExecutorId = targetAiId;
                nextVerifierId = targetAiId;
            }

            // Create custom activity in DB
            const res = await fetch("/api/ai-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.id,
                    aiId: contact.id,
                    title: customTaskTitle.trim(),
                    buildingId: targetBuilding.id,
                    priority: 2, // high priority user task
                    status: "doing",
                    role: customTaskRole,
                    executorId: nextExecutorId,
                    verifierId: nextVerifierId,
                    rewardCoins: customTaskReward
                })
            });

            if (res.ok) {
                alert(language === "简体中文" ? "自定义任务已创建并分配！" : "Custom task created and assigned successfully!");
                setShowTaskSettingsModal(false);
                setCustomTaskTitle('');
                setCustomTaskReward(50);
                if (onSaveTask) {
                    onSaveTask();
                }
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || "Failed to create task"}`);
            }
        } catch (err: any) {
            console.error("Error creating custom task:", err);
            alert(`Error: ${err.message || "Failed to create task"}`);
        } finally {
            setIsSavingAssignTask(false);
        }
    };

    // Profile Editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(contact.name);
    
    // Brain states
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

    // TTS Settings
    const [ttsProvider, setTtsProvider] = useState<AiProvider>('gemini');
    const [ttsModel, setTtsModel] = useState<string>('');
    const [ttsBaseUrl, setTtsBaseUrl] = useState<string>('');
    const [ttsApiKey, setTtsApiKey] = useState<string>('');
    const [showTtsKey, setShowTtsKey] = useState(false);
    const [ttsVoice, setTtsVoice] = useState<string>('default');
    const [ttsSpeechType, setTtsSpeechType] = useState<number>(2);

    // Behavior Preference
    const [behaviorPreference, setBehaviorPreference] = useState<string>('default');

    // Test Connection States
    const [isTestingMain, setIsTestingMain] = useState(false);
    const [testResultMain, setTestResultMain] = useState<{ success: boolean; message: string } | null>(null);
    const [isTestingLittle, setIsTestingLittle] = useState(false);
    const [testResultLittle, setTestResultLittle] = useState<{ success: boolean; message: string } | null>(null);
    const [isTestingTts, setIsTestingTts] = useState(false);
    const [testResultTts, setTestResultTts] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestConnection = async (
        targetProvider: string,
        targetModel: string,
        targetApiKey: string,
        targetBaseUrl: string,
        type: 'main' | 'little' | 'tts'
    ) => {
        const setTesting = type === 'main' ? setIsTestingMain : (type === 'little' ? setIsTestingLittle : setIsTestingTts);
        const setResult = type === 'main' ? setTestResultMain : (type === 'little' ? setTestResultLittle : setTestResultTts);

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
                setResult({ success: true, message: t['connectionSuccess'] || 'Connection successful!' });
            } else {
                const errMsg = data.error || 'Connection failed';
                setResult({ success: false, message: `${t['connectionFailed'] || 'Failed: '}${errMsg}` });
            }
        } catch (err: any) {
            setResult({ success: false, message: `${t['connectionFailed'] || 'Failed: '}${err.message || 'Network error'}` });
        } finally {
            setTesting(false);
        }
    };

    useEffect(() => {
        // Read global AI settings for fallback
        let globalProvider: AiProvider = 'gemini';
        let globalModel = 'gemini-2.5-flash';
        let globalBaseUrl = '';
        let globalApiKey = '';

        if (typeof window !== 'undefined' && currentUser?.id) {
            const stored = localStorage.getItem(`toontalk_global_ai_${currentUser.id}`);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed) {
                        if (parsed.provider) globalProvider = parsed.provider;
                        if (parsed.model) globalModel = parsed.model;
                        if (parsed.apiBaseUrl) globalBaseUrl = parsed.apiBaseUrl;
                        if (parsed.apiKey) globalApiKey = parsed.apiKey;
                    }
                } catch (e) {}
            }
        }

        const brain = contact.aiBrain;
        setProvider(brain?.provider || globalProvider);
        setModel(brain?.model || globalModel);
        setBaseUrl(brain?.apiBaseUrl || globalBaseUrl);
        setApiKey(brain?.apiKey || globalApiKey);
        setCognitiveMode(brain?.cognitiveMode || 'standard');
        setLittleBrainProvider(brain?.littleBrainProvider || 'gemini');
        setLittleBrainModel(brain?.littleBrainModel || 'gemini-2.5-flash');
        setLittleBrainApiKey(brain?.littleBrainApiKey || '');
        setLittleBrainBaseUrl(brain?.littleBrainBaseUrl || '');
        setDifficultyThreshold(brain?.difficultyThreshold ?? 50);
        setTtsProvider(brain?.ttsProvider || 'gemini');
        setTtsModel(brain?.ttsModel || '');
        setTtsBaseUrl(brain?.ttsBaseUrl || '');
        setTtsApiKey(brain?.ttsApiKey || '');
        setTtsVoice(brain?.ttsVoice || 'default');
        setTtsSpeechType(brain?.ttsSpeechType ?? 2);
        setBehaviorPreference(brain?.behaviorPreference || 'default');
    }, [contact, showBrainModal, currentUser?.id]);

    const getUpdatedBrain = (): AiBrainConfig => {
        return {
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
            ttsProvider: ttsProvider !== 'gemini' ? ttsProvider : undefined,
            ttsModel: ttsModel || undefined,
            ttsBaseUrl: ttsBaseUrl || undefined,
            ttsApiKey: ttsApiKey || undefined,
            ttsVoice: ttsVoice !== 'default' ? ttsVoice : undefined,
            ttsSpeechType: ttsSpeechType as 1 | 2,
            behaviorPreference,
            skills: contact.aiBrain?.skills,
            skillConfigs: contact.aiBrain?.skillConfigs
        };
    };

    const handleSaveBrainClick = () => {
        if (!onSaveBrain) return;
        onSaveBrain(getUpdatedBrain());
        alert("✨ " + (t['saveSuccess'] || "Configuration saved successfully!"));
        setShowBrainModal(false);
    };

    const handleSaveName = () => {
        if (editName.trim() && onUpdateName) {
            onUpdateName(editName.trim());
        }
        setIsEditingName(false);
    };

    // Filter posts for this specific contact to show count
    const contactPostsCount = posts.filter(p => p.authorId === contact.id).length;

    // Map inventory IDs to Product objects
    const myItems = userInventory.map(id => (products || []).find(p => p.id === id)).filter(Boolean) as Product[];

    const handleGiftClick = (product: Product) => {
        const result = onGift(product.id);
        if (result.success) {
            alert(`🎁 Gift sent! ${contact.name} loved it.`);
            setShowGiftModal(false);
        } else {
            alert(result.message || "Cannot send this gift.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-yellow-50 overflow-y-auto relative">
            {/* Header */}
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
                <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
                    ←
                </button>
                <h1 className="text-2xl font-black tracking-wider uppercase">Friend Profile</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">

                {/* Profile Card */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 flex flex-col items-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-24 ${contact.color || 'bg-gray-200'} border-b-4 border-black`}></div>

                    <div className="mt-8 mb-4 relative">
                        <img
                            src={contact.avatarUrl}
                            alt={contact.name}
                            className="w-32 h-32 rounded-full border-4 border-black bg-white object-cover relative z-10"
                        />
                        {contact.isGroup && <span className="absolute bottom-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded border-2 border-black z-20">GROUP</span>}
                    </div>

                    <div className="w-full flex flex-col items-center z-10 relative">
                        {isEditingName ? (
                            <div className="flex flex-col items-center gap-2 mb-2 w-full max-w-xs animate-fadeIn">
                                <input
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                                    className="w-full border-4 border-black rounded-xl p-2 font-black text-center text-lg focus:bg-yellow-50 outline-none"
                                />
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={handleSaveName}
                                        className="flex-1 bg-green-400 hover:bg-green-500 border-2 border-black rounded-lg py-1 font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px transition-all text-white"
                                    >
                                        SAVE
                                    </button>
                                    <button
                                        onClick={() => setIsEditingName(false)}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 border-2 border-black rounded-lg py-1 font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px transition-all"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-1 group">
                                <h2 className="text-3xl font-black">{contact.name}</h2>
                                {contact.isAi && (
                                    <button 
                                        onClick={() => { setEditName(contact.name); setIsEditingName(true); }}
                                        className="w-8 h-8 flex items-center justify-center bg-yellow-300 hover:bg-yellow-400 border-2 border-black rounded-lg transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px"
                                        title="Rename AI"
                                    >
                                        ✏️
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2 mb-4">
                            <span className="text-xs font-bold bg-black text-white px-2 py-1 rounded uppercase">{contact.species}</span>
                            <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded font-mono">ID: {contact.id}</span>
                        </div>
                    </div>

                    <p className="text-center font-bold text-gray-600 mb-4 italic max-w-sm">
                        "{contact.persona}"
                    </p>

                    {/* Current Activity Status */}
                    {contact.isAi && (
                        <div className="w-full max-w-xs mb-6 bg-indigo-50 border-2 border-black rounded-2xl p-3 flex items-center gap-3 animate-fadeIn">
                            <div className="text-2xl animate-bounce">
                                {aiSimulationState?.[contact.id]?.chatBubble || '📍'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                                    {language === '简体中文' ? '当前活动' : 'Current Activity'}
                                </p>
                                <p className="text-xs font-bold text-indigo-900 truncate">
                                    {aiSimulationState?.[contact.id]?.currentAction || (language === '简体中文' ? '正在探索世界...' : 'Exploring the world...')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 w-full max-w-xs">
                        <Button onClick={onChat} fullWidth className="bg-green-400 hover:bg-green-500 text-white">
                            💬 Chat
                        </Button>
                        {!contact.isGroup && (
                            <Button onClick={() => setShowGiftModal(true)} fullWidth className="bg-pink-400 hover:bg-pink-500 text-white">
                                🎁 Gift
                            </Button>
                        )}
                    </div>
                </div>

                {/* Affinity & Wealth Section */}
                {!contact.isGroup && (
                    <div className={`grid ${contact.isAi ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1'} mb-8`}>
                        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-black text-xl">{language === '简体中文' ? '好感度等级' : 'Friendship Level'}</h3>
                                <span className="text-xl font-black text-pink-500">{contact.affinity || 0}%</span>
                            </div>
                            <div className="w-full h-6 bg-gray-200 rounded-full border-2 border-black overflow-hidden relative">
                                <div
                                    className="h-full bg-pink-400 border-r-2 border-black transition-all duration-1000"
                                    style={{ width: `${contact.affinity || 0}%` }}
                                ></div>
                                {/* Stripes */}
                                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] bg-[length:10px_10px]"></div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 mt-2 text-center">
                                {(contact.affinity || 0) < 30 ? (language === '简体中文' ? '初相识' : "Acquaintances") : (contact.affinity || 0) < 70 ? (language === '简体中文' ? '好朋友' : "Good Friends") : (language === '简体中文' ? '挚友!' : "Besties!")}
                            </p>
                        </div>

                        {contact.isAi && (
                            <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                                <div>
                                    <h3 className="font-black text-xl flex items-center gap-1.5">
                                        <GoldCoin className="w-6 h-6 inline-block" /> {language === '简体中文' ? '角色财富' : 'Character Wealth'}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-400 mt-1">
                                        {language === '简体中文' ? '通过完成 Toon World 建设任务赚取' : 'Earned by completing Toon World construction tasks'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center py-4 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-300 mt-3">
                                    <span className="text-3xl font-black text-amber-600 animate-pulse flex items-center gap-2">
                                        <GoldCoin className="w-8 h-8" size={32} /> {contact.coins || 0} {language === '简体中文' ? '金币' : 'coins'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* High Notes Feed Button */}
                <div className="w-full mb-6">
                    <Button
                        onClick={onOpenHighNotes}
                        variant="secondary"
                        fullWidth
                        className="py-4 flex justify-between items-center px-6 border-4"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📣</span>
                            <span className="font-black text-xl">View High Notes</span>
                        </div>
                        <div className="bg-black text-white text-xs font-bold px-2 py-1 rounded-full">
                            {contactPostsCount} Posts
                        </div>
                    </Button>
                </div>



                {/* AI Configuration Section (Moved from Modal) */}
                {contact.isAi && (
                    <div className="w-full space-y-6">
                        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left">
                            <h3 className="font-black text-xl flex items-center gap-2 mb-4">
                                {t['aiConfig'] || 'AI Configuration'}
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="bg-slate-50 border-2 border-black rounded-2xl p-4 shadow-inner">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Current Brain</span>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{provider}</span>
                                    </div>
                                    <p className="font-black text-sm text-slate-700">{model}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => setShowBrainModal(true)}
                                        className="w-full py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 border-2 border-purple-300 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_rgba(126,34,206,0.2)] active:translate-y-px"
                                    >
                                        {t['brainSettings'] || 'Brain Settings'}
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setShowVoiceModal(true)}
                                            className="py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_rgba(37,99,235,0.1)] active:translate-y-px"
                                        >
                                            {t['voiceTimbre'] || 'Voice'}
                                        </button>
                                        <button
                                            onClick={() => setShowBehaviorModal(true)}
                                            className="py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-2 border-emerald-300 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_rgba(5,150,105,0.1)] active:translate-y-px"
                                        >
                                            🧬 {t['behaviorPreferenceLabel'] || 'Behavior'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Gift Selector Modal */}
            {showGiftModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md flex flex-col max-h-[80vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="bg-pink-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                            <h2 className="font-black text-xl uppercase">Send a Gift</h2>
                            <button onClick={() => setShowGiftModal(false)} className="font-bold hover:bg-white/50 rounded px-2">✕</button>
                        </div>

                        <div className="p-4 bg-pink-50 flex-1 overflow-y-auto">
                            <div className="bg-white border-2 border-black rounded-xl p-3 mb-4 text-center">
                                <p className="font-bold text-sm">Giving to: <span className="text-pink-500">{contact.name}</span> ({contact.species})</p>
                            </div>

                            {myItems.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <p className="text-4xl mb-2">🛍️</p>
                                    <p className="font-bold">Empty Inventory</p>
                                    <p className="text-xs">Visit the Mall to buy gifts!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {myItems.map((item, idx) => {
                                        // Check compatibility (case-insensitive, handles 'any'/'all', and matches list of species)
                                        const isCompatible = (() => {
                                            if (!item.targetSpecies) return true;
                                            const target = item.targetSpecies.toLowerCase();
                                            if (target === 'all' || target === 'any') return true;
                                            const contactSpecies = (contact.species || '').toLowerCase();
                                            return target.includes(contactSpecies);
                                        })();

                                        return (
                                            <div
                                                key={`${item.id}-${idx}`}
                                                onClick={() => isCompatible && handleGiftClick(item)}
                                                className={`
                                            bg-white border-2 border-black rounded-xl p-2 flex flex-col items-center transition-all relative
                                            ${isCompatible
                                                        ? 'cursor-pointer hover:scale-105 hover:shadow-md'
                                                        : 'opacity-50 grayscale cursor-not-allowed'
                                                    }
                                        `}
                                            >
                                                <img src={item.imageUrl} className="w-full aspect-square object-contain mb-2" />
                                                <p className="text-[10px] font-black text-center leading-tight">{item.name}</p>
                                                {!isCompatible && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                                                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded border border-black">
                                                            Only for {item.targetSpecies}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Brain Settings Modal */}
            {showBrainModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-lg flex flex-col max-h-[85vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="bg-purple-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                            <h2 className="font-black text-xl uppercase flex items-center gap-2">
                                {t['brainSettings']}
                            </h2>
                            <button onClick={() => setShowBrainModal(false)} className="font-bold hover:bg-white/50 rounded px-2">✕</button>
                        </div>

                        <div className="p-6 bg-purple-50/50 flex-1 overflow-y-auto space-y-6 text-left">
                            {/* AI Provider & Model Section (Restored to Modal) */}
                            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                <h3 className="font-black text-lg border-b-2 border-black pb-2 flex items-center gap-2">
                                    {t['aiConfig'] || 'AI Configuration'}
                                </h3>
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">{t['aiProvider']}</label>
                                    <select
                                        value={provider}
                                        onChange={(e) => {
                                            const val = e.target.value as AiProvider;
                                            setProvider(val);
                                            const opt = PROVIDER_OPTIONS.find(o => o.value === val);
                                            if (opt) setModel(opt.defaultModel);
                                        }}
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    >
                                        {PROVIDER_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.icon} {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">{t['modelName']}</label>
                                    <input
                                        type="text"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="e.g. gemini-2.5-flash"
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">
                                        {t['apiBaseUrl']} <span className="text-[10px] text-gray-400">
                                            {provider === 'openai' ? t['defaultOpenai'] : provider === 'deepseek' ? 'https://api.deepseek.com' : provider === 'ollama' ? t['defaultOllama'] : provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : ''}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : provider === 'deepseek' ? 'https://api.deepseek.com' : provider === 'ollama' ? 'http://localhost:11434/v1' : provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'https://api.yourprovider.com/v1'}
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">{t['apiKey']}</label>
                                    <div className="relative">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder={t['leaveEmpty']}
                                            className="w-full bg-white border-2 border-black rounded-lg p-2 pr-10 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-sm bg-gray-100 border border-black hover:bg-gray-200 rounded px-2 py-0.5"
                                        >
                                            {showKey ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold leading-tight">{t['keyStoredSecurely']}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleTestConnection(provider, model, apiKey, baseUrl, 'main')}
                                            disabled={isTestingMain}
                                            className="px-3 py-1 border-2 border-black rounded-xl bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 font-black text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                                        >
                                            {isTestingMain ? (t['testing'] || 'Testing...') : (t['testConnection'] || '🔌 Test Connection')}
                                        </button>
                                        {testResultMain && (
                                            <span className={`text-[10px] font-black ${testResultMain.success ? 'text-green-600' : 'text-red-500'}`}>
                                                {testResultMain.message}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {provider === 'gemini' && !baseUrl && !apiKey && (
                                    <p className="text-xs text-emerald-600 font-bold italic">{t['usingServerGeminiKey'] || '✓ Using default server Gemini key'}</p>
                                )}
                            </div>

                            {/* Cognitive Mode (Dual Brain) Section */}
                            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                <h3 className="font-black text-lg border-b-2 border-black pb-2 flex items-center gap-2">
                                    <span>{t['cognitiveMode']}</span>
                                </h3>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCognitiveMode('standard')}
                                        className={`p-3 border-2 border-black rounded-xl font-bold transition-all text-sm flex flex-col items-center justify-center gap-1 ${
                                            cognitiveMode === 'standard'
                                                ? 'bg-purple-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="text-xl">🤖</span>
                                        <span>{t['standardMode']}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCognitiveMode('big_little')}
                                        className={`p-3 border-2 border-black rounded-xl font-bold transition-all text-sm flex flex-col items-center justify-center gap-1 ${
                                            cognitiveMode === 'big_little'
                                                ? 'bg-purple-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{t['dualBrainMode']}</span>
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500 font-bold leading-relaxed">{t['dualBrainDesc']}</p>

                                {cognitiveMode === 'big_little' && (
                                    <div className="border-t-2 border-dashed border-black pt-4 space-y-4">
                                        <h4 className="font-black text-md text-purple-700 flex items-center gap-1">
                                            <span>💡</span> {t['littleBrainSettings']}
                                        </h4>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">{t['littleBrainProvider']}</label>
                                            <select
                                                value={littleBrainProvider}
                                                onChange={(e) => {
                                                    const val = e.target.value as AiProvider;
                                                    setLittleBrainProvider(val);
                                                    const opt = PROVIDER_OPTIONS.find(o => o.value === val);
                                                    if (opt) setLittleBrainModel(val === 'gemini' ? 'gemini-2.5-flash' : opt.defaultModel);
                                                }}
                                                className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            >
                                                {PROVIDER_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.icon} {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">{t['littleBrainModel']}</label>
                                            <input
                                                type="text"
                                                value={littleBrainModel}
                                                onChange={(e) => setLittleBrainModel(e.target.value)}
                                                placeholder="e.g. gemini-2.5-flash"
                                                className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">{t['baseUrl'] || 'Base URL'} <span className="text-[10px] text-gray-400">
                                                {littleBrainProvider === 'openai' ? t['defaultOpenai'] : littleBrainProvider === 'gemini' ? 'https://generativelanguage.googleapis.com' : ''}
                                            </span></label>
                                            <input
                                                type="text"
                                                value={littleBrainBaseUrl}
                                                onChange={(e) => setLittleBrainBaseUrl(e.target.value)}
                                                placeholder={littleBrainProvider === 'openai' ? 'https://api.openai.com/v1' : littleBrainProvider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'http://localhost:11434/v1'}
                                                className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none font-mono text-xs"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">{t['apiKey'] || 'API Key'}</label>
                                            <div className="relative">
                                                <input
                                                    type={showLittleKey ? 'text' : 'password'}
                                                    value={littleBrainApiKey}
                                                    onChange={(e) => setLittleBrainApiKey(e.target.value)}
                                                    placeholder={t['leaveEmpty']}
                                                    className="w-full bg-white border-2 border-black rounded-lg p-2 pr-10 font-bold focus:outline-none font-mono text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLittleKey(!showLittleKey)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-sm bg-gray-100 border border-black hover:bg-gray-200 rounded px-2 py-0.5"
                                                >
                                                    {showLittleKey ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleTestConnection(littleBrainProvider, littleBrainModel, littleBrainApiKey, littleBrainBaseUrl, 'little')}
                                                    disabled={isTestingLittle}
                                                    className="px-3 py-1 border-2 border-black rounded-xl bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 font-black text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                                                >
                                                    {isTestingLittle ? (t['testing'] || 'Testing...') : (t['testConnection'] || '🔌 Test Connection')}
                                                </button>
                                                {testResultLittle && (
                                                    <span className={`text-[10px] font-black ${testResultLittle.success ? 'text-green-600' : 'text-red-500'}`}>
                                                        {testResultLittle.message}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {littleBrainProvider === 'gemini' && !littleBrainBaseUrl && !littleBrainApiKey && (
                                            <p className="text-[10px] text-emerald-600 font-bold italic py-1">✓ {t['usingServerGeminiKey'] || 'Using default server Gemini key'}</p>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <span>{t['difficultyThreshold']}</span>
                                                <span className="text-purple-600 font-black">{difficultyThreshold}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={difficultyThreshold}
                                                onChange={(e) => setDifficultyThreshold(parseInt(e.target.value))}
                                                className="w-full accent-purple-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                                                <span>{t['speedCostSavings']}</span>
                                                <span>{t['fullIntelligence']}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Button Footer */}
                        <div className="p-4 border-t-4 border-black bg-white rounded-b-2xl flex gap-2">
                            <Button
                                onClick={handleSaveBrainClick}
                                fullWidth
                                className="bg-purple-400 hover:bg-purple-500 text-white border-2 border-black font-black"
                            >
                                {t['saveBrainConfig']}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Settings Modal */}
            {showVoiceModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-lg flex flex-col max-h-[85vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-scaleUp">
                        <div className="bg-blue-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                            <h2 className="font-black text-xl uppercase flex items-center gap-2 text-white">
                                {t['voiceTimbre'] || 'TTS Configuration'}
                            </h2>
                            <button onClick={() => setShowVoiceModal(false)} className="text-white font-bold hover:bg-white/20 rounded px-2">✕</button>
                        </div>
                        <div className="p-6 bg-blue-50/50 flex-1 overflow-y-auto space-y-5 text-left">
                            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">{t['ttsProvider'] || 'TTS Provider'}</label>
                                    <select
                                        value={ttsProvider}
                                        onChange={(e) => {
                                            const val = e.target.value as AiProvider;
                                            setTtsProvider(val);
                                            if (val === 'openai') setTtsModel('tts-1');
                                            else if (val === 'gemini') setTtsModel('');
                                        }}
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="gemini">✨ Gemini (Built-in)</option>
                                        <option value="openai">⚡ OpenAI TTS</option>
                                        <option value="custom">⚙️ Custom (OpenAI Compatible)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">{t['ttsModel'] || 'TTS Model Name'}</label>
                                    <input
                                        type="text"
                                        value={ttsModel}
                                        onChange={(e) => setTtsModel(e.target.value)}
                                        placeholder="e.g. tts-1, tts-1-hd"
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">{t['apiBaseUrl'] || 'Base URL'} <span className="text-[10px] text-gray-400">
                                        {ttsProvider === 'openai' ? t['defaultOpenai'] : ttsProvider === 'gemini' ? 'https://generativelanguage.googleapis.com' : ''}
                                    </span></label>
                                    <input
                                        type="text"
                                        value={ttsBaseUrl}
                                        onChange={(e) => setTtsBaseUrl(e.target.value)}
                                        placeholder={ttsProvider === 'openai' ? 'https://api.openai.com/v1' : ttsProvider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'https://api.yourprovider.com/v1'}
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">{t['apiKey'] || 'API Key'}</label>
                                    <div className="relative">
                                        <input
                                            type={showTtsKey ? 'text' : 'password'}
                                            value={ttsApiKey}
                                            onChange={(e) => setTtsApiKey(e.target.value)}
                                            placeholder={t['leaveEmpty']}
                                            className="w-full bg-white border-2 border-black rounded-lg p-2 pr-10 font-bold focus:outline-none font-mono text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowTtsKey(!showTtsKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-xs bg-gray-100 border border-black hover:bg-gray-200 rounded px-2 py-0.5"
                                        >
                                            {showTtsKey ? '🙈' : '👁️'}
                                        </button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleTestConnection(ttsProvider, ttsModel, ttsApiKey, ttsBaseUrl, 'tts')}
                                            disabled={isTestingTts}
                                            className="px-3 py-1 border-2 border-black rounded-xl bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 font-black text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                                        >
                                            {isTestingTts ? (t['testing'] || 'Testing...') : (t['testConnection'] || '🔌 Test Connection')}
                                        </button>
                                        {testResultTts && (
                                            <span className={`text-[10px] font-black ${testResultTts.success ? 'text-green-600' : 'text-red-500'}`}>
                                                {testResultTts.message}
                                            </span>
                                        )}
                                        </div>
                                        </div>
                                {ttsProvider === 'gemini' && !ttsBaseUrl && !ttsApiKey && (
                                    <p className="text-[10px] text-emerald-600 font-bold italic py-1">✓ {t['usingServerGeminiKey'] || 'Using default server Gemini key'}</p>
                                )}
                                
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">{t['lockVoice'] || 'Voice Name'}</label>
                                    <input
                                        type="text"
                                        value={ttsVoice}
                                        onChange={(e) => setTtsVoice(e.target.value)}
                                        placeholder="e.g. alloy, echo, fable, onyx"
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <p className="text-[9px] text-gray-400 font-bold italic">Specify the exact voice identifier to use for this character.</p>
                                </div>

                                <div className="space-y-2 border-t border-dashed border-gray-200 pt-3">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">
                                        {t['ttsSpeechTypeLabel'] || 'TTS Content Mode'}
                                    </label>
                                    <select
                                        value={ttsSpeechType}
                                        onChange={(e) => setTtsSpeechType(Number(e.target.value))}
                                        className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value={1}>{t['ttsSpeechTypeOption1'] || 'Direct Synthesis (Translate/read full text)'}</option>
                                        <option value={2}>{t['ttsSpeechTypeOption2'] || 'AI Onomatopoeia (Short animal/mimic sounds, default)'}</option>
                                    </select>
                                    <p className="text-[9px] text-gray-400 font-bold italic">
                                        {ttsSpeechType === 1 
                                            ? (language === '简体中文' ? '直接将AI回答的完整文本合成语音。' : 'Synthesize the AI response text directly.') 
                                            : (language === '简体中文' ? '根据角色设定生成短拟声词（如汪汪、喵呜），节省语音长度。' : 'Generate short, characteristic onomatopoeia sounds to save voice synthesis cost.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t-4 border-black bg-white flex">
                            <Button 
                                onClick={() => {
                                    handleSaveBrainClick();
                                    setShowVoiceModal(false);
                                }} 
                                fullWidth 
                                className="bg-blue-400 hover:bg-blue-500 text-white font-black"
                            >
                                ✅ {t['doneBtn'] || 'Apply & Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Behavioral Preference Modal */}
            {showBehaviorModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-scaleUp">
                        <div className="bg-emerald-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                            <h2 className="font-black text-xl uppercase flex items-center gap-2">
                                <span>🧬</span> {t['behaviorPreferenceLabel'] || 'Behavior'}
                            </h2>
                            <button onClick={() => setShowBehaviorModal(false)} className="font-bold hover:bg-white/50 rounded px-2">✕</button>
                        </div>
                        <div className="p-6 space-y-4 text-left">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-tighter">Activity Style</label>
                                <select
                                    value={behaviorPreference}
                                    onChange={(e) => setBehaviorPreference(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-black rounded-xl p-3 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                >
                                    <option value="default">{t['prefDefault']}</option>
                                    <option value="wandering">🏃 {t['prefWandering']}</option>
                                    <option value="water">🐸 {t['prefWater']}</option>
                                    <option value="sweet">🍬 {t['prefSweet']}</option>
                                    <option value="cozy"> Couch Potato 🛋️</option>
                                    <option value="tech">💻 {t['prefTech']}</option>
                                </select>
                            </div>
                            <Button 
                                onClick={() => {
                                    handleSaveBrainClick();
                                    setShowBehaviorModal(false);
                                }} 
                                fullWidth 
                                className="bg-emerald-400 hover:bg-emerald-500 text-white mt-2"
                            >
                                ✅ {t['doneBtn'] || 'Apply & Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Settings Modal */}
            {showTaskSettingsModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn pointer-events-auto">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md flex flex-col max-h-[85vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="bg-yellow-300 p-4 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                            <h2 className="font-black text-xl uppercase">
                                {language === "简体中文" ? "任务设置" : "Task Settings"}
                            </h2>
                            <button onClick={() => setShowTaskSettingsModal(false)} className="font-bold hover:bg-white/50 rounded px-2">✕</button>
                        </div>

                        {/* Tab Headers */}
                        <div className="grid grid-cols-2 border-b-4 border-black bg-white">
                            <button
                                onClick={() => setTaskModalTab('assign')}
                                className={`py-3 text-xs font-black uppercase transition-all ${
                                    taskModalTab === 'assign'
                                        ? 'bg-yellow-100 text-black border-r-4 border-black'
                                        : 'bg-white text-gray-500 hover:text-black border-r-4 border-black'
                                }`}
                            >
                                {language === "简体中文" ? "分配已有任务" : "Assign Task"}
                            </button>
                            <button
                                onClick={() => setTaskModalTab('create')}
                                className={`py-3 text-xs font-black uppercase transition-all ${
                                    taskModalTab === 'create'
                                        ? 'bg-yellow-100 text-black'
                                        : 'bg-white text-gray-500 hover:text-black'
                                }`}
                            >
                                {language === "简体中文" ? "创建自定义任务" : "Create Task"}
                            </button>
                        </div>

                        <div className="p-6 bg-yellow-50/50 flex-1 overflow-y-auto space-y-4 text-left">
                            {taskModalTab === 'assign' ? (
                                tasksList.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <p className="text-4xl mb-2">📋</p>
                                        <p className="font-bold">
                                            {language === "简体中文" ? "暂无可用任务" : "No Tasks Available"}
                                        </p>
                                        <p className="text-xs">
                                            {language === "简体中文" ? "请先在活动看板上新建任务，或者创建自定义任务！" : "Please create tasks on the Activity Board first, or use the Create tab!"}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">
                                                {language === "简体中文" ? "选择任务" : "Select Task"}
                                            </label>
                                            <select
                                                value={selectedAssignTaskId}
                                                onChange={(e) => setSelectedAssignTaskId(e.target.value)}
                                                className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                            >
                                                {tasksList.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">
                                                {language === "简体中文" ? "职责角色" : "Role / Responsibility"}
                                            </label>
                                            <select
                                                value={selectedAssignTaskRole}
                                                onChange={(e) => setSelectedAssignTaskRole(e.target.value as any)}
                                                className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                            >
                                                <option value="executor">
                                                    {language === "简体中文" ? "执行者 (Executor)" : "Executor"}
                                                </option>
                                                <option value="verifier">
                                                    {language === "简体中文" ? "验收者 (Verifier)" : "Verifier"}
                                                </option>
                                                <option value="both">
                                                    {language === "简体中文" ? "两者皆是 (Both)" : "Both"}
                                                </option>
                                            </select>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={handleSaveTaskSetting}
                                                disabled={isSavingAssignTask}
                                                className="w-full py-2.5 bg-yellow-300 hover:bg-yellow-400 active:translate-y-0.5 text-black border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider disabled:opacity-50"
                                            >
                                                {isSavingAssignTask ? (language === "简体中文" ? "保存中..." : "Saving...") : (language === "简体中文" ? "保存" : "Save")}
                                            </button>
                                        </div>
                                    </>
                                )
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">
                                            {language === "简体中文" ? "任务内容" : "Task Content"}
                                        </label>
                                        <input
                                            type="text"
                                            value={customTaskTitle}
                                            onChange={(e) => setCustomTaskTitle(e.target.value)}
                                            placeholder={language === "简体中文" ? "例如：在影剧院旁修剪树木" : "e.g. Trim the trees near Cinema"}
                                            className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">
                                            {language === "简体中文" ? "目标地点" : "Target Building"}
                                        </label>
                                        <select
                                            value={customTaskBuildingId}
                                            onChange={(e) => setCustomTaskBuildingId(e.target.value)}
                                            className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        >
                                            {(buildings || []).map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">
                                            {language === "简体中文" ? "职责角色" : "Role / Responsibility"}
                                        </label>
                                        <select
                                            value={customTaskRole}
                                            onChange={(e) => setCustomTaskRole(e.target.value as any)}
                                            className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        >
                                            <option value="executor">
                                                {language === "简体中文" ? "执行者 (Executor)" : "Executor"}
                                            </option>
                                            <option value="verifier">
                                                {language === "简体中文" ? "验收者 (Verifier)" : "Verifier"}
                                            </option>
                                            <option value="both">
                                                {language === "简体中文" ? "两者皆是 (Both)" : "Both"}
                                            </option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">
                                            {language === "简体中文" ? "金币奖励 (30-100)" : "Gold Coins Reward (30-100)"}
                                        </label>
                                        <input
                                            type="number"
                                            min={30}
                                            max={100}
                                            value={customTaskReward}
                                            onChange={(e) => setCustomTaskReward(Number(e.target.value))}
                                            className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={handleCreateCustomTask}
                                            disabled={isSavingAssignTask || !customTaskTitle.trim()}
                                            className="w-full py-2.5 bg-yellow-300 hover:bg-yellow-400 active:translate-y-0.5 text-black border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wider disabled:opacity-50"
                                        >
                                            {isSavingAssignTask ? (language === "简体中文" ? "保存中..." : "Saving...") : (language === "简体中文" ? "创建并分配" : "Create & Assign")}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};
