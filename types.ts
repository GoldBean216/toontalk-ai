
export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'deepseek' | 'custom';

export interface AiBrainConfig {
  provider: AiProvider;
  model: string;        // Big Brain model e.g. "gpt-4o", "gemini-2.5-pro"
  apiBaseUrl?: string;  // Custom base URL (OpenAI-compatible)
  apiKey?: string;      // Character-specific API key
  skills?: string[];    // Active skill IDs
  skillConfigs?: Record<string, { apiKey?: string; address?: string; [key: string]: any }>;

  // ── Cognitive Mode (Big Brain / Little Brain) ──
  cognitiveMode?: 'standard' | 'big_little'; // default: standard
  littleBrainProvider?: AiProvider;           // Little Brain provider
  littleBrainModel?: string;                  // e.g. "gemini-2.5-flash", "gpt-4o-mini"
  littleBrainApiKey?: string;                 // Little Brain API key (if different)
  littleBrainBaseUrl?: string;                // Little Brain base URL (if custom)
  difficultyThreshold?: number;               // 0-100, tasks above this go to Big Brain (default: 50)
  // ── TTS Settings ──
  ttsVoice?: 'default' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Zephyr' | string;
  ttsProvider?: AiProvider;
  ttsModel?: string;
  ttsBaseUrl?: string;
  ttsApiKey?: string;
  ttsSpeechType?: 1 | 2;
  // ── Behavioral Preference ──
  behaviorPreference?: string;
}

// Internal cognitive reasoning types (not persisted to DB directly)
export interface CognitiveSubtask {
  id: string;
  description: string;
  difficulty: number;                    // 0-100
  assignedTo: 'big' | 'little' | 'skill'; // skill = routed to a specific Skill handler
  skillId?: string;                      // which skill handles this subtask
  result?: string;
}

export interface CognitiveDecomposition {
  analysis: string;
  strategy: string;
  subtasks: CognitiveSubtask[];
  activatedSkills?: string[];            // skill IDs invoked in this pipeline run
}

export interface Contact {
  id: string;
  name: string;
  species: string;
  persona: string;
  avatarUrl: string;
  color: string; // For UI styling
  isAi?: boolean; // Indicates if the contact is an AI character
  isGroup?: boolean; // New property for group chats
  members?: string[]; // IDs of contacts in the group
  creatorId?: string; // ID of the user who created the group
  affinity?: number; // 0-100, Relationship score
  stableId?: string; // Stable ID for local caching across database resets
  coins?: number; // Accumulated coins wealth
  
  // AI Character Health (Energy) System
  energy?: number; // Current energy level (0-100)
  maxEnergy?: number; // Maximum energy level (default: 100)
  lastEnergyUpdate?: number; // Timestamp of last energy update
  aiState?: 'work' | 'rest' | 'social' | 'sick' | 'hospitalized';
  recoveryTimeRemaining?: number; // minutes, starting at 10, max 30

  // AI Brain
  aiBrain?: AiBrainConfig; // Custom AI model config for this character
}

export interface Message {
  id: string;
  senderId: 'user' | 'system' | string;
  senderName?: string; // For group/world channels
  senderAvatar?: string; // For group/world channels
  text: string; // The translation or the user's text
  rawSound?: string; // The "Meow", "Bark", "Beep" text
  audioUrl?: string; // Blob URL for the TTS audio
  timestamp: number;
  isAudio: boolean;
  isTranslated: boolean; // UI toggle state
  cognitiveTrace?: CognitiveDecomposition; // Pipeline trace (Big/Little Brain + Skills)
  type?: 'text' | 'game' | 'gift'; // Distinguish normal text from game actions
  gameData?: {
    type: 'dice' | 'rps' | 'wheel' | 'fcb';
    result: string; // '1'-'6' for dice/wheel, 'rock'/'paper'/'scissors' for rps, 'fox'/'chicken'/'bee' for fcb
  };
  giftData?: {
    productName: string;
    imageUrl: string;
  };
}


