import React, { useState, useEffect } from 'react';
import { Contact } from '../types';
import { MapBuilding, CustomDecorNode } from './ToonMap/types';

export interface Desk {
  x: number;
  y: number;
  label: string;
  icon: string;
}

export const THEME_DESKS: Record<string, Desk[]> = {
  office: [
    { x: 15, y: 22, label: 'Workstation A', icon: '🖥️' },
    { x: 48, y: 18, label: 'Workstation B', icon: '🖥️' },
    { x: 82, y: 28, label: 'Workstation C', icon: '🖥️' },
    { x: 22, y: 62, label: 'Workstation D', icon: '🖥️' },
    { x: 76, y: 68, label: 'Workstation E', icon: '🖥️' },
  ],
  cafe: [
    { x: 15, y: 22, label: 'Table A', icon: '☕' },
    { x: 48, y: 18, label: 'Counter', icon: '🍳' },
    { x: 82, y: 28, label: 'Table B', icon: '☕' },
    { x: 22, y: 62, label: 'Table C', icon: '☕' },
    { x: 76, y: 68, label: 'Window Seat', icon: '🪟' },
  ],
  gym: [
    { x: 15, y: 22, label: 'Treadmill A', icon: '🏃' },
    { x: 48, y: 18, label: 'Bench Press', icon: '🏋️' },
    { x: 82, y: 28, label: 'Treadmill B', icon: '🏃' },
    { x: 22, y: 62, label: 'Yoga Mat', icon: '🧘' },
    { x: 76, y: 68, label: 'Dumbbell Rack', icon: '💪' },
  ],
  library: [
    { x: 15, y: 22, label: 'Bookshelf A', icon: '📚' },
    { x: 48, y: 18, label: 'Study Table A', icon: '📖' },
    { x: 82, y: 28, label: 'Bookshelf B', icon: '📚' },
    { x: 22, y: 62, label: 'Study Table B', icon: '📖' },
    { x: 76, y: 68, label: 'Reading Corner', icon: '🛋️' },
  ],
  entertainment: [
    { x: 15, y: 22, label: 'Arcade Cabin A', icon: '👾' },
    { x: 48, y: 18, label: 'Cinema Screen', icon: '🎬' },
    { x: 82, y: 28, label: 'Arcade Cabin B', icon: '👾' },
    { x: 22, y: 62, label: 'Prize Machine', icon: '🧸' },
    { x: 76, y: 68, label: 'Dance Mat', icon: '💃' },
  ],
  hospital: [
    { x: 15, y: 22, label: 'Bed A', icon: '🛏️' },
    { x: 48, y: 18, label: 'Reception', icon: '💼' },
    { x: 82, y: 28, label: 'Bed B', icon: '🛏️' },
    { x: 22, y: 62, label: 'Therapy Room', icon: '🩺' },
    { x: 76, y: 68, label: 'Pharmacy', icon: '💊' },
  ],
  lake: [
    { x: 15, y: 22, label: 'Coral Reef', icon: '🪸' },
    { x: 48, y: 18, label: 'Treasure Chest', icon: '🪙' },
    { x: 82, y: 28, label: 'Sunken Ship', icon: '⚓' },
    { x: 22, y: 62, label: 'Pearl Clam', icon: '🦪' },
    { x: 76, y: 68, label: 'Diving Zone', icon: '🤿' },
  ],
  park: [
    { x: 15, y: 22, label: 'Oak Shade', icon: '🌳' },
    { x: 48, y: 18, label: 'Central Fountain', icon: '⛲' },
    { x: 82, y: 28, label: 'Flower Bed', icon: '🌸' },
    { x: 22, y: 62, label: 'Wood Bench', icon: '🪑' },
    { x: 76, y: 68, label: 'Bike Trail', icon: '🚲' },
  ],
  mountain: [
    { x: 15, y: 30, label: 'Base Camp', icon: '⛺' },
    { x: 48, y: 15, label: 'Snowy Peak', icon: '🏔️' },
    { x: 82, y: 35, label: 'Cliff Bench', icon: '🪑' },
    { x: 22, y: 65, label: 'Hiking Trail', icon: '🥾' },
    { x: 76, y: 60, label: 'Summit Flag', icon: '🚩' },
  ]
};

const THEME_CLASSES: Record<string, { bg: string; border: string; dots: string; gridColor: string }> = {
  office: { bg: 'bg-[#e8f0fe]', border: 'border-blue-200', dots: 'rgba(59, 130, 246, 0.12)', gridColor: 'rgba(59, 130, 246, 0.03)' },
  cafe: { bg: 'bg-[#fdf6e2]', border: 'border-amber-200', dots: 'rgba(217, 119, 6, 0.12)', gridColor: 'rgba(217, 119, 6, 0.03)' },
  gym: { bg: 'bg-[#f1f5f9]', border: 'border-slate-300', dots: 'rgba(71, 85, 105, 0.12)', gridColor: 'rgba(71, 85, 105, 0.03)' },
  library: { bg: 'bg-[#faf7f0]', border: 'border-emerald-200', dots: 'rgba(16, 185, 129, 0.12)', gridColor: 'rgba(16, 185, 129, 0.03)' },
  entertainment: { bg: 'bg-[#0f172a]', border: 'border-violet-500/30', dots: 'rgba(139, 92, 246, 0.25)', gridColor: 'rgba(139, 92, 246, 0.05)' },
  hospital: { bg: 'bg-[#f0fdf4]', border: 'border-teal-200', dots: 'rgba(20, 184, 166, 0.12)', gridColor: 'rgba(20, 184, 166, 0.03)' },
  lake: { bg: 'bg-gradient-to-b from-[#0a4870] to-[#041c2c]', border: 'border-cyan-500/30', dots: 'rgba(6, 182, 212, 0.25)', gridColor: 'rgba(6, 182, 212, 0.05)' },
  park: { bg: 'bg-gradient-to-b from-[#bae6fd] via-[#f0fdf4] to-[#dcfce7]', border: 'border-emerald-500/30', dots: 'rgba(34, 197, 94, 0.15)', gridColor: 'rgba(34, 197, 94, 0.03)' },
  mountain: { bg: 'bg-gradient-to-b from-[#bae6fd] via-[#e2e8f0] to-[#94a3b8]', border: 'border-slate-400/30', dots: 'rgba(148, 163, 184, 0.2)', gridColor: 'rgba(148, 163, 184, 0.04)' }
};

