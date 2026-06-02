
import React, { useState, useEffect, useRef } from 'react';
import { Contact, Message, UserProfile, Product, CognitiveDecomposition } from '../types';
import { decodeAndPlayAudio } from '../services/gemini';
import { Button } from './Button';
import { GroupSettings } from './GroupSettings';
import { AvatarSlideshow } from './AvatarSlideshow';
import { FormattedChatMessage, RetroCodeBlock, RetroImageFrame } from './FormattedChatMessage';

interface Artifact {
    id: string;
    title: string;
    type: 'code' | 'image' | 'document';
    content: string;
    language?: string;
}

const extractArtifacts = (text: string, msgId: string): Artifact[] => {
    if (!text) return [];
    const artifacts: Artifact[] = [];

    // 1. Code blocks: ```lang\ncode\n``` (Relaxed to allow trailing unclosed blocks)
    const codeBlockRegex = /```([a-zA-Z0-9+#-]*)\n([\s\S]*?)(?:```|$)/g;
    let match;
    let codeIndex = 1;
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1].trim() || 'code';
        const content = match[2].trim();
        if (content) {
            artifacts.push({
                id: `${msgId}-code-${codeIndex++}`,
                title: `${language.toUpperCase()} Code File`,
                type: 'code',
                content,
                language
            });
        }
    }

    // 2. Images: ![alt](url)
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
    let imgIndex = 1;
    imageRegex.lastIndex = 0;
    while ((match = imageRegex.exec(text)) !== null) {
        const alt = match[1].trim() || 'Canvas';
        const url = match[2].trim();
        artifacts.push({
            id: `${msgId}-img-${imgIndex++}`,
            title: alt,
            type: 'image',
            content: url
        });
    }

    // 3. Document (if contains headings or lists, and doesn't only contain a code block or image)
    const hasHeadings = /^(?:#|##|###)\s+/m.test(text);
    const hasLists = /^(?:[-*]|\d+\.)\s+/m.test(text);
    const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/!\[.*?\]\(.*?\)/g, '').trim();
    if ((hasHeadings || hasLists) && cleanText.length > 50) {
        artifacts.push({
            id: `${msgId}-doc`,
            title: 'Structured Document',
            type: 'document',
            content: text
        });
    }

    return artifacts;
};

const getConversationalText = (text: string): string => {
    if (!text) return '';
    let clean = text.replace(/```[\s\S]*?```/g, '');
    clean = clean.replace(/!\[.*?\]\(.*?\)/g, '');
    return clean.trim();
};


interface ChatRoomProps {
    contact: Contact;
    currentUser: UserProfile;
    allContacts: Contact[];
    messages: Message[];
    enabledGames: string[];
    isTyping: boolean;
    onSendMessage: (text: string, type?: 'text' | 'game' | 'gift', gameData?: any, giftData?: any) => void;
    onBack: () => void;
    // Group Handlers
    onRenameGroup?: (newName: string) => void;
    onAddMember?: (id: string) => void;
    onRemoveMember?: (id: string) => void;
    onLeaveGroup?: () => void;
    // Gift Handler
    onSendGift?: (productId: string) => void;
    // Heart Handler
    onSendHeart?: () => void;
    userCoins: number;
    onDeductCoins: (amount: number) => boolean;
    onLinkClick?: (type: string, data: any) => void;
    products?: Product[];
    aiSimulationState?: any;
}
// ─── Cognitive Pipeline Trace Panel ──────────────────────────────────────────