export type TabView = 'chats' | 'contacts' | 'explore' | 'notifications' | 'profile';

export type NotificationType = 'like_post' | 'comment_post' | 'reply_comment' | 'friend_request';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  fromId?: string; // ID of the user who triggered the notification
  fromName: string;
  fromAvatar: string;
  postId: string;
  postContent: string;
  commentId?: string;
  commentText?: string;
  replyText?: string;
  timestamp: number;
  isRead: boolean;
}

export interface ChatResponse {
  raw_sound: string;
  translation: string;
  game_data?: {
    type: 'dice' | 'rps' | 'wheel' | 'fcb';
    result: string;
  };
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  // Wallet & Sub
  coins: number; // "TT" currency
  subscriptionTier: SubscriptionTier;
  lastCheckInDate?: string; // ISO date string YYYY-MM-DD
  inventory: string[]; // IDs of purchased products
  isAdmin?: boolean;
  // Token Usage Tracking (Backend only)
  totalTokensUsed?: number; // Total tokens consumed
  dailyTokensUsed?: number; // Tokens consumed today
  lastTokenReset?: string; // ISO date string for daily reset
  aiProactivity?: 'low' | 'standard' | 'high'; // Proactivity level
}

export interface RoleplayCharacter {
  id: string;
  name: string;
  species: string;
  description: string;
  creator: string;
}

// --- Social Media Types ---

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
  replies?: Comment[];
  parentId?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorSpecies: string;
  status?: 'published' | 'pending' | 'error';
  errorReason?: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  comments: Comment[];
}

// --- Roleplay Theatre Types ---

export type GameType = 'taboo' | 'guess' | 'count' | 'spy';

export interface ScenarioCharacter {
  id: string;
  name: string;
  avatarUrl: string;
  role?: 'civilian' | 'spy';
  word?: string;
  isAlive?: boolean;
  isAi?: boolean;
  aiBrain?: AiBrainConfig;
}

export interface RoleplayScenario {
  id: string;
  title: string;
  description: string;
  gameType: GameType;
  characters: ScenarioCharacter[];
  // Taboo Config
  tabooWords?: Record<string, string>;
  // Guess Config
  guessWords?: string[]; // List of possible words
  // Spy Config
  spyWords?: { civilian: string; spy: string }[];
}

export interface SpyPlayer {
  id: string; // character id or 'user'
  name: string;
  avatarUrl: string;
  role: 'civilian' | 'spy';
  word: string;
  isAlive: boolean;
  isAi: boolean;
}

export interface RoleplayGameState {
  scenario: RoleplayScenario;
  userCharacterId: string;
  aiCharacterIds: string[]; // For multi-agent games like Spy
  score: number;

  // Game Specific State
  // Taboo
  userTabooWord?: string;
  targetTabooWord?: string;

  // Guess
  userTargetWord?: string; // The word on User's Head (User guesses this)
  aiTargetWord?: string; // The word on AI's Head

  // Count
  currentNumber?: number;

  // Spy
  spyPlayers?: SpyPlayer[];
  spyTurnIndex?: number;
  spyRound?: number;
  spyPhase?: 'description' | 'vote';
}

// --- Mall Types ---

export type ProductCategory = 'food' | 'dressup' | 'toy' | 'furniture';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  imageUrl: string;
  targetSpecies?: string;
}

// --- Command System Types ---

export interface ActiveCommand {
  id: string;                    // 唯一 id
  type: 'chat' | 'fight' | 'date' | 'goto';
  executorId: string;            // 执行指令的角色 contact.id
  targetId?: string;             // 目标角色 contact.id（chat/fight/date）
  buildingId?: string;           // 目标建筑 building.id（goto）
  phase: 'moving' | 'interacting' | 'done' | 'cancelled';
  startTime: number;
  targetX?: number;              // 目标坐标（计算后填入）
  targetY?: number;
  dateDestinationId?: string;    // 约会目的地建筑 ID
  dateStrollComplete?: boolean;  // 约会散步是否已完成
}

// End of types