interface RoamingCharacter {
  id: string;
  name: string;
  avatarUrl: string;
  targetX: number;
  targetY: number;
  speed: number;
  currentNodeId?: string;
  x?: number;
  y?: number;
  glovesCount?: number;
  health?: number;
  isKo?: boolean;
  koTimer?: number;
  collisionCooldown?: number;
}

interface BuildingBackgroundProps {
  buildingType: string;
  allContacts: Contact[];
  currentContact: Contact;
  building?: MapBuilding;
  isRenovating?: boolean;
  gameModeActive?: boolean;
  playerAvatarUrl?: string;
}

interface PlayerState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  glovesCount: number;
  health: number;
  isKo: boolean;
  koTimer: number;
  name: string;
  collisionCooldown: number;
}

interface GloveItem {
  id: string;
  x: number;
  y: number;
}

interface CycloneItem {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  rotationSpeed: number;
  size: number;
}

interface GameParticle {
  id: string;
  x: number;
  y: number;
  text: string;
  type: 'glove' | 'hit' | 'damage';
  age: number;
}

export const getThemeKey = (buildingType: string): string => {
  const typeKey = (buildingType || '').toLowerCase();
  if (typeKey.includes('cafe') || typeKey.includes('shop') || typeKey.includes('boba')) return 'cafe';
  if (typeKey.includes('training') || typeKey.includes('gym')) return 'gym';
  if (typeKey.includes('education') || typeKey.includes('library')) return 'library';
  if (typeKey.includes('entertainment') || typeKey.includes('arcade') || typeKey.includes('cinema')) return 'entertainment';
  if (typeKey.includes('hospital')) return 'hospital';
  if (typeKey.includes('lake')) return 'lake';
  if (typeKey.includes('park') || typeKey.includes('fountain') || typeKey.includes('garden') || typeKey.includes('forest')) return 'park';
  if (typeKey.includes('mountain') || typeKey.includes('peak') || typeKey.includes('hill') || typeKey.includes('climb')) return 'mountain';
  return 'office';
};