const CognitiveTracePanel: React.FC<{ trace: CognitiveDecomposition }> = ({ trace }) => {
    const [open, setOpen] = useState(false);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);

    const handlerMeta: Record<string, { icon: string; label: string; color: string; bg: string }> = {
        big:   { icon: '🧠', label: 'Big Brain',   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
        little:{ icon: '🌊', label: 'Little Brain', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
        skill: { icon: '🔧', label: 'Skill',        color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
    };

    return (
        <div className="mt-2 w-full">
            {/* Toggle Button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 text-[10px] font-black text-purple-500 hover:text-purple-700 transition-colors group"
            >
                <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
                <span className="uppercase tracking-widest">🧠 Cognitive Trace</span>
                {trace.activatedSkills && trace.activatedSkills.length > 0 && (
                    <span className="bg-amber-100 border border-amber-300 text-amber-700 rounded-full px-1.5 text-[9px] font-black">
                        🔧 {trace.activatedSkills.length} skill{trace.activatedSkills.length > 1 ? 's' : ''}
                    </span>
                )}
                <span className="bg-purple-100 border border-purple-200 text-purple-600 rounded-full px-1.5 text-[9px] font-black">
                    {trace.subtasks.length} tasks
                </span>
            </button>

            {open && (
                <div className="mt-2 bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-2xl p-3 space-y-2 shadow-sm animate-fadeIn">
                    {/* Analysis + Strategy */}
                    <div className="text-[10px] text-gray-500 font-bold bg-gray-50 rounded-xl p-2 border border-gray-100 space-y-1">
                        <div><span className="text-gray-400">📊 Analysis:</span> {trace.analysis}</div>
                        <div><span className="text-gray-400">🗺️ Strategy:</span> {trace.strategy}</div>
                    </div>

                    {/* Activated Skills */}
                    {trace.activatedSkills && trace.activatedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {trace.activatedSkills.map(sid => (
                                <span key={sid} className="bg-amber-100 border border-amber-300 text-amber-800 rounded-full px-2 py-0.5 text-[9px] font-black">
                                    🔧 {sid}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Subtask Timeline */}
                    <div className="space-y-1.5">
                        {trace.subtasks.map((task, i) => {
                            const meta = handlerMeta[task.assignedTo] || handlerMeta.big;
                            const isExpanded = expandedTask === task.id;
                            return (
                                <div key={task.id} className={`rounded-xl border p-2 cursor-pointer transition-all ${meta.bg} hover:shadow-sm`}
                                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm flex-shrink-0 mt-0.5">{meta.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase tracking-wide ${meta.color}`}>
                                                    {task.assignedTo === 'skill' ? `🔧 ${task.skillId || 'skill'}` : meta.label}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-bold">#{i + 1}</span>
                                                <span className={`text-[9px] font-black px-1.5 rounded-full border ${
                                                    task.difficulty >= 70 ? 'bg-red-50 border-red-200 text-red-600' :
                                                    task.difficulty >= 40 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                    'bg-green-50 border-green-200 text-green-600'
                                                }`}>diff:{task.difficulty}</span>
                                                <span className="ml-auto text-[9px] text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-700 mt-0.5 leading-snug">{task.description}</p>
                                            {isExpanded && task.result && (
                                                <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                                                    <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap">{task.result}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};


const FCB_IMAGES = {
    fox: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fox.png',
    chicken: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Chicken.png',
    bee: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Honeybee.png'
};

const COMMON_EMOJIS = [
    "😀", "😂", "🤣", "😍", "🥰", "😎", "🤔", "😴", "😭", "🤯",
    "👋", "👍", "👎", "👏", "🙏", "💪", "❤️", "💔", "💯", "🔥",
    "✨", "🎉", "🎈", "🎁", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊",
    "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
    "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴",
    "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️",
    "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐",
    "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊",
    "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫",
    "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙",
    "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🐓", "🦃",
    "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦦",
    "🦥", "🐁", "🐀", "🐿️", "🦔", "🐉", "🐲", "🦠", "💐", "🌸",
    "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲",
    "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃",
    "💩"
];

// --- Animated Game Component ---
const AnimatedGameMessage: React.FC<{
    type: 'dice' | 'rps' | 'wheel' | 'fcb';
    result: string;
    isSelf: boolean;
}> = ({ type, result, isSelf }) => {
    const [displayIcon, setDisplayIcon] = useState('❓');
    const [isAnimating, setIsAnimating] = useState(true);
    // Wheel state
    const [wheelRotation, setWheelRotation] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let timeout: ReturnType<typeof setTimeout>;

        if (type === 'dice') {
            const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            // Animation Loop
            interval = setInterval(() => {
                const randomFace = faces[Math.floor(Math.random() * faces.length)];
                setDisplayIcon(randomFace);
            }, 100);

            // Stop logic
            timeout = setTimeout(() => {
                clearInterval(interval);
                const finalFace = faces[parseInt(result) - 1];
                setDisplayIcon(finalFace);
                setIsAnimating(false);
            }, 2000); // 2s animation
        } else if (type === 'rps') {
            const icons = ['✊', '✋', '✌️'];
            // Animation Loop
            interval = setInterval(() => {
                const randomIcon = icons[Math.floor(Math.random() * icons.length)];
                setDisplayIcon(randomIcon);
            }, 100);

            // Stop logic
            timeout = setTimeout(() => {
                clearInterval(interval);
                let final = '✊';
                if (result === 'paper') final = '✋';
                if (result === 'scissors') final = '✌️';
                setDisplayIcon(final);
                setIsAnimating(false);
            }, 2000);
        } else if (type === 'fcb') {
            const keys = ['fox', 'chicken', 'bee'];
            // Animation Loop
            interval = setInterval(() => {
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                setDisplayIcon(randomKey);
            }, 100);

            // Stop logic
            timeout = setTimeout(() => {
                clearInterval(interval);
                setDisplayIcon(result); // Result is 'fox', 'chicken', or 'bee'
                setIsAnimating(false);
            }, 2000);
        } else if (type === 'wheel') {
            // Start spinning immediately via CSS
            // Calculate final rotation
            // 6 segments: 60deg each.
            // 1 at top (0deg), 2 at 300deg (-60), 3 at 240 (-120)...
            // Formula: Rotation = 360*SpinCount - ((Number-1) * 60)
            const targetNumber = parseInt(result);
            // Wait a tick to allow render, then trigger rotate
            setTimeout(() => {
                const fullSpins = 5;
                const segmentAngle = 60;
                const offset = 30; // Numbers are centered in the slice (0-60 -> 30)
                // Random noise +/- 10deg to look natural, but centered on the number
                const noise = Math.floor(Math.random() * 20) - 10;

                // If number 1 is at 30deg. To bring it to top (0deg), we rotate -30deg.
                // Target Rotation = - ( (targetNumber - 1) * 60 + 30 )
                const targetAngle = (targetNumber - 1) * segmentAngle + offset;

                const finalAngle = (360 * fullSpins) - targetAngle + noise;
                setWheelRotation(finalAngle);
            }, 100);

            timeout = setTimeout(() => {
                setIsAnimating(false);
            }, 3000); // 3s spin
        }

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [type, result]);

    const getBgColor = () => {
        if (isSelf) return 'bg-pink-300';
        return 'bg-blue-300';
    };

    if (type === 'wheel') {
        return (
            <div className={`p-4 rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center min-w-[160px] ${getBgColor()}`}>
                <div className="relative w-32 h-32 mb-2">
                    {/* Pointer */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-red-600 z-10 drop-shadow-md"></div>

                    {/* Wheel */}
                    <div
                        className="w-full h-full rounded-full border-4 border-black relative overflow-hidden transition-transform duration-[3000ms] cubic-bezier(0.25, 0.1, 0.25, 1)"
                        style={{
                            transform: `rotate(${wheelRotation}deg)`,
                            background: 'conic-gradient(from 0deg, #FF9999 0deg 60deg, #FFFF99 60deg 120deg, #99FF99 120deg 180deg, #99FFFF 180deg 240deg, #9999FF 240deg 300deg, #FF99FF 300deg 360deg)'
                        }}
                    >
                        {/* Segments (Lines) */}
                        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                            <div
                                key={i}
                                className="absolute top-0 left-1/2 w-[2px] h-1/2 bg-black origin-bottom"
                                style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
                            />
                        ))}
                        {/* Numbers */}
                        {[1, 2, 3, 4, 5, 6].map((num, i) => (
                            <div
                                key={num}
                                className="absolute top-0 left-1/2 w-8 h-1/2 origin-bottom flex justify-center pt-2"
                                style={{
                                    transform: `translateX(-50%) rotate(${i * 60 + 30}deg)`
                                }}
                            >
                                <span className="font-black text-lg">{num}</span>
                            </div>
                        ))}
                        {/* Center Dot */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border-2 border-white z-20"></div>
                    </div>
                </div>
                {!isAnimating && (
                    <span className="text-xs font-black uppercase mt-1 tracking-widest bg-white/50 px-2 rounded border-2 border-black/10">
                        Result: {result}
                    </span>
                )}
            </div>
        );
    }

    if (type === 'fcb') {
        const currentImg = FCB_IMAGES[displayIcon as keyof typeof FCB_IMAGES] || FCB_IMAGES.fox;

        // Determine interaction visual based on result
        let interactionImg = null;
        let interactionAlt = '';

        // Only show interaction when settled (not animating)
        if (!isAnimating) {
            if (result === 'fox') {
                interactionImg = FCB_IMAGES.chicken;
                interactionAlt = "catching chicken";
            } else if (result === 'chicken') {
                interactionImg = FCB_IMAGES.bee;
                interactionAlt = "catching bee";
            } else if (result === 'bee') {
                interactionImg = FCB_IMAGES.fox;
                interactionAlt = "stinging fox";
            }
        }

        return (
            <div className={`p-1 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center w-32 h-44 bg-white relative overflow-hidden ${isAnimating ? 'animate-pulse' : ''}`}>
                <div className="absolute top-2 left-2 text-[10px] font-black opacity-30 tracking-tighter">CARD BEE</div>
                <div className="absolute bottom-2 right-2 text-[10px] font-black opacity-30 tracking-tighter rotate-180">CARD BEE</div>

                <img
                    src={currentImg}
                    alt="card"
                    className={`w-20 h-20 object-contain transition-transform duration-100 mb-2 ${isAnimating ? 'scale-110' : 'scale-100'}`}
                />

                {!isAnimating && interactionImg && (
                    <div className="absolute bottom-8 right-2 w-12 h-12 bg-yellow-100 rounded-full border-2 border-black flex items-center justify-center shadow-sm z-10">
                        {result === 'bee' && <span className="absolute -top-2 -right-1 text-xs">💢</span>}
                        {result === 'fox' && <span className="absolute -top-1 -right-1 text-xs">🍗</span>}
                        {result === 'chicken' && <span className="absolute -top-1 -right-1 text-xs">🐛</span>}
                        <img src={interactionImg} className="w-8 h-8 object-contain opacity-80" alt={interactionAlt} />
                    </div>
                )}

                {!isAnimating && (
                    <div className="absolute bottom-2 bg-yellow-300 px-3 py-0.5 border-2 border-black rounded-full text-xs font-black uppercase shadow-sm z-20">
                        {result}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`p-4 rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center min-w-[120px] aspect-square ${getBgColor()}`}>
            <span className={`text-6xl select-none ${isAnimating ? 'animate-bounce' : 'scale-110 transition-transform'}`}>
                {displayIcon}
            </span>
            {!isAnimating && (
                <span className="text-xs font-black uppercase mt-2 tracking-widest bg-white/50 px-2 rounded">
                    {type === 'dice' ? `Rolled ${result}` : result}
                </span>
            )}
        </div>
    );
};


export const ChatRoom: React.FC<ChatRoomProps> = ({
    contact,
    currentUser,
    allContacts,
    messages,
    enabledGames,
    isTyping,
    onSendMessage,
    onBack,
    onRenameGroup,
    onAddMember,
    onRemoveMember,
    onLeaveGroup,
    onSendGift,
    onSendHeart,
    userCoins,
    onDeductCoins,
    products,
    onLinkClick
}) => {
    const [inputValue, setInputValue] = useState('');

    const [isRecording, setIsRecording] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Emoji Picker State
    const [showSettings, setShowSettings] = useState(false);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [translatedMessages, setTranslatedMessages] = useState<Record<string, boolean>>({});
    const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

    // Auto-open workspace when AI outputs an artifact
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];
        const isUser = lastMsg.senderId === 'user';
        if (!isUser) {
            const artifacts = extractArtifacts(lastMsg.text, lastMsg.id);
            if (artifacts.length > 0) {
                setActiveArtifact(artifacts[0]);
            }
        }
    }, [messages]);

    const [workspaceMode, setWorkspaceMode] = useState<'code' | 'preview'>('code');
    const [isHeartAnimating, setIsHeartAnimating] = useState(false);

    // Auto-select mode based on artifact language
    useEffect(() => {
        if (activeArtifact) {
            if (activeArtifact.type === 'code' && activeArtifact.language === 'html') {
                setWorkspaceMode('preview');
            } else {
                setWorkspaceMode('code');
            }
        }
    }, [activeArtifact]);

    // Sidebar Artifact Handler
    const handleTaskReportInSidebar = (type: string, data: any) => {
        console.log(`[ChatRoom] Link Clicked: ${type}`, data);
        if (type === 'task_view') {
            console.log(`[ChatRoom] Opening task report in side artifact panel`);
            setActiveArtifact({
                id: `task-${Date.now()}`,
                type: 'document',
                title: data.title || 'Task Report',
                content: data.content || data.report || 'No content available',
                language: 'markdown'
            });
            return; // Intercepted
        } 
        
        if (onLinkClick) {
            onLinkClick(type, data);
        }
    };
    const [affinityKey, setAffinityKey] = useState(0); // Used to trigger re-render animation on affinity change

    // Avatar Animation State
    const [avatarAnimation, setAvatarAnimation] = useState<'idle' | 'love' | 'happy' | 'angry' | 'shy'>('idle');

    const scrollRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const prevMessagesLength = useRef(messages.length);
    const prevAffinity = useRef(contact.affinity || 0);

    // Detect affinity change to trigger pulse
    useEffect(() => {
        // Strict check to ensure we only trigger on actual value changes
        if (contact.affinity !== prevAffinity.current) {
            setAffinityKey(prev => prev + 1);
            prevAffinity.current = contact.affinity || 0;
        }
    }, [contact.affinity]);

    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId !== 'user' && lastMsg.isAudio && lastMsg.audioUrl) {
                setTimeout(() => playAudio(lastMsg.audioUrl!), 500);
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages]);

    useEffect(() => {
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const scrollToBottom = () => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isTyping, showPlusMenu, showEmojiPicker]);

    // Helper to trigger avatar animation
    const triggerAvatarAnimation = (anim: 'idle' | 'love' | 'happy' | 'angry' | 'shy') => {
        setAvatarAnimation(anim);
        setTimeout(() => setAvatarAnimation('idle'), 2500);
    };

    const handleSendGame = (gameId: string) => {
        let text = '';
        let emoji = '';
        let gameData: { type: 'dice' | 'rps' | 'wheel' | 'fcb', result: string } | undefined;

        if (gameId === 'dice') {
            const roll = Math.floor(Math.random() * 6) + 1;
            text = `Rolled a ${roll}`;
            emoji = '🎲';
            gameData = { type: 'dice', result: roll.toString() };
        } else if (gameId === 'rps') {
            const choices = ['rock', 'paper', 'scissors'];
            const choice = choices[Math.floor(Math.random() * 3)];
            text = `Chose ${choice.toUpperCase()}`;
            emoji = '✂️';
            gameData = { type: 'rps', result: choice };
        } else if (gameId === 'wheel') {
            const num = Math.floor(Math.random() * 6) + 1;
            text = `Spun a ${num}`;
            emoji = '🎡';
            gameData = { type: 'wheel', result: num.toString() };
        } else if (gameId === 'fcb') {
            const choices = ['fox', 'chicken', 'bee'];
            const choice = choices[Math.floor(Math.random() * 3)];
            text = `Chose ${choice.toUpperCase()}`;
            emoji = '🃏'; // Card icon
            gameData = { type: 'fcb', result: choice };
        }

        if (gameData) {
            onSendMessage(`${emoji} ${text}`, 'game', gameData);
        }
        setShowPlusMenu(false);
    };

    const handleGiftSelect = (productId: string) => {
        if (onSendGift) {
            onSendGift(productId);
            triggerAvatarAnimation('love');
            setShowGiftModal(false);
            setShowPlusMenu(false);
        }
    };

    const handleSendHeartInternal = () => {
        setShowPlusMenu(false);

        // 1. Trigger Animation locally
        setIsHeartAnimating(true);
        triggerAvatarAnimation('love');

        // 2. Trigger Logic (Message + Affinity)
        if (onSendHeart) onSendHeart();

        // 3. Reset Animation after it plays out
        setTimeout(() => {
            setIsHeartAnimating(false);
        }, 1500);
    };

    const handleSendText = () => {
        if (!inputValue.trim()) return;

        // Analyze sentiment for avatar animation
        const lower = inputValue.toLowerCase();
        if (lower.match(/(love|cute|sweet|beautiful|adore|like you)/)) {
            triggerAvatarAnimation('love');
        } else if (lower.match(/(thanks|good|cool|great|funny|haha|lol)/)) {
            triggerAvatarAnimation('happy');
        } else if (lower.match(/(shy|blush|embarrassed)/)) {
            triggerAvatarAnimation('shy');
        } else if (lower.match(/(hate|stupid|idiot|bad|ugly|shut up|worst)/)) {
            triggerAvatarAnimation('angry');
        }

        onSendMessage(inputValue, 'text');
        setInputValue('');
    };

    const handleEmojiClick = (emoji: string) => {
        setInputValue(prev => prev + emoji);
        // Optional: keep picker open for multiple emojis
    };

    const playAudio = (base64: string) => {
        const ctx = getAudioContext();
        decodeAndPlayAudio(base64, ctx);
    };

    const toggleTranslation = (msgId: string) => {
        setTranslatedMessages(prev => {
            const current = prev[msgId] ?? true; // Default to true
            return {
                ...prev,
                [msgId]: !current
            };
        });
    };

    const revealTranslation = (msgId: string) => {
        setTranslatedMessages(prev => ({
            ...prev,
            [msgId]: true
        }));
    };

    const handlePressStart = (id: string) => {
        longPressTimerRef.current = setTimeout(() => {
            toggleTranslation(id);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    };

    const handlePressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.start();
            setIsRecording(true);

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                setIsRecording(false);
            };
            recognition.onerror = () => setIsRecording(false);
            recognition.onend = () => setIsRecording(false);
        } else {
            alert("Voice input not supported in this browser.");
        }
    };

    const getSenderName = (id: string) => {
        if (id === 'user') return 'You';
        const c = allContacts.find(c => c.id === id);
        return c ? c.name : 'Unknown';
    };

    // Resolve inventory items to Product objects
    const userInventoryItems = currentUser.inventory.map(id => (products || []).find(p => p.id === id)).filter(Boolean);

    return (
        <div className="flex w-full h-full bg-[#E5DDD5] relative overflow-hidden">
            {/* Left Panel: Chat Room */}
            <div className={`flex flex-col h-full bg-[#E5DDD5] relative overflow-hidden transition-all duration-300 ${activeArtifact ? 'w-full md:w-[45%] lg:w-[40%] border-r-4 border-black' : 'w-full'}`}>

            {/* Heart Explosion Overlay */}
            {isHeartAnimating && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
                    {/* Central Boom */}
                    <div className="text-[10rem] animate-[ping_0.5s_ease-out_forwards] opacity-80 select-none">❤️</div>

                    {/* Flying Particles */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute text-3xl select-none animate-[flyToAvatar_1.2s_ease-in-out_forwards]"
                            style={{
                                left: '50%',
                                top: '50%',
                                // Random scatter around center initially
                                '--tw-translate-x': `${(Math.random() - 0.5) * 20}rem`,
                                '--tw-translate-y': `${(Math.random() - 0.5) * 20}rem`,
                                animationDelay: `${Math.random() * 0.2}s`
                            } as React.CSSProperties}
                        >
                            ❤️
                        </div>
                    ))}
                </div>
            )}

            {/* Style for dynamic keyframes */}
            <style>{`
        @keyframes flyToAvatar {
            0% { 
                transform: translate(-50%, -50%) scale(0.5); 
                opacity: 0;
            }
            20% {
                transform: translate(calc(-50% + var(--tw-translate-x)), calc(-50% + var(--tw-translate-y))) scale(1.5);
                opacity: 1;
            }
            100% {
                /* Target roughly top-left avatar position */
                top: 30px; 
                left: 40px; 
                transform: translate(0, 0) scale(0.2);
                opacity: 0;
            }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
      `}</style>

            {/* Header */}
            <div className="bg-white border-b-4 border-black p-3 flex items-center shadow-md z-10 sticky top-0 gap-3">
                <button onClick={onBack} className="text-xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
                    ←
                </button>

                {contact.isGroup ? (
                    <AvatarSlideshow memberIds={contact.members || []} allContacts={allContacts} userAvatarUrl={currentUser.avatarUrl} className="w-12 h-12" />
                ) : (
                    <div className="relative">
                        <img
                            src={contact.avatarUrl}
                            className={`w-12 h-12 rounded-full border-2 border-black object-cover bg-gray-200 transition-all duration-300
                        ${avatarAnimation === 'love' ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,105,180,0.8)]' : ''}
                        ${avatarAnimation === 'happy' ? 'animate-bounce' : ''}
                        ${avatarAnimation === 'angry' ? 'animate-[shake_0.3s_infinite] border-red-500 bg-red-100 grayscale-[0.2]' : ''}
                        ${avatarAnimation === 'shy' ? 'opacity-90 bg-pink-100' : ''}
                    `}
                        />
                        {/* Overlays */}
                        {avatarAnimation === 'love' && (
                            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">😍</div>
                        )}
                        {avatarAnimation === 'shy' && (
                            <div className="absolute inset-0 bg-pink-400/20 rounded-full animate-pulse"></div>
                        )}
                        {avatarAnimation === 'angry' && (
                            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">💢</div>
                        )}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h2 className="font-black text-lg leading-tight tracking-wide truncate">{contact.name}</h2>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 font-bold uppercase truncate">
                            {contact.isGroup ? `${contact.members?.length} members` : contact.species}
                        </p>
                        {/* Affinity Display */}
                        {!contact.isGroup && (
                            <div
                                key={`affinity-${affinityKey}`} // Explicit key to force re-render on update
                                className={`flex items-center gap-1 bg-pink-100 px-2 rounded-full border border-pink-300 ${affinityKey > 0 ? 'animate-[pulse_0.5s_ease-in-out_2]' : ''}`}
                            >
                                <span className="text-[10px]">❤️</span>
                                <span className="text-[10px] font-black text-pink-600">{contact.affinity || 0}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Group Management Button */}
                {contact.isGroup && (
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 rounded-full hover:bg-gray-100 border-2 border-transparent hover:border-black text-xl"
                    >
                        ⚙️
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <p className="font-bold text-gray-500">
                                {contact.isGroup ? 'Welcome to the group!' : `Say hello to ${contact.name}!`}
                            </p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isUser = msg.senderId === 'user';

                        const showTranslation = translatedMessages[msg.id] ?? true;

                        let msgAvatar = isUser ? currentUser.avatarUrl : contact.avatarUrl;
                        if (contact.isGroup && !isUser) {
                            const sender = allContacts.find(c => c.id === msg.senderId);
                            if (sender) msgAvatar = sender.avatarUrl;
                        }

                        return (
                            <div key={msg.id} className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'} items-start`}>

                                {/* Bot/Member Avatar (Left side) */}
                                {!isUser && (
                                    <img
                                        src={msgAvatar}
                                        alt="avatar"
                                        className="w-14 h-14 rounded-full border-2 border-black bg-white object-cover flex-shrink-0 shadow-sm mt-1"
                                    />
                                )}

                                <div className="flex flex-col max-w-[70%]">
                                    {contact.isGroup && !isUser && (
                                        <span className="text-[10px] font-bold text-gray-500 mb-1 ml-2">
                                            {getSenderName(msg.senderId)}
                                        </span>
                                    )}

                                    {msg.type === 'game' && msg.gameData ? (
                                        <AnimatedGameMessage
                                            type={msg.gameData.type}
                                            result={msg.gameData.result}
                                            isSelf={isUser}
                                        />
                                    ) : msg.type === 'gift' && msg.giftData ? (
                                        <div className={`
                            relative w-full border-4 border-black rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                            bg-pink-100 rounded-tr-none flex flex-col items-center
                        `}>
                                            <p className="text-xs font-black text-pink-500 uppercase mb-2">🎁 Gift Sent</p>
                                            <img src={msg.giftData.imageUrl} className="w-16 h-16 object-contain drop-shadow-md mb-2" />
                                            <p className="font-bold text-sm text-center">{msg.giftData.productName}</p>
                                        </div>
                                    ) : (
                                        <div
                                            className={`
                            relative w-full border-4 border-black rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                            ${isUser ? 'bg-blue-300 rounded-tr-none' : 'bg-white rounded-tl-none'}
                            ${!isUser && msg.isAudio ? 'cursor-pointer active:scale-95 transition-transform' : ''}
                            `}
                                            onContextMenu={(e) => { if (!isUser) e.preventDefault(); }}
                                            onMouseDown={() => !isUser && handlePressStart(msg.id)}
                                            onMouseUp={handlePressEnd}
                                            onMouseLeave={handlePressEnd}
                                            onTouchStart={() => !isUser && handlePressStart(msg.id)}
                                            onTouchEnd={handlePressEnd}
                                        >
                                            {!isUser && msg.isAudio ? (
                                                <div className="flex flex-col min-w-[140px]">
                                                    <div className="flex items-center gap-3 select-none">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (msg.audioUrl) playAudio(msg.audioUrl);
                                                                revealTranslation(msg.id);
                                                            }}
                                                            className="w-12 h-12 bg-green-400 hover:bg-green-500 rounded-full flex items-center justify-center text-white border-4 border-black active:translate-y-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex-shrink-0"
                                                        >
                                                            <span className="text-2xl ml-1">▶</span>
                                                        </button>
                                                        <div className="font-black text-xl italic text-gray-800 tracking-wide break-words">
                                                            "{msg.rawSound}"
                                                        </div>
                                                    </div>

                                                    {showTranslation ? (
                                                        <div className="mt-4 pt-3 border-t-4 border-dashed border-gray-300">
                                                            <div className="flex gap-2 items-start">
                                                                <span className="text-xl">🗣️</span>
                                                                <div className="text-sm font-bold text-gray-600 italic leading-snug w-full">
                                                                    <FormattedChatMessage
                                                                        text={msg.text}
                                                                        inlineLinksOnly={true}
                                                                        onOpenArtifact={(art) => setActiveArtifact(art)}
                                                                        onLinkClick={handleTaskReportInSidebar}
                                                                        msgId={msg.id}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest select-none border-t-2 border-gray-100 pt-1">
                                                            HIDDEN (Hold to Show Translation)
                                                        </div>
                                                    )}
                                                </div>
                                             ) : (
                                                 <div className="font-bold text-lg leading-snug">
                                                    <FormattedChatMessage
                                                        text={msg.text}
                                                        inlineLinksOnly={true}
                                                        onOpenArtifact={(art) => setActiveArtifact(art)}
                                                        onLinkClick={handleTaskReportInSidebar}
                                                        msgId={msg.id}
                                                    />
                                                 </div>                                             )}

                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <span className="text-[10px] text-gray-500 block text-right mt-2 font-bold opacity-60">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>

                                    {/* Cognitive Pipeline Trace (only for AI messages with Big/Little Brain mode) */}
                                    {!isUser && msg.cognitiveTrace && (
                                        <div className="mt-1">
                                            <CognitiveTracePanel trace={msg.cognitiveTrace} />
                                        </div>
                                    )}
                                </div>

                                {/* User Avatar (Right side) */}
                                {isUser && (
                                    <div className="w-14 h-14 rounded-full border-2 border-black bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-1 overflow-hidden">
                                        <img
                                            src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png"
                                            alt="Me"
                                            className="w-11 h-11 object-contain"
                                        />
                                    </div>
                                )}

                            </div>
                        );
                    })}
                    {isTyping && (
                        <div className="flex justify-start items-start gap-3 animate-bounce">
                            <img
                                src={contact.avatarUrl}
                                className="w-12 h-12 rounded-full border-2 border-black bg-gray-200 object-cover opacity-50 mt-1"
                            />
                            <div className="bg-white border-4 border-black rounded-2xl rounded-tl-none p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                <span className="font-bold text-gray-400 tracking-widest">...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-auto md:w-96 md:mx-auto bg-white border-4 border-black rounded-3xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-30 animate-fadeIn self-center h-64 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-2">
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors active:scale-95"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Plus Menu (Games + Gift) */}
            {showPlusMenu && (
                <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-auto md:w-96 md:mx-auto bg-white border-4 border-black rounded-3xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-30 animate-fadeIn self-center">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-xl">Fun Zone</h3>
                        <button onClick={() => setShowPlusMenu(false)} className="text-gray-500 font-bold text-xl">✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {!contact.isGroup && (
                            <>
                                <button onClick={() => setShowGiftModal(true)} className="bg-pink-100 p-3 rounded-xl border-2 border-black hover:bg-pink-200 transition-colors col-span-1">
                                    <div className="text-3xl mb-1">🎁</div>
                                    <span className="text-sm font-black">Send Gift</span>
                                </button>
                                <button onClick={handleSendHeartInternal} className="bg-red-100 p-3 rounded-xl border-2 border-black hover:bg-red-200 transition-colors col-span-1">
                                    <div className="text-3xl mb-1">❤️</div>
                                    <span className="text-sm font-black">Send Heart</span>
                                </button>
                            </>
                        )}
                        {enabledGames.includes('dice') && (
                            <button onClick={() => handleSendGame('dice')} className="bg-gray-100 p-3 rounded-xl border-2 border-black hover:bg-yellow-200 transition-colors">
                                <div className="text-3xl mb-1">🎲</div>
                                <span className="text-sm font-black">Roll Dice</span>
                            </button>
                        )}
                        {enabledGames.includes('rps') && (
                            <button onClick={() => handleSendGame('rps')} className="bg-gray-100 p-3 rounded-xl border-2 border-black hover:bg-yellow-200 transition-colors">
                                <div className="text-3xl mb-1">✂️</div>
                                <span className="text-sm font-black">Rochambeau</span>
                            </button>
                        )}
                        {enabledGames.includes('wheel') && (
                            <button onClick={() => handleSendGame('wheel')} className="bg-gray-100 p-3 rounded-xl border-2 border-black hover:bg-yellow-200 transition-colors">
                                <div className="text-3xl mb-1">🎡</div>
                                <span className="text-sm font-black">Spin Wheel (1-6)</span>
                            </button>
                        )}
                        {enabledGames.includes('fcb') && (
                            <button onClick={() => handleSendGame('fcb')} className="bg-gray-100 p-3 rounded-xl border-2 border-black hover:bg-yellow-200 transition-colors">
                                <div className="text-3xl mb-1">🃏</div>
                                <span className="text-sm font-black">Card Bee</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Gift Selection Modal */}
            {showGiftModal && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm flex flex-col max-h-[70vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="p-4 bg-pink-300 border-b-4 border-black flex justify-between items-center rounded-t-2xl">
                            <h2 className="font-black text-xl">Select a Gift</h2>
                            <button onClick={() => setShowGiftModal(false)} className="font-bold hover:bg-white/50 rounded px-2">✕</button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-pink-50">
                            {userInventoryItems.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <p className="text-4xl mb-2">🛍️</p>
                                    <p className="font-bold">No items in inventory.</p>
                                    <p className="text-xs">Go to the Mall to buy gifts!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {userInventoryItems.map((item, idx) => (
                                        <div
                                            key={`${item!.id}-${idx}`}
                                            onClick={() => handleGiftSelect(item!.id)}
                                            className="bg-white border-2 border-black rounded-xl p-2 cursor-pointer hover:bg-pink-100 active:scale-95 transition-all"
                                        >
                                            <img src={item!.imageUrl} className="w-full h-12 object-contain mb-1" />
                                            <p className="text-[9px] font-black text-center truncate">{item!.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t-4 border-black p-3 sticky bottom-0 z-20">
                <div className="max-w-4xl mx-auto w-full flex gap-2 items-center">
                    <button
                        onClick={() => { setShowPlusMenu(!showPlusMenu); setShowEmojiPicker(false); }}
                        className={`w-12 h-12 rounded-full border-4 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none bg-yellow-300 hover:bg-yellow-400 text-2xl font-black pb-1`}
                    >
                        +
                    </button>

                    <button
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowPlusMenu(false); }}
                        className={`w-12 h-12 rounded-full border-4 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none bg-gray-100 hover:bg-gray-200 text-2xl pb-1`}
                    >
                        😊
                    </button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                        placeholder={isRecording ? "Listening..." : "Say something..."}
                        className="flex-1 border-4 border-black rounded-full px-5 py-3 focus:outline-none focus:ring-4 ring-blue-200 font-bold text-lg"
                    />

                    {inputValue.trim() ? (
                        <Button
                            onClick={handleSendText}
                            className="rounded-full w-14 h-14 flex items-center justify-center p-0 !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-blue-400 hover:bg-blue-500 text-white"
                        >
                            ➤
                        </Button>
                    ) : (
                        <button
                            onClick={handleVoiceInput}
                            className={`w-14 h-14 rounded-full border-4 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none
                        ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-gray-100 hover:bg-gray-200'}
                    `}
                        >
                            {isRecording ? '●' : '🎤'}
                        </button>
                    )}
                </div>
            </div>

            {/* Group Settings Modal */}
            {showSettings && contact.isGroup && onRenameGroup && onAddMember && onRemoveMember && onLeaveGroup && (
                <GroupSettings
                    group={contact}
                    currentUser={currentUser}
                    allContacts={allContacts}
                    onClose={() => setShowSettings(false)}
                    onRename={onRenameGroup}
                    onAddMember={onAddMember}
                    onRemoveMember={onRemoveMember}
                    onLeaveGroup={() => {
                        onLeaveGroup();
                        setShowSettings(false);
                    }}
                />
            )}
            </div>

            {/* Right Panel: Artifact Workspace */}
            {activeArtifact && (
                <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-10 w-full md:w-[55%] lg:w-[60%] flex flex-col h-full bg-[#F3F4F6] border-l-4 border-black select-text">
                    {/* Retro Workspace Header */}
                    <div className="bg-purple-400 border-b-4 border-black p-4 flex items-center justify-between select-none flex-shrink-0">
                        <h3 className="font-black text-xl text-black flex items-center gap-2">
                            <span>
                                {activeArtifact.type === 'code' && '⚡'}
                                {activeArtifact.type === 'image' && '🎨'}
                                {activeArtifact.type === 'document' && '📄'}
                            </span>
                            <span className="truncate max-w-[200px] md:max-w-sm">{activeArtifact.title}</span>
                        </h3>
                        <button
                            onClick={() => setActiveArtifact(null)}
                            className="px-3 py-1.5 bg-white hover:bg-gray-100 border-3 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all text-black"
                        >
                            ✕ CLOSE
                        </button>
                    </div>

                    {/* Tab Switcher for HTML */}
                    {activeArtifact.type === 'code' && activeArtifact.language === 'html' && (
                        <div className="flex border-b-4 border-black bg-gray-50 flex-shrink-0 select-none">
                            <button
                                onClick={() => setWorkspaceMode('preview')}
                                className={`flex-1 py-3 px-4 font-black text-sm border-r-2 border-black flex items-center justify-center gap-1.5 transition-colors
                                    ${workspaceMode === 'preview' ? 'bg-yellow-300 text-black border-b-4 border-b-yellow-500' : 'bg-white text-gray-500 hover:text-black'}
                                `}
                            >
                                👁️ PREVIEW
                            </button>
                            <button
                                onClick={() => setWorkspaceMode('code')}
                                className={`flex-1 py-3 px-4 font-black text-sm flex items-center justify-center gap-1.5 transition-colors
                                    ${workspaceMode === 'code' ? 'bg-yellow-300 text-black border-b-4 border-b-yellow-500' : 'bg-white text-gray-500 hover:text-black'}
                                `}
                            >
                                💻 CODE
                            </button>
                        </div>
                    )}

                    {/* Workspace Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white select-text">
                        {activeArtifact.type === 'code' && (
                            <div className="max-w-3xl mx-auto h-full">
                                {activeArtifact.language === 'html' && workspaceMode === 'preview' ? (
                                    <div className="w-full h-full min-h-[500px] border-4 border-black rounded-2xl bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <iframe
                                            srcDoc={activeArtifact.content}
                                            title="HTML Live Preview"
                                            className="w-full h-full min-h-[500px] bg-white border-none"
                                            sandbox="allow-scripts"
                                        />
                                    </div>
                                ) : (
                                    <RetroCodeBlock language={activeArtifact.language || 'code'} code={activeArtifact.content} />
                                )}
                            </div>
                        )}
                        {activeArtifact.type === 'image' && (
                            <div className="max-w-md mx-auto flex items-center justify-center min-h-[400px]">
                                <RetroImageFrame alt={activeArtifact.title} url={activeArtifact.content} />
                            </div>
                        )}
                        {activeArtifact.type === 'document' && (
                            <div className="max-w-2xl mx-auto">
                                <FormattedChatMessage text={activeArtifact.content} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
