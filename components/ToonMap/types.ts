import { Contact, ActiveCommand } from '../../types';
import { LanguageCode } from '../../lib/language-context';

export interface MapBuildingContent {
  id: string;
  buildingId: string;
  authorId: string;
  markdown: string;
  likes: number;
  dislikes: number;
  comments: any[];
}

export interface CustomDecorNode {
  id: string;
  type: 'decor' | 'image' | 'video' | 'gif';
  label: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  url?: string;
  zIndex?: number;
  aiReachable?: boolean;
}

export interface CustomPath {
  id: string;
  fromId: string;
  toId: string;
}

export interface RenovatedLayout {
  nodes: CustomDecorNode[];
  paths: CustomPath[];
}

export interface MapBuilding {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  emoji: string;
  description: string;
  tag: string;
  actionText: string;
  functions?: MapBuildingFunction[];
  imageUrl?: string;
  // New Building Features
  isActive?: boolean;
  managerId?: string | null;
  health?: number; // 0-100
  basicFunction?: string;
  generationFrequency?: number; // in minutes
  generatedContents?: MapBuildingContent[];
  hasAnnounced?: boolean;
  lastGenerationTime?: number;
  linkedMetroId?: string;
  coins?: number;
  chatBgImage?: string;
  chatBgOpacity?: number;
  chatMessageBgOpacity?: number;
  chatMessageBlur?: number;
  renovatedLayout?: RenovatedLayout;
}

export interface MapBuildingFunction {
  id: string;
  name: string;
  type: string;
  skillId?: string;
  description?: string;
  assigneeId?: string;
  aiRoleSetting?: string;
}

export interface Street {
  id: string;
  type: 'h' | 'v' | 'roundabout' | 'curve';
  coord?: number;
  start?: number;
  end?: number;
  roadStyle?: string;
  x?: number;
  y?: number;
  r?: number;
  radius?: number;
}

export interface AiSimState {
  x: number;
  y: number;
  path: Array<{x: number; y: number}>;
  pathIndex: number;
  targetBuildingId: string;
  state: 'idle' | 'walking' | 'socializing' | 'wandering';
  idleTimeRemaining: number;
  chatBubble: string;
  chatTimer: number;
  chatDuration: number;
  chatPhase: string;
  currentAction: string;
  emojiSequence: string[];
  emojiIndex: number;
  emojiTick: number;
  socialPartnerId?: string;
  transitStatus?: 'none' | 'entering' | 'exiting';
  transitTimer?: number;
  lastReactionTime?: number;
}

export interface ToonMapProps {
  contacts: Contact[];
  onBack: () => void;
  onChat: (contact: Contact) => void;
  onOpenBuildingChat?: (building: MapBuilding) => void;
  onViewHighNotes?: (contact: Contact) => void;
  onSimulationStateUpdate?: (state: Record<string, any>) => void;
  onWeatherUpdate?: (weather: string) => void;
  onBuildingsUpdate?: (buildings: MapBuilding[]) => void;
  onDecideProactivity?: (c: Contact, event: string) => void;
  onOpenGameLobby?: () => void;
  onOpenMall?: () => void;
  userInventory?: string[];
  onOpenSkillMall?: () => void;
  scheduleVersion?: number;
  onUpdateContactCoins?: (contactId: string, coins: number) => void;
  onUpdateContactState?: (contactId: string, newState: 'work' | 'rest' | 'social' | 'sick' | 'hospitalized') => void;
  onUpdateContactEnergy?: (contactId: string, energy: number) => void;
  
  // Command System Props
  activeCommand?: ActiveCommand | null;
  setActiveCommand?: (cmd: ActiveCommand | null) => void;
  onCompleteCommand?: (command: ActiveCommand, result?: any) => void;
}

export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'windy' | 'foggy' | 'stormy';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type TimeSpeed = 'slow' | 'normal' | 'fast' | 'turbo';
export type BuildTool = 'pan' | 'draw' | 'curve' | 'catalog' | 'upgrade' | 'roundabout';
export type MapTheme = 'default' | 'forest' | 'ocean' | 'desert' | 'neon' | 'retro' | 'pastel' | 'cherry';