export const BuildingBackground: React.FC<BuildingBackgroundProps> = ({
  buildingType,
  allContacts,
  currentContact,
  building,
  isRenovating = false,
  gameModeActive = false,
  playerAvatarUrl
}) => {
  const theme = getThemeKey(buildingType);

  const desks = THEME_DESKS[theme] || THEME_DESKS.office;
  const colors = THEME_CLASSES[theme] || THEME_CLASSES.office;

  const [roamers, setRoamers] = useState<RoamingCharacter[]>([]);

  // Brawler Game states
  const [player, setPlayer] = useState<PlayerState>({
    x: 50,
    y: 80,
    targetX: 50,
    targetY: 80,
    glovesCount: 0,
    health: 100,
    isKo: false,
    koTimer: 0,
    name: 'You',
    collisionCooldown: 0
  });
  const [gloves, setGloves] = useState<GloveItem[]>([]);
  const [particles, setParticles] = useState<GameParticle[]>([]);
  const [cyclones, setCyclones] = useState<CycloneItem[]>([]);
  const [orbitAngle, setOrbitAngle] = useState(0);

  // Refs for tracking keyboard inputs and rendering values safely without stale closures
  const keysPressed = React.useRef<Record<string, boolean>>({});
  const latestRoamersRef = React.useRef<RoamingCharacter[]>([]);
  
  const gameStateRef = React.useRef<{
    player: PlayerState;
    roamers: RoamingCharacter[];
    gloves: GloveItem[];
    particles: GameParticle[];
    cyclones: CycloneItem[];
  }>({
    player: { x: 50, y: 80, targetX: 50, targetY: 80, glovesCount: 0, health: 100, isKo: false, koTimer: 0, name: 'You', collisionCooldown: 0 },
    roamers: [],
    gloves: [],
    particles: [],
    cyclones: []
  });


  const fishes = React.useMemo(() => {
    if (theme !== 'lake') return [];
    const fishEmojis = ['🐠', '🐟', '🐡', '🐙', '🦑'];
    return Array.from({ length: 12 }).map((_, idx) => {
      const direction = idx % 2 === 0 ? 'right' : 'left';
      const emoji = fishEmojis[idx % fishEmojis.length];
      const size = 20 + Math.random() * 15;
      const y = 10 + Math.random() * 80;
      const speed = 12 + Math.random() * 10;
      const delay = Math.random() * -20;
      return {
        id: idx,
        emoji,
        size,
        y,
        speed,
        direction,
        delay
      };
    });
  }, [theme]);

  const bubbles = React.useMemo(() => {
    if (theme !== 'lake') return [];
    return Array.from({ length: 15 }).map((_, idx) => {
      const x = Math.random() * 100;
      const size = 5 + Math.random() * 15;
      const speed = 8 + Math.random() * 6;
      const delay = Math.random() * -10;
      return {
        id: idx,
        x,
        size,
        speed,
        delay
      };
    });
  }, [theme]);

  const parkDecorations = React.useMemo(() => {
    if (theme !== 'park') return [];
    const icons = ['🌳', '🌲', '🌿', '🌱', '🍀', '🌸', '🌼', '🌻', '🪵'];
    return Array.from({ length: 18 }).map((_, idx) => {
      const icon = icons[idx % icons.length];
      const x = Math.random() * 100;
      const y = 15 + Math.random() * 75;
      const size = icon === '🌳' || icon === '🌲' ? (35 + Math.random() * 20) : (15 + Math.random() * 10);
      const opacity = icon === '🌳' || icon === '🌲' ? 0.25 : 0.4;
      return {
        id: idx,
        icon,
        x,
        y,
        size,
        opacity
      };
    });
  }, [theme]);

  const fallingPetals = React.useMemo(() => {
    if (theme !== 'park') return [];
    const leafEmojis = ['🌸', '🍃', '🍂', '🍁'];
    return Array.from({ length: 15 }).map((_, idx) => {
      const x = Math.random() * 100;
      const size = 10 + Math.random() * 12;
      const speed = 10 + Math.random() * 8;
      const delay = Math.random() * -15;
      const emoji = leafEmojis[idx % leafEmojis.length];
      return {
        id: idx,
        x,
        size,
        speed,
        delay,
        emoji
      };
    });
  }, [theme]);

  const mountainDecorations = React.useMemo(() => {
    if (theme !== 'mountain') return [];
    const icons = ['🏔️', '⛰️', '🌲', '🧗', '⛺', '🥾'];
    return Array.from({ length: 15 }).map((_, idx) => {
      const icon = icons[idx % icons.length];
      const x = Math.random() * 100;
      const y = 20 + Math.random() * 70;
      const size = icon === '🏔️' || icon === '⛰️' ? (50 + Math.random() * 30) : (18 + Math.random() * 10);
      const opacity = icon === '🏔️' || icon === '⛰️' ? 0.15 : 0.35;
      return {
        id: idx,
        icon,
        x,
        y,
        size,
        opacity
      };
    });
  }, [theme]);

  const floatingClouds = React.useMemo(() => {
    if (theme !== 'mountain') return [];
    const cloudEmojis = ['☁️'];
    return Array.from({ length: 8 }).map((_, idx) => {
      const x = Math.random() * 100;
      const y = 5 + Math.random() * 40;
      const size = 25 + Math.random() * 25;
      const speed = 25 + Math.random() * 20;
      const delay = Math.random() * -30;
      const emoji = cloudEmojis[idx % cloudEmojis.length];
      const direction = idx % 2 === 0 ? 'right' : 'left';
      return {
        id: idx,
        x,
        y,
        size,
        speed,
        delay,
        emoji,
        direction
      };
    });
  }, [theme]);

  const customNodes = building?.renovatedLayout?.nodes || [];
  const customPaths = building?.renovatedLayout?.paths || [];
  const activeNodes = customNodes.length > 0 ? customNodes : desks;

  const activeNodesRef = React.useRef(activeNodes);
  const customNodesRef = React.useRef(customNodes);
  const customPathsRef = React.useRef(customPaths);

  useEffect(() => {
    activeNodesRef.current = activeNodes;
    customNodesRef.current = customNodes;
    customPathsRef.current = customPaths;
  });

  useEffect(() => {
    // Get other AI contacts (exclude current manager/contact and groups)
    const others = allContacts.filter(c => c.id !== currentContact.id && c.isAi && !c.isGroup && c.avatarUrl);
    const reachableNodes = activeNodes.filter(n => !('aiReachable' in n) || (n as any).aiReachable !== false);
    if (others.length === 0 || reachableNodes.length === 0) return;

    // Pick up to 4 random other characters to roam
    const initialRoamers: RoamingCharacter[] = others.slice(0, 4).map(c => {
      // Pick a random initial node
      const node = reachableNodes[Math.floor(Math.random() * reachableNodes.length)];
      return {
        id: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        targetX: node.x,
        targetY: node.y,
        speed: 4 + Math.random() * 4,
        currentNodeId: 'id' in node ? (node as any).id : undefined
      };
    });
    setRoamers(initialRoamers);
  }, [allContacts, currentContact.id, activeNodes]);

  // Synchronize latest roamers to ref when not in game mode
  useEffect(() => {
    if (!gameModeActive) {
      latestRoamersRef.current = roamers;
    }
  }, [roamers, gameModeActive]);

  useEffect(() => {
    if (gameModeActive) return; // Skip normal random roaming interval in game mode

    const reachableNodes = activeNodes.filter(n => !('aiReachable' in n) || (n as any).aiReachable !== false);
    if (roamers.length === 0 || reachableNodes.length === 0) return;

    const interval = setInterval(() => {
      setRoamers(prev => prev.map(r => {
        // 80% chance to move to another node, 20% chance to stay
        if (Math.random() > 0.8) return r;
        
        let nextNode = reachableNodes[Math.floor(Math.random() * reachableNodes.length)];
        
        // If we have custom paths and the character is currently at a valid node
        if (customNodes.length > 0 && customPaths.length > 0 && r.currentNodeId) {
          const connectedPaths = customPaths.filter(p => p.fromId === r.currentNodeId);
          if (connectedPaths.length > 0) {
            // Find connected nodes that are also reachable
            const validConnectedNodes = connectedPaths
              .map(p => customNodes.find(n => n.id === p.toId))
              .filter((n): n is CustomDecorNode => !!n && n.aiReachable !== false);

            if (validConnectedNodes.length > 0) {
              nextNode = validConnectedNodes[Math.floor(Math.random() * validConnectedNodes.length)];
            }
          }
        }

        const nextSpeed = 5 + Math.random() * 5; // transit duration in seconds
        return {
          ...r,
          targetX: nextNode.x,
          targetY: nextNode.y,
          speed: nextSpeed,
          currentNodeId: 'id' in nextNode ? (nextNode as any).id : undefined
        };
      }));
    }, 6000); // Try moving every 6s

    return () => clearInterval(interval);
  }, [roamers.length, activeNodes, customNodes, customPaths, gameModeActive]);

  // Global Keyboard event handler for game mode
  useEffect(() => {
    if (!gameModeActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (keys.includes(e.key)) {
        keysPressed.current[e.key] = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (keys.includes(e.key)) {
        keysPressed.current[e.key] = false;
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressed.current = {};
    };
  }, [gameModeActive]);

  // Main Brawler Game loop tick (60 FPS)
  useEffect(() => {
    if (!gameModeActive) return;

    // Initialize game states inside ref for sync processing
    gameStateRef.current.player = {
      x: 50,
      y: 80,
      targetX: 50,
      targetY: 80,
      glovesCount: 0,
      health: 100,
      isKo: false,
      koTimer: 0,
      name: 'You',
      collisionCooldown: 0
    };

    gameStateRef.current.roamers = latestRoamersRef.current.map(r => ({
      ...r,
      x: r.targetX,
      y: r.targetY,
      glovesCount: 0,
      health: 100,
      isKo: false,
      koTimer: 0,
      collisionCooldown: 0
    }));

    gameStateRef.current.gloves = [];
    gameStateRef.current.particles = [];
    gameStateRef.current.cyclones = [];
 
    // Flush initial state immediately
    setPlayer({ ...gameStateRef.current.player });
    setRoamers([...gameStateRef.current.roamers]);
    setGloves([]);
    setParticles([]);
    setCyclones([]);
 
    let animationFrameId: number;
    let lastGloveSpawn = Date.now();
    let lastCycloneSpawn = Date.now();
    let localOrbitAngle = 0;

    const chooseNewTarget = (r: RoamingCharacter) => {
      const reachableNodes = activeNodesRef.current.filter(n => !('aiReachable' in n) || (n as any).aiReachable !== false);
      if (reachableNodes.length === 0) return { targetX: r.x ?? 50, targetY: r.y ?? 50, currentNodeId: undefined };

      let nextNode = reachableNodes[Math.floor(Math.random() * reachableNodes.length)];
      
      if (customNodesRef.current.length > 0 && customPathsRef.current.length > 0 && r.currentNodeId) {
        const connectedPaths = customPathsRef.current.filter(p => p.fromId === r.currentNodeId);
        if (connectedPaths.length > 0) {
          const validConnectedNodes = connectedPaths
            .map(p => customNodesRef.current.find(n => n.id === p.toId))
            .filter((n): n is CustomDecorNode => !!n && n.aiReachable !== false);

          if (validConnectedNodes.length > 0) {
            nextNode = validConnectedNodes[Math.floor(Math.random() * validConnectedNodes.length)];
          }
        }
      }

      return {
        targetX: nextNode.x,
        targetY: nextNode.y,
        currentNodeId: 'id' in nextNode ? (nextNode as any).id : undefined
      };
    };

    const tick = () => {
      const now = Date.now();
      const state = gameStateRef.current;

      const getCollisionRadius = (char: any) => {
        const g = char.glovesCount ?? 0;
        if (g === 0) return 3.0;
        // Glove orbit radius is 40 + g * 6 pixels.
        // Assuming ~8px is 1% of screen width, the radius in percentage is (40 + g * 6) / 8.0
        return 3.0 + (40 + g * 6) / 8.0;
      };

      const dealDamage = (char: any, px: number, py: number, isPlayer: boolean, dmg: number) => {
        char.health = Math.max(0, (char.health ?? 100) - dmg);
        state.particles.push({
          id: `p_dmg_${now}_${Math.random()}`,
          x: px,
          y: py - 6,
          text: `-${dmg} HP`,
          type: 'damage',
          age: 0
        });

        if (char.health <= 0) {
          char.isKo = true;
          char.koTimer = 3.0;
          char.glovesCount = 0; // Reset gloves
          state.particles.push({
            id: `p_ko_${now}_${Math.random()}`,
            x: isPlayer ? char.x : (char.x ?? char.targetX),
            y: (isPlayer ? char.y : (char.y ?? char.targetY)) - 10,
            text: '💀 KO!',
            type: 'damage',
            age: 0
          });
        }
      };

      // 1. Update orbit angle
      localOrbitAngle = (localOrbitAngle + 0.05) % (2 * Math.PI);
      setOrbitAngle(localOrbitAngle);

      // 2. Glove Spawn Logic (every 3 seconds, cap at 7)
      if (now - lastGloveSpawn > 3000) {
        lastGloveSpawn = now;
        if (state.gloves.length < 7) {
          state.gloves.push({
            id: `glove_${now}_${Math.random()}`,
            x: 5 + Math.random() * 90,
            y: 20 + Math.random() * 65
          });
        }
      }

      // 3. Update Player
      if (state.player.collisionCooldown > 0) {
        state.player.collisionCooldown -= 1/60;
      }

      if (state.player.isKo) {
        state.player.koTimer -= 1/60;
        if (state.player.koTimer <= 0) {
          state.player.isKo = false;
          state.player.health = 100;
          state.player.glovesCount = 0;
          state.player.x = 50;
          state.player.y = 80;
          state.player.targetX = 50;
          state.player.targetY = 80;
          state.particles.push({
            id: `p_spawn_${now}`,
            x: 50,
            y: 75,
            text: 'Spawned!',
            type: 'glove',
            age: 0
          });
        }
      } else {
        // Read movement keys
        let moveX = 0;
        let moveY = 0;
        if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['W']) moveY -= 1;
        if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['S']) moveY += 1;
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) moveX -= 1;
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
          const len = Math.sqrt(moveX * moveX + moveY * moveY);
          const speed = 0.45;
          state.player.x += (moveX / len) * speed;
          state.player.y += (moveY / len) * speed;
          state.player.targetX = state.player.x;
          state.player.targetY = state.player.y;
        } else {
          // move towards click target
          const dx = state.player.targetX - state.player.x;
          const dy = state.player.targetY - state.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.5) {
            const speed = 0.45;
            state.player.x += (dx / dist) * Math.min(speed, dist);
          }
        }

        // Clamp boundaries
        state.player.x = Math.max(5, Math.min(95, state.player.x));
        state.player.y = Math.max(15, Math.min(85, state.player.y));
      }

      // 4. Update Roamers
      state.roamers.forEach(r => {
        if ((r.collisionCooldown ?? 0) > 0) {
          r.collisionCooldown = (r.collisionCooldown ?? 0) - 1/60;
        }

        if (r.isKo) {
          r.koTimer = (r.koTimer ?? 0) - 1/60;
          if (r.koTimer <= 0) {
            r.isKo = false;
            r.health = 100;
            r.glovesCount = 0;
            const reachableNodes = activeNodesRef.current.filter(n => !('aiReachable' in n) || (n as any).aiReachable !== false);
            if (reachableNodes.length > 0) {
              const node = reachableNodes[Math.floor(Math.random() * reachableNodes.length)];
              r.x = node.x;
              r.y = node.y;
              r.targetX = node.x;
              r.targetY = node.y;
              r.currentNodeId = 'id' in node ? (node as any).id : undefined;
            }
          }
        } else {
          // Move roamer towards destination (prioritize nearest spawned glove)
          const rx = r.x ?? r.targetX;
          const ry = r.y ?? r.targetY;

          let targetX = r.targetX;
          let targetY = r.targetY;
          let chasingGlove = false;

          if (state.gloves.length > 0) {
            let nearestGlove: GloveItem | null = null;
            let minDist = Infinity;
            state.gloves.forEach(g => {
              const gdx = g.x - rx;
              const gdy = g.y - ry;
              const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
              if (gdist < minDist) {
                minDist = gdist;
                nearestGlove = g;
              }
            });

            if (nearestGlove) {
              targetX = (nearestGlove as GloveItem).x;
              targetY = (nearestGlove as GloveItem).y;
              chasingGlove = true;
            }
          }

          const dx = targetX - rx;
          const dy = targetY - ry;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;

          if (chasingGlove) {
            // Chase the glove
            const speed = 0.22;
            if (dist > 0.5) {
              r.x = rx + (dx / dist) * speed;
              r.y = ry + (dy / dist) * speed;
            }
          } else {
            // Normal desk roaming
            if (dist < 1.0) {
              const nextT = chooseNewTarget(r);
              r.targetX = nextT.targetX;
              r.targetY = nextT.targetY;
              r.currentNodeId = nextT.currentNodeId;
            } else {
              const speed = 0.22;
              r.x = rx + (dx / dist) * speed;
              r.y = ry + (dy / dist) * speed;
            }
          }
        }
      });

      // 4.5 Cyclone Spawn, Update, & Collision Logic (Spawn every 5.5s, max 3)
      if (now - lastCycloneSpawn > 5500) {
        lastCycloneSpawn = now;
        if (state.cyclones.length < 3) {
          const side = Math.floor(Math.random() * 4);
          let cx = 0, cy = 0, cvx = 0, cvy = 0;
          if (side === 0) { // Left
            cx = -5;
            cy = 20 + Math.random() * 60;
            cvx = 0.22 + Math.random() * 0.22;
            cvy = (Math.random() - 0.5) * 0.15;
          } else if (side === 1) { // Right
            cx = 105;
            cy = 20 + Math.random() * 60;
            cvx = -(0.22 + Math.random() * 0.22);
            cvy = (Math.random() - 0.5) * 0.15;
          } else if (side === 2) { // Top
            cx = 10 + Math.random() * 80;
            cy = -5;
            cvx = (Math.random() - 0.5) * 0.15;
            cvy = 0.22 + Math.random() * 0.22;
          } else { // Bottom
            cx = 10 + Math.random() * 80;
            cy = 105;
            cvx = (Math.random() - 0.5) * 0.15;
            cvy = -(0.22 + Math.random() * 0.22);
          }

          state.cyclones.push({
            id: `cyclone_${now}_${Math.random()}`,
            x: cx,
            y: cy,
            vx: cvx,
            vy: cvy,
            angle: Math.random() * 360,
            rotationSpeed: 4 + Math.random() * 4,
            size: 44 + Math.random() * 16
          });
        }
      }

      // Move cyclones
      state.cyclones = state.cyclones.map(c => {
        c.x += c.vx;
        c.y += c.vy;
        c.angle = (c.angle + c.rotationSpeed) % 360;
        return c;
      });

      // Cyclone collisions with Player
      if (!state.player.isKo && (state.player.collisionCooldown ?? 0) <= 0) {
        state.cyclones = state.cyclones.filter(c => {
          const dx = state.player.x - c.x;
          const dy = state.player.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pR = getCollisionRadius(state.player);
          if (dist < pR + 4.5) { // Cyclone collision range
            // Spawn hit particle
            state.particles.push({
              id: `p_hit_cy_${now}_${Math.random()}`,
              x: (state.player.x + c.x) / 2,
              y: (state.player.y + c.y) / 2,
              text: '💥🥊',
              type: 'hit',
              age: 0
            });

            state.player.collisionCooldown = 1.0;

            if (state.player.glovesCount > 0) {
              // Offset 1 glove
              state.player.glovesCount = Math.max(0, state.player.glovesCount - 1);
              state.particles.push({
                id: `p_glove_cy_${now}_${Math.random()}`,
                x: state.player.x,
                y: state.player.y - 12,
                text: '-1 🥊',
                type: 'hit',
                age: 0
              });
            } else {
              // Take damage
              dealDamage(state.player, state.player.x, state.player.y, true, 25);
            }
            return false;
          }
          return true;
        });
      }

      // Cyclone collisions with Roamers
      state.roamers.forEach(r => {
        if (!r.isKo && (r.collisionCooldown ?? 0) <= 0) {
          state.cyclones = state.cyclones.filter(c => {
            const rx = r.x ?? r.targetX;
            const ry = r.y ?? r.targetY;
            const dx = rx - c.x;
            const dy = ry - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const rR = getCollisionRadius(r);
            if (dist < rR + 4.5) {
              state.particles.push({
                id: `p_hit_cy_r_${r.id}_${now}_${Math.random()}`,
                x: (rx + c.x) / 2,
                y: (ry + c.y) / 2,
                text: '💥🥊',
                type: 'hit',
                age: 0
              });

              r.collisionCooldown = 1.0;

              if ((r.glovesCount ?? 0) > 0) {
                r.glovesCount = Math.max(0, (r.glovesCount ?? 0) - 1);
                state.particles.push({
                  id: `p_glove_cy_r_${r.id}_${now}`,
                  x: rx,
                  y: ry - 12,
                  text: '-1 🥊',
                  type: 'hit',
                  age: 0
                });
              } else {
                dealDamage(r, rx, ry, false, 25);
              }
              return false;
            }
            return true;
          });
        }
      });

      // Filter out offscreen cyclones
      state.cyclones = state.cyclones.filter(c => c.x >= -15 && c.x <= 115 && c.y >= -15 && c.y <= 115);

      // 5. Glove Collection Detection
      // Player
      if (!state.player.isKo) {
        state.gloves = state.gloves.filter(g => {
          const dx = state.player.x - g.x;
          const dy = state.player.y - g.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5.0) {
            state.player.glovesCount += 1;
            state.particles.push({
              id: `p_glove_p_${now}_${Math.random()}`,
              x: state.player.x,
              y: state.player.y - 5,
              text: '+1 🥊',
              type: 'glove',
              age: 0
            });
            return false;
          }
          return true;
        });
      }

      // Roamers
      state.roamers.forEach(r => {
        if (r.isKo) return;
        state.gloves = state.gloves.filter(g => {
          const rx = r.x ?? r.targetX;
          const ry = r.y ?? r.targetY;
          const dx = rx - g.x;
          const dy = ry - g.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5.0) {
            r.glovesCount = (r.glovesCount ?? 0) + 1;
            state.particles.push({
              id: `p_glove_r_${r.id}_${now}_${Math.random()}`,
              x: rx,
              y: ry - 5,
              text: '+1 🥊',
              type: 'glove',
              age: 0
            });
            return false;
          }
          return true;
        });
      });

      // 6. Collision & Combat Settlement

      const handleCollision = (charA: any, charB: any, isPlayerA = false, isPlayerB = false) => {
        // Cooldown check to prevent instant KOs when overlapping
        if ((charA.collisionCooldown ?? 0) > 0 || (charB.collisionCooldown ?? 0) > 0) {
          return;
        }

        const ax = isPlayerA ? charA.x : (charA.x ?? charA.targetX);
        const ay = isPlayerA ? charA.y : (charA.y ?? charA.targetY);
        const bx = isPlayerB ? charB.x : (charB.x ?? charB.targetX);
        const by = isPlayerB ? charB.y : (charB.y ?? charB.targetY);

        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;

        const rA = getCollisionRadius(charA);
        const rB = getCollisionRadius(charB);
        const threshold = rA + rB;

        if (dist < threshold) {
          // Apply collision cooldown (1.0 second) to both characters instead of pushback
          charA.collisionCooldown = 1.0;
          charB.collisionCooldown = 1.0;

          // Spawn hit particle at center
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;
          state.particles.push({
            id: `p_hit_${now}_${Math.random()}`,
            x: midX,
            y: midY,
            text: '💥',
            type: 'hit',
            age: 0
          });

          // Combat resolution
          const gA = charA.glovesCount ?? 0;
          const gB = charB.glovesCount ?? 0;
          const minGloves = Math.min(gA, gB);

          charA.glovesCount = gA - minGloves;
          charB.glovesCount = gB - minGloves;

          // Damage logic
          if (charA.glovesCount > 0 && charB.glovesCount === 0) {
            dealDamage(charB, midX, midY, isPlayerB, 25);
          } else if (charB.glovesCount > 0 && charA.glovesCount === 0) {
            dealDamage(charA, midX, midY, isPlayerA, 25);
          } else if (charA.glovesCount === 0 && charB.glovesCount === 0) {
            if (gA === 0 && gB === 0) {
              // Both had no protection, both take damage
              dealDamage(charA, isPlayerA ? charA.x : (charA.x ?? charA.targetX), isPlayerA ? charA.y : (charA.y ?? charA.targetY), isPlayerA, 25);
              dealDamage(charB, isPlayerB ? charB.x : (charB.x ?? charB.targetX), isPlayerB ? charB.y : (charB.y ?? charB.targetY), isPlayerB, 25);
            }
          }
        }
      };


      // Player vs Roamers
      if (!state.player.isKo) {
        state.roamers.forEach(r => {
          if (!r.isKo) {
            handleCollision(state.player, r, true, false);
          }
        });
      }

      // Roamers vs Roamers
      for (let i = 0; i < state.roamers.length; i++) {
        for (let j = i + 1; j < state.roamers.length; j++) {
          const r1 = state.roamers[i];
          const r2 = state.roamers[j];
          if (!r1.isKo && !r2.isKo) {
            handleCollision(r1, r2, false, false);
          }
        }
      }

      // 7. Update Particles
      state.particles = state.particles
        .map(p => ({ ...p, age: p.age + 1 }))
        .filter(p => p.age < 50);

      // 8. Push updates to React state
      setPlayer({ ...state.player });
      setRoamers([...state.roamers]);
      setGloves([...state.gloves]);
      setParticles([...state.particles]);
      setCyclones([...state.cyclones]);

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameModeActive]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameModeActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(5, Math.min(95, clickX));
    const clampedY = Math.max(15, Math.min(85, clickY));

    setPlayer(prev => ({
      ...prev,
      targetX: clampedX,
      targetY: clampedY
    }));

    gameStateRef.current.player.targetX = clampedX;
    gameStateRef.current.player.targetY = clampedY;
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={`absolute inset-0 z-0 overflow-hidden transition-colors duration-500 ${colors.bg} ${gameModeActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
    >
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(${colors.dots} 2px, transparent 2px), linear-gradient(${colors.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${colors.gridColor} 1px, transparent 1px)`,
          backgroundSize: '30px 30px, 30px 30px, 30px 30px',
          backgroundPosition: '0 0, 15px 15px, 15px 15px'
        }}
      />

      {/* Custom Renovation Background Image */}
      {building?.chatBgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{
            backgroundImage: `url(${building.chatBgImage})`,
            opacity: building.chatBgOpacity !== undefined ? building.chatBgOpacity : 0.95
          }}
        />
      )}

      {/* Lake Theme Bubbles */}
      {!isRenovating && theme === 'lake' && bubbles.map(b => (
        <div
          key={b.id}
          className="absolute rounded-full border-2 border-white/40 bg-white/10 pointer-events-none"
          style={{
            left: `${b.x}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            bottom: '-20px',
            animation: `riseBubble ${b.speed}s infinite linear`,
            animationDelay: `${b.delay}s`
          }}
        />
      ))}

      {/* Lake Theme Fish Swimming */}
      {!isRenovating && theme === 'lake' && fishes.map(f => (
        <div
          key={f.id}
          className="absolute pointer-events-none select-none"
          style={{
            top: `${f.y}%`,
            fontSize: `${f.size}px`,
            animation: `${f.direction === 'right' ? 'swimRight' : 'swimLeft'} ${f.speed}s infinite linear`,
            animationDelay: `${f.delay}s`,
            zIndex: f.size > 35 ? 15 : 5
          }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Park Theme Decorations */}
      {!isRenovating && theme === 'park' && parkDecorations.map(d => (
        <div
          key={d.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            fontSize: `${d.size}px`,
            opacity: d.opacity,
            transform: 'translate(-50%, -50%)',
            zIndex: d.size > 35 ? 1 : 2
          }}
        >
          {d.icon}
        </div>
      ))}

      {/* Park Theme Falling Leaves/Petals */}
      {!isRenovating && theme === 'park' && fallingPetals.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${p.x}%`,
            fontSize: `${p.size}px`,
            top: '-20px',
            animation: `fallAndSway ${p.speed}s infinite linear`,
            animationDelay: `${p.delay}s`
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Mountain Theme Decorations */}
      {!isRenovating && theme === 'mountain' && mountainDecorations.map(d => (
        <div
          key={d.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            fontSize: `${d.size}px`,
            opacity: d.opacity,
            transform: 'translate(-50%, -50%)',
            zIndex: d.icon === '🏔️' || d.icon === '⛰️' ? 1 : 2
          }}
        >
          {d.icon}
        </div>
      ))}

      {/* Mountain Theme Floating Clouds / Birds */}
      {!isRenovating && theme === 'mountain' && floatingClouds.map(c => (
        <div
          key={c.id}
          className="absolute pointer-events-none select-none"
          style={{
            top: `${c.y}%`,
            fontSize: `${c.size}px`,
            animation: `${c.direction === 'right' ? 'swimRight' : 'swimLeft'} ${c.speed}s infinite linear`,
            animationDelay: `${c.delay}s`,
            opacity: c.emoji === '☁️' || c.emoji === '💨' ? 0.35 : 0.5,
            zIndex: 3
          }}
        >
          {c.emoji}
        </div>
      ))}

      {/* Title Watermark */}
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none text-center pointer-events-none w-full">
        <h1 className="text-[8rem] font-black tracking-widest leading-none uppercase">
          {theme}
        </h1>
      </div>

      {/* Render Desks or Custom Renovated Nodes */}
      {!isRenovating && (
        customNodes.length > 0 ? (
          customNodes.map((node) => {
            const isMultimedia = node.type === 'video' || node.type === 'gif';
            const isImage = node.type === 'image';
            
            return (
              <div
                key={node.id}
                className={`absolute flex flex-col items-center justify-center border-3 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden bg-white/90`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  transform: `translate(-50%, -50%) rotate(${node.rotation}deg)`,
                  zIndex: node.zIndex ?? 10
                }}
              >
                {isImage && node.url && (
                  <img src={node.url} alt={node.label} className="w-full h-full object-cover pointer-events-none select-none" />
                )}
                
                {isMultimedia && node.url && (
                  (node.url.endsWith('.mp4') || node.url.endsWith('.webm') || node.url.includes('video')) ? (
                    <video src={node.url} autoPlay loop muted playsInline className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <img src={node.url} alt={node.label} className="w-full h-full object-cover pointer-events-none select-none" />
                  )
                )}
                
                {node.type === 'decor' && (
                  <div className="flex flex-col items-center justify-center p-2 text-center w-full h-full">
                    <span className="text-3xl animate-[bounceDesks_2s_infinite_ease-in-out]">
                      {node.icon}
                    </span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mt-1 truncate max-w-full block">
                      {node.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          desks.map((desk, idx) => (
            <div
              key={idx}
              className={`absolute flex flex-col items-center bg-white/70 border-3 border-black rounded-2xl p-2 shadow-[3px_3px_0px_rgba(0,0,0,1)] z-10 transition-all duration-300 w-24
                ${theme === 'entertainment' ? 'bg-slate-900/80 border-violet-500 shadow-[3px_3px_0px_#8b5cf6] text-white' : ''}
                ${theme === 'lake' ? 'bg-slate-900/80 border-cyan-500 shadow-[3px_3px_0px_#06b6d4] text-white' : ''}
                ${theme === 'park' ? 'bg-emerald-50/90 border-emerald-500 shadow-[3px_3px_0px_#10b981] text-emerald-950' : ''}
                ${theme === 'mountain' ? 'bg-slate-50/90 border-slate-500 shadow-[3px_3px_0px_#64748b] text-slate-900' : ''}
              `}
              style={{ left: `${desk.x}%`, top: `${desk.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="text-3xl animate-[bounceDesks_2s_infinite_ease-in-out]" style={{ animationDelay: `${idx * 0.4}s` }}>
                {desk.icon}
              </span>
              <span className={`text-[8px] font-black text-slate-500 uppercase tracking-wider mt-1 text-center truncate w-full
                ${theme === 'entertainment' ? 'text-violet-300' : ''}
                ${theme === 'lake' ? 'text-cyan-300' : ''}
                ${theme === 'park' ? 'text-emerald-700' : ''}
                ${theme === 'mountain' ? 'text-slate-600' : ''}
              `}>
                {desk.label}
              </span>
            </div>
          ))
        ))
      }

      {/* Spawned Gloves on the Ground */}
      {gameModeActive && gloves.map(g => (
        <div
          key={g.id}
          className="absolute z-10 text-2xl select-none pointer-events-none animate-bounce"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          🥊
        </div>
      ))}

      {/* Render Cyclone Obstacles */}
      {gameModeActive && cyclones.map(c => (
        <div
          key={c.id}
          className="absolute z-20 select-none pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${c.size}px`,
            height: `${c.size}px`,
          }}
        >
          {/* Swirling Gloves forming the cyclone (No vortex emoji) */}
          <div 
            className="absolute inset-0 select-none pointer-events-none"
            style={{ 
              transform: `rotate(${c.angle}deg)`,
              width: '100%',
              height: '100%'
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => {
              const angleRad = (i * 2 * Math.PI) / 4;
              const radius = c.size / 2.5;
              const gx = Math.cos(angleRad) * radius;
              const gy = Math.sin(angleRad) * radius;
              const angleDeg = (angleRad * 180) / Math.PI;
              return (
                <span
                  key={i}
                  className="absolute text-lg select-none pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${gx}px, ${gy}px) rotate(${angleDeg + 135}deg)`
                  }}
                >
                  🥊
                </span>
              );
            })}
          </div>
        </div>
      ))}

      {/* Render Player Avatar */}
      {gameModeActive && (
        <div
          className="absolute z-30 flex flex-col items-center pointer-events-none"
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Player avatar body */}
          <div className={`flex flex-col items-center relative ${player.isKo ? 'opacity-40 rotate-[75deg] grayscale transition-all duration-300' : 'animate-[toonWalkBob_0.8s_infinite_ease-in-out]'}`}>
            {/* HP Bar */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div className="bg-red-500 h-full transition-all" style={{ width: `${player.health}%` }} />
            </div>

            {/* Avatar circle wrapper (relative container for orbit centering) */}
            <div className="w-11 h-11 relative">
              {/* Orbiting Gloves for Player */}
              {player.glovesCount > 0 && Array.from({ length: player.glovesCount }).map((_, i) => {
                const angle = orbitAngle + (i * 2 * Math.PI) / player.glovesCount;
                const radius = 40 + player.glovesCount * 6;
                const gx = Math.cos(angle) * radius;
                const gy = Math.sin(angle) * radius;
                const angleDeg = (angle * 180) / Math.PI;
                return (
                  <span
                    key={`player_glove_${i}`}
                    className="absolute text-lg select-none pointer-events-none z-40 origin-center"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${gx}px, ${gy}px) rotate(${angleDeg + 135}deg)`
                    }}
                  >
                    🥊
                  </span>
                );
              })}

              {/* Avatar circle */}
              <div className="w-full h-full rounded-full border-3 border-yellow-400 ring-4 ring-yellow-300/50 overflow-hidden bg-white shadow-[0_0_12px_rgba(250,204,21,0.6)] relative">
                <img src={playerAvatarUrl || 'https://api.dicebear.com/7.x/pixel-art/svg'} alt="You" className="w-full h-full object-cover" />
                
                {/* KO overlay text */}
                {player.isKo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full text-white font-black text-[9px] uppercase tracking-wide">
                    KO {Math.ceil(player.koTimer)}s
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-400 text-black text-[7px] px-1.5 py-0.5 rounded-full border-2 border-black font-black mt-1 uppercase tracking-wider shadow-sm text-center truncate max-w-[64px]">
              You
            </div>
          </div>
        </div>
      )}

      {/* Render Roaming Characters */}
      {!isRenovating && roamers.map(r => (
        <div
          key={r.id}
          className="absolute z-20 flex flex-col items-center pointer-events-none"
          style={{
            left: `${gameModeActive ? (r.x ?? r.targetX) : r.targetX}%`,
            top: `${gameModeActive ? (r.y ?? r.targetY) : r.targetY}%`,
            transform: 'translate(-50%, -50%)',
            transition: gameModeActive ? 'none' : `left ${r.speed}s linear, top ${r.speed}s linear`
          }}
        >
          {/* Bobbing character body */}
          <div className={`flex flex-col items-center relative ${gameModeActive && r.isKo ? 'opacity-40 rotate-[75deg] grayscale transition-all duration-300' : 'animate-[toonWalkBob_0.8s_infinite_ease-in-out]'}`}>
            {/* HP Bar for Roamer in Game Mode */}
            {gameModeActive && (
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                <div className="bg-red-500 h-full transition-all" style={{ width: `${r.health ?? 100}%` }} />
              </div>
            )}

            {/* Avatar circle wrapper (relative container for orbit centering) */}
            <div className="w-11 h-11 relative">
              {/* Orbiting Gloves for Roamer */}
              {gameModeActive && (r.glovesCount ?? 0) > 0 && Array.from({ length: r.glovesCount ?? 0 }).map((_, i) => {
                const angle = orbitAngle + (i * 2 * Math.PI) / (r.glovesCount ?? 1);
                const radius = 40 + (r.glovesCount ?? 0) * 6;
                const gx = Math.cos(angle) * radius;
                const gy = Math.sin(angle) * radius;
                const angleDeg = (angle * 180) / Math.PI;
                return (
                  <span
                    key={`roamer_${r.id}_glove_${i}`}
                    className="absolute text-lg select-none pointer-events-none z-40 origin-center"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${gx}px, ${gy}px) rotate(${angleDeg + 135}deg)`
                    }}
                  >
                    🥊
                  </span>
                );
              })}

              {/* Avatar circle */}
              <div className="w-full h-full rounded-full border-3 border-black overflow-hidden bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] relative">
                <img src={r.avatarUrl} alt={r.name} className="w-full h-full object-cover" />
                
                {/* KO overlay text */}
                {gameModeActive && r.isKo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full text-white font-black text-[9px] uppercase tracking-wide">
                    KO {Math.ceil(r.koTimer ?? 0)}s
                  </div>
                )}
              </div>
            </div>

            <div className={`bg-black text-white text-[7px] px-1.5 py-0.5 rounded-full border-2 border-black font-black mt-1 uppercase tracking-wider shadow-sm text-center truncate max-w-[64px]
              ${theme === 'entertainment' ? 'bg-violet-600 border-white text-white' : ''}
              ${theme === 'lake' ? 'bg-cyan-600 border-white text-white' : ''}
              ${theme === 'park' ? 'bg-emerald-600 border-white text-white' : ''}
              ${theme === 'mountain' ? 'bg-slate-600 border-white text-white' : ''}
            `}>
              {r.name}
            </div>
          </div>
        </div>
      ))}

      {/* Floating Particles (Damage, Hits, +1 Glove) */}
      {gameModeActive && particles.map(p => {
        let colorClass = 'text-green-500 font-bold';
        if (p.type === 'hit') colorClass = 'text-2xl';
        if (p.type === 'damage') colorClass = 'text-red-500 font-black text-xs drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]';
        
        const floatY = p.age * 0.8; 
        const opacity = Math.max(0, 1 - p.age / 50);

        return (
          <div
            key={p.id}
            className={`absolute z-40 select-none pointer-events-none ${colorClass} transition-opacity duration-75`}
            style={{
              left: `${p.x}%`,
              top: `calc(${p.y}% - ${floatY}px)`,
              opacity: opacity,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {p.text}
          </div>
        );
      })}

      <style>{`
        @keyframes toonWalkBob {
          0%, 100% { transform: translateY(0) scaleX(1); }
          50% { transform: translateY(-7px) scaleX(0.94); }
        }
        @keyframes bounceDesks {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes swimRight {
          0% { left: -10%; transform: scaleX(-1); }
          100% { left: 110%; transform: scaleX(-1); }
        }
        @keyframes swimLeft {
          0% { left: 110%; transform: scaleX(1); }
          100% { left: -10%; transform: scaleX(1); }
        }
        @keyframes riseBubble {
          0% { transform: translate(0, 110vh) scale(0.5); opacity: 0; }
          50% { transform: translate(15px, 50vh) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-15px, -10vh) scale(1.2); opacity: 0; }
        }
        @keyframes fallAndSway {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translate(60px, 110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
