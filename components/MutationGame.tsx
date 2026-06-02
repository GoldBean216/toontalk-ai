import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Contact } from '../types';
import { useLanguage } from '../lib/language-context';

interface MutationGameProps {
    onBack: () => void;
    userAvatar: string;
    contacts: Contact[];
    onRewardCoins: (amount: number) => void;
}

interface Wall {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface ZombieCorpse {
    id: string;
    x: number;
    y: number;
    color: string;
    timeRemaining: number; // disappears after some frames
}

interface PowerUp {
    id: string;
    x: number;
    y: number;
    type: 'energy' | 'shield' | 'bomb';
    radius: number;
}

interface Character {
    id: string;
    name: string;
    avatarUrl: string;
    team: 'human' | 'zombie';
    level: number; // 1, 2, 3
    hp: number;
    maxHp: number;
    x: number;
    y: number;
    angle: number;
    speed: number;
    score: number;
    isAlive: boolean;
    respawnTimer: number; // in frames
    ammo: number;
    maxAmmo: number;
    isReloading: boolean;
    reloadTimer: number; // in frames
    skillCooldown: number; // in frames
    skillDuration: number; // active skill time remaining in frames
    lastDamageTime: number; // timestamp in ms
    color: string;
    dashEnergy: number;
    dashActiveTimer: number;
    dashDirectionX: number;
    dashDirectionY: number;
    speedBuffDuration: number;
    hasShield: boolean;
    hitSlowdownTimer?: number;
    bombCount?: number;
}

interface Bullet {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    ownerId: string;
}

interface ThrownBomb {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    fuse: number;
    radius: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    type: 'spark' | 'smoke' | 'blood';
}

const LOCAL_TRANS = {
    English: {
        title: 'Mutation Mode',
        humans: 'Humans',
        zombies: 'Zombies',
        timeRemaining: 'Time',
        prepTime: 'Mutation prep time',
        gameOver: 'MATCH OVER',
        btnPlayAgain: 'PLAY AGAIN',
        btnBack: 'BACK TO LOBBY',
        score: 'Score',
        kills: 'Kills',
        ammo: 'Ammo',
        humanWin: '🏆 HUMAN TEAM VICTORY!',
        zombieWin: '💀 ZOMBIE TEAM VICTORY!',
        infectedMsg: 'was infected!',
        coinsRewarded: 'TT Coins Rewarded',
        instruction: '⌨️ WASD to Move | 🖱️ Aim & Click to Shoot | E key to throw Bomb | G key to activate Zombie Skill',
        lvl: 'Lvl',
    },
    '简体中文': {
        title: '终结者生化大乱斗',
        humans: '人类佣兵',
        zombies: '生化幽灵',
        timeRemaining: '倒计时',
        prepTime: '距离生化幽灵变异还有',
        gameOver: '战斗结束',
        btnPlayAgain: '再玩一次',
        btnBack: '返回大厅',
        score: '分数',
        kills: '击杀',
        ammo: '弹药',
        humanWin: '🏆 佣兵胜利！幽灵已被消灭殆尽！',
        zombieWin: '💀 幽灵胜利！人类已全军覆没！',
        infectedMsg: '被感染变异了！',
        coinsRewarded: '获得 TT 币',
        instruction: '⌨️ WASD移动 | 🖱️ 鼠标瞄准，左键射击 | E 键投掷炸弹 | 变异后按 G 键使用幽灵进化技能',
        lvl: '等级',
    }
};

// Web Audio sound synthesizer for Mutation Game
const createMutationSoundEngine = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass() as AudioContext;

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    // Low roar frequency vibrato
    const playZombieRoar = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.2);

        lfo.frequency.setValueAtTime(15, ctx.currentTime); // 15Hz vibrato
        lfoGain.gain.setValueAtTime(25, ctx.currentTime); // 25Hz frequency pitch shift

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(ctx.destination);

        lfo.start();
        osc.start();
        lfo.stop(ctx.currentTime + 1.2);
        osc.stop(ctx.currentTime + 1.2);
    };

    // Gunshot white noise click
    const playGunshot = () => {
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    };

    // Wet slap for infection
    const playInfectSound = () => {
        playTone(180, 'sine', 0.1, 0.2);
        setTimeout(() => playTone(90, 'sine', 0.12, 0.25), 40);
    };

    return {
        shoot: playGunshot,
        infect: playInfectSound,
        roar: playZombieRoar,
        reload: () => {
            playTone(600, 'triangle', 0.1, 0.05);
            setTimeout(() => playTone(900, 'triangle', 0.1, 0.05), 150);
        },
        click: () => {
            playTone(1500, 'sine', 0.03, 0.03);
        },
        alarm: () => {
            playTone(220, 'sawtooth', 0.4, 0.08);
        },
        dash: () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(350, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        },
        explosion: () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.8);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        },
        ctx
    };
};

export const MutationGame: React.FC<MutationGameProps> = ({ onBack, userAvatar, contacts, onRewardCoins }) => {
    const { language } = useLanguage();
    const t = LOCAL_TRANS[language as keyof typeof LOCAL_TRANS] || LOCAL_TRANS.English;

    // Game stats
    const [prepTimeRemaining, setPrepTimeRemaining] = useState(5); // 5s prep
    const [fightTimeRemaining, setFightTimeRemaining] = useState(120); // 120s fight
    const [gameStage, setGameStage] = useState<'ready' | 'fight' | 'gameover'>('ready');
    const [playerScore, setPlayerScore] = useState(0);
    const [playerAmmo, setPlayerAmmo] = useState(30);
    const [playerMaxAmmo] = useState(30);
    const [playerReloadProgress, setPlayerReloadProgress] = useState(0);
    const [playerDashEnergy, setPlayerDashEnergy] = useState(2.0);
    const [playerBombCount, setPlayerBombCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [outcome, setOutcome] = useState<'human' | 'zombie'>('human');
    const [coinsWon, setCoinsWon] = useState(0);

    const prepTimeRemainingRef = useRef(5);
    const fightTimeRemainingRef = useRef(120);

    useEffect(() => {
        prepTimeRemainingRef.current = prepTimeRemaining;
    }, [prepTimeRemaining]);

    useEffect(() => {
        fightTimeRemainingRef.current = fightTimeRemaining;
    }, [fightTimeRemaining]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const soundRef = useRef<ReturnType<typeof createMutationSoundEngine> | null>(null);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const thrownBombsRef = useRef<ThrownBomb[]>([]);
    
    // Map bounds
    const mapWidth = 1600;
    const mapHeight = 1600;

    // Define 13 Zone styled Crates & Platforms
    const wallsRef = useRef<Wall[]>([
        // Border Walls
        { x: 0, y: 0, w: mapWidth, h: 20 },
        { x: 0, y: 0, w: 20, h: mapHeight },
        { x: 0, y: mapHeight - 20, w: mapWidth, h: 20 },
        { x: mapWidth - 20, y: 0, w: 20, h: mapHeight },

        // Center Research Laboratory Block
        { x: 620, y: 620, w: 360, h: 360 },

        // Top-left Defensive Platform
        { x: 120, y: 180, w: 380, h: 80 },
        // Top-left platform ladders/boxes
        { x: 500, y: 190, w: 60, h: 60 },

        // Bottom-Right Corner L-Platform
        { x: 1100, y: 1100, w: 80, h: 380 },
        { x: 1180, y: 1380, w: 300, h: 100 },

        // Middle-Left obstacle containers
        { x: 200, y: 700, w: 120, h: 120 },
        { x: 240, y: 820, w: 80, h: 80 },

        // Middle-Right shelter
        { x: 1250, y: 350, w: 180, h: 120 },
        { x: 1250, y: 470, w: 60, h: 180 }
    ]);

    // Game Entities
    const charactersRef = useRef<Character[]>([]);
    const bulletsRef = useRef<Bullet[]>([]);
    const corpsesRef = useRef<ZombieCorpse[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const mousePosRef = useRef<{ x: number; y: number }>({ x: 400, y: 275 });
    
    // Keyboard inputs state
    const keysPressed = useRef<Record<string, boolean>>({});

    // Bullet wall hit test
    const isPointInWall = (x: number, y: number) => {
        return wallsRef.current.some(w => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h);
    };

    const spawnRandomPowerUp = (typeInput?: 'energy' | 'shield' | 'bomb') => {
        const type = typeInput || (Math.random() < 0.4 ? 'energy' : (Math.random() < 0.7 ? 'shield' : 'bomb'));
        let x = 0;
        let y = 0;
        let attempts = 0;
        while (attempts < 50) {
            x = Math.random() * (mapWidth - 100) + 50;
            y = Math.random() * (mapHeight - 100) + 50;
            if (!isPointInWall(x, y)) {
                break;
            }
            attempts++;
        }
        powerUpsRef.current.push({
            id: Math.random().toString(),
            x,
            y,
            type,
            radius: 12
        });
    };
    const isMutedRef = useRef(isMuted);

    // Preloaded image tags
    const [avatarImgs, setAvatarImgs] = useState<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        soundRef.current = createMutationSoundEngine();

        // Preload player avatar and AI avatars
        const imgs: Record<string, HTMLImageElement> = {};
        const playerImg = new Image();
        playerImg.src = userAvatar;
        playerImg.onload = () => {
            setAvatarImgs(prev => ({ ...prev, player: playerImg }));
        };

        contacts.forEach(contact => {
            if (contact.isAi && !contact.isGroup) {
                const img = new Image();
                img.src = contact.avatarUrl;
                img.onload = () => {
                    setAvatarImgs(prev => ({ ...prev, [contact.id]: img }));
                };
            }
        });

        // Initialize entities
        resetGame();

        // Keyboard listeners
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                triggerPlayerDash();
                return;
            }
            if (e.key) {
                keysPressed.current[e.key.toLowerCase()] = true;
            }
            
            // E Key: Throw bomb
            if (e.key && e.key.toLowerCase() === 'e') {
                triggerPlayerThrowBomb();
            }
            
            // G Key Zombie active skill
            if (e.key && e.key.toLowerCase() === 'g') {
                triggerZombieSkill('player');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current[e.key.toLowerCase()] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (soundRef.current?.ctx) {
                soundRef.current.ctx.close().catch(() => {});
            }
        };
    }, [userAvatar, contacts]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    const playSound = (name: 'shoot' | 'infect' | 'roar' | 'reload' | 'click' | 'alarm' | 'dash' | 'explosion') => {
        if (isMutedRef.current || !soundRef.current) return;
        if (soundRef.current.ctx.state === 'suspended') {
            soundRef.current.ctx.resume();
        }
        soundRef.current[name]();
    };

    // Spawns 8 characters (Player + 7 Bots)
    const resetGame = () => {
        setPrepTimeRemaining(5);
        setFightTimeRemaining(120);
        setGameStage('ready');
        setPlayerScore(0);
        setPlayerAmmo(30);
        setPlayerReloadProgress(0);
        setPlayerDashEnergy(2.0);
        setPlayerBombCount(0);

        bulletsRef.current = [];
        corpsesRef.current = [];
        particlesRef.current = [];
        powerUpsRef.current = [];
        thrownBombsRef.current = [];

        for (let i = 0; i < 4; i++) {
            spawnRandomPowerUp('energy');
            spawnRandomPowerUp('shield');
            spawnRandomPowerUp('bomb');
        }

        const list: Character[] = [];
        const botNames = contacts.filter(c => c.isAi && !c.isGroup);

        // Spawn locations
        const spawns = [
            { x: 300, y: 300 },
            { x: 300, y: 1300 },
            { x: 1300, y: 300 },
            { x: 1300, y: 1300 },
            { x: 800, y: 250 },
            { x: 800, y: 1350 },
            { x: 250, y: 800 },
            { x: 1350, y: 800 }
        ];

        // 1. Player (Human)
        list.push({
            id: 'player',
            name: 'YOU',
            avatarUrl: userAvatar,
            team: 'human',
            level: 1,
            hp: 1000,
            maxHp: 1000,
            x: spawns[0].x,
            y: spawns[0].y,
            angle: 0,
            speed: 4.4,
            score: 0,
            isAlive: true,
            respawnTimer: 0,
            ammo: 30,
            maxAmmo: 30,
            isReloading: false,
            reloadTimer: 0,
            skillCooldown: 0,
            skillDuration: 0,
            lastDamageTime: 0,
            color: '#00e5ff',
            dashEnergy: 2.0,
            dashActiveTimer: 0,
            dashDirectionX: 0,
            dashDirectionY: 0,
            speedBuffDuration: 0,
            hasShield: true,
            hitSlowdownTimer: 0,
            bombCount: 0
        });

        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800', '#795548'];

        // 2. 7 Bots
        for (let i = 1; i < 8; i++) {
            const botInfo = botNames[(i - 1) % botNames.length];
            const name = botInfo ? botInfo.name : `佣兵 Bot ${i}`;
            const avatarUrl = botInfo ? botInfo.avatarUrl : '';
            const botId = botInfo ? botInfo.id : `bot_${i}`;

            list.push({
                id: botId,
                name,
                avatarUrl,
                team: 'human',
                level: 1,
                hp: 1000,
                maxHp: 1000,
                x: spawns[i].x,
                y: spawns[i].y,
                angle: Math.random() * Math.PI * 2,
                speed: 4.1,
                score: 0,
                isAlive: true,
                respawnTimer: 0,
                ammo: 30,
                maxAmmo: 30,
                isReloading: false,
                reloadTimer: 0,
                skillCooldown: 0,
                skillDuration: 0,
                lastDamageTime: 0,
                color: colors[i % colors.length],
                dashEnergy: 2.0,
                dashActiveTimer: 0,
                dashDirectionX: 0,
                dashDirectionY: 0,
                speedBuffDuration: 0,
                hasShield: false,
                hitSlowdownTimer: 0,
                bombCount: 0
            });
        }

        charactersRef.current = list;
    };

    // Zombie skill logic (Press G)
    const triggerZombieSkill = (charId: string) => {
        const snakes = charactersRef.current;
        const char = snakes.find(c => c.id === charId);
        if (!char || !char.isAlive || char.team !== 'zombie' || char.skillCooldown > 0) return;

        // Ensure they have enough health (> 500)
        if (char.hp <= 500) {
            playSound('click');
            return;
        }

        char.hp -= 500;
        char.lastDamageTime = Date.now(); // reset health regen timer on self-harm

        if (char.level === 1) {
            // Speed Boost: Increase speed by 50% for 240 frames (~4s)
            char.skillDuration = 240;
            char.skillCooldown = 480; // 8s cooldown
        } else if (char.level === 2) {
            // Invisibility: Alpha low for 300 frames (~5s)
            char.skillDuration = 300;
            char.skillCooldown = 600; // 10s cooldown
        } else if (char.level === 3) {
            // Energy Shield: 85% reduced damage for 240 frames (~4s)
            char.skillDuration = 240;
            char.skillCooldown = 480; // 8s cooldown
        }

        if (charId === 'player') {
            playSound('roar');
        }
    };

    const triggerPlayerDash = () => {
        const chars = charactersRef.current;
        const player = chars.find(c => c.id === 'player');
        if (!player || !player.isAlive || player.team !== 'human' || player.dashActiveTimer > 0 || player.dashEnergy < 1.0) return;

        player.dashEnergy -= 1.0;

        let dx = 0;
        let dy = 0;
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

        const mag = Math.sqrt(dx*dx + dy*dy);
        if (mag > 0) {
            player.dashDirectionX = dx / mag;
            player.dashDirectionY = dy / mag;
        } else {
            player.dashDirectionX = Math.cos(player.angle);
            player.dashDirectionY = Math.sin(player.angle);
        }

        player.dashActiveTimer = 10; // Dash duration in frames
        
        playSound('dash');
        createExplosion(player.x, player.y, '#ffd600', 8, 'smoke');
    };

    const triggerInfection = (zombie: Character, human: Character) => {
        human.team = 'zombie';
        human.level = 1;
        human.hp = 1800;
        human.maxHp = 1800;
        human.speed = 4.0;
        human.speedBuffDuration = 0;
        human.hasShield = false;
        human.ammo = 0;
        human.isReloading = false;
        human.reloadTimer = 0;
        human.skillCooldown = 0;
        human.skillDuration = 0;
        human.hitSlowdownTimer = 0;
        human.bombCount = 0;

        // Grow attacker zombie score
        zombie.score += 200;

        playSound('infect');
        createExplosion(human.x, human.y, '#e53935', 15, 'blood');

        // Check if player is infected
        if (human.id === 'player') {
            setPlayerScore(0); // reset score representation
            setPlayerBombCount(0);
            playSound('roar');
        }
    };

    const createExplosion = (x: number, y: number, color: string, count = 8, type: 'spark' | 'smoke' | 'blood' = 'spark') => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - (type === 'smoke' ? 1.5 : 0),
                color,
                size: Math.random() * (type === 'smoke' ? 10 : 3) + 2,
                life: 1.0,
                type
            });
        }
    };

    // AABB rectangle wall circle collision solver
    const resolveWallCollisions = (char: { x: number; y: number }, radius: number) => {
        const walls = wallsRef.current;
        walls.forEach(wall => {
            const closestX = Math.max(wall.x, Math.min(char.x, wall.x + wall.w));
            const closestY = Math.max(wall.y, Math.min(char.y, wall.y + wall.h));

            const dx = char.x - closestX;
            const dy = char.y - closestY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                if (dist === 0) {
                    char.x -= radius;
                    return;
                }
                const overlap = radius - dist;
                char.x += (dx / dist) * overlap;
                char.y += (dy / dist) * overlap;
            }
        });
    };

    const triggerPlayerThrowBomb = () => {
        const chars = charactersRef.current;
        const player = chars.find(c => c.id === 'player');
        if (!player || !player.isAlive || player.team !== 'human') return;

        if (!player.bombCount || player.bombCount <= 0) return;

        player.bombCount -= 1;
        setPlayerBombCount(player.bombCount);

        const bombSpeed = 10.0;
        const vx = Math.cos(player.angle) * bombSpeed;
        const vy = Math.sin(player.angle) * bombSpeed;

        thrownBombsRef.current.push({
            id: Math.random().toString(),
            x: player.x + Math.cos(player.angle) * 20,
            y: player.y + Math.sin(player.angle) * 20,
            vx,
            vy,
            fuse: 60, // 1s at 60fps
            radius: 10
        });

        playSound('dash');
    };

    const detonateBomb = (x: number, y: number) => {
        playSound('explosion');

        createExplosion(x, y, '#ff9800', 25, 'spark');
        createExplosion(x, y, '#ff5722', 20, 'spark');
        createExplosion(x, y, '#333333', 15, 'smoke');

        const chars = charactersRef.current;
        const blastRadius = 150;
        const maxDamage = 1500;

        chars.forEach(char => {
            if (!char.isAlive || char.team !== 'zombie') return;

            const dx = char.x - x;
            const dy = char.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < blastRadius) {
                const falloff = 1 - (dist / blastRadius);
                const finalDamage = Math.floor(maxDamage * falloff);

                char.hp -= finalDamage;
                char.lastDamageTime = Date.now();
                char.hitSlowdownTimer = 40; // 40 frames heavy slowdown

                const knockbackForce = 18.0 * falloff;
                let pushAngle = Math.atan2(dy, dx);
                if (dist === 0) pushAngle = Math.random() * Math.PI * 2;

                char.x += Math.cos(pushAngle) * knockbackForce;
                char.y += Math.sin(pushAngle) * knockbackForce;

                // Resolve wall boundaries after knockback
                resolveWallCollisions(char, 16);

                createExplosion(char.x, char.y, '#e53935', 8, 'blood');

                // Award score to player
                const player = chars.find(c => c.id === 'player');
                if (player) {
                    player.score += Math.floor(finalDamage * 0.08);
                    setPlayerScore(player.score);
                }

                if (char.hp <= 0) {
                    char.isAlive = false;
                    char.respawnTimer = 240;
                    createExplosion(char.x, char.y, '#b71c1c', 20, 'blood');

                    corpsesRef.current.push({
                        id: Math.random().toString(),
                        x: char.x,
                        y: char.y,
                        color: char.color,
                        timeRemaining: 180
                    });
                }
            }
        });
    };

    // Timer Tick Loop
    useEffect(() => {
        if (gameStage === 'gameover') return;

        const timer = setInterval(() => {
            if (gameStage === 'ready') {
                setPrepTimeRemaining(prev => {
                    if (prev <= 1) {
                        // INFECTION START!
                        setGameStage('fight');
                        
                        // Select random mother zombie
                        const chars = charactersRef.current;
                        const randIdx = Math.floor(Math.random() * chars.length);
                        const mother = chars[randIdx];

                        mother.team = 'zombie';
                        mother.level = 3; // level 3 mother zombie
                        mother.hp = 5000;
                        mother.maxHp = 5000;
                        mother.speed = 4.6;
                        mother.ammo = 0;
                        mother.hitSlowdownTimer = 0;
                        mother.bombCount = 0;
                        if (mother.id === 'player') {
                            setPlayerBombCount(0);
                        }

                        playSound('roar');
                        createExplosion(mother.x, mother.y, '#43a047', 30, 'smoke');
                        return 0;
                    }
                    return prev - 1;
                });
            } else if (gameStage === 'fight') {
                setFightTimeRemaining(prev => {
                    if (prev <= 1) {
                        // Game Over: Humans survived!
                        clearInterval(timer);
                        endGame('human');
                        return 0;
                    }
                    
                    const nextVal = prev - 1;
                    if (nextVal <= 5) {
                        playSound('alarm'); // Alarm ticks every second for final 5s
                    } else if (nextVal <= 15 && nextVal % 2 === 0) {
                        playSound('alarm'); // Alarm ticks every 2s under 15s
                    } else if (nextVal <= 30 && nextVal % 3 === 0) {
                        playSound('alarm'); // Alarm ticks every 3s under 30s
                    } else if (nextVal <= 60 && nextVal % 6 === 0) {
                        playSound('alarm'); // Alarm ticks every 6s under 60s
                    } else if (nextVal % 12 === 0) {
                        playSound('alarm'); // Standard alarm ticks
                    }

                    return nextVal;
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStage]);

    const endGame = (winnerTeam: 'human' | 'zombie') => {
        setGameStage('gameover');
        setOutcome(winnerTeam);

        const player = charactersRef.current.find(c => c.id === 'player');
        if (player) {
            let winBonus = 0;
            if (winnerTeam === 'human' && player.team === 'human') winBonus = 50;
            if (winnerTeam === 'zombie' && player.team === 'zombie') winBonus = 50;
            
            const coins = Math.min(100, Math.floor(player.score / 15) + winBonus);
            setCoinsWon(coins);
            onRewardCoins(coins);
        }
    };

    // Main animation and physics loops
    useEffect(() => {
        if (gameStage === 'gameover') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const updatePhysics = () => {
            const chars = charactersRef.current;
            const bullets = bulletsRef.current;
            const corpses = corpsesRef.current;
            const particles = particlesRef.current;
            const player = chars.find(c => c.id === 'player')!;
            
            // Check win condition 1: All humans infected
            const aliveHumans = chars.filter(c => c.isAlive && c.team === 'human');
            if (gameStage === 'fight' && aliveHumans.length === 0) {
                endGame('zombie');
                return;
            }

            // Check win condition 2: All zombies dead simultaneously
            const aliveZombies = chars.filter(c => c.isAlive && c.team === 'zombie');
            if (gameStage === 'fight' && aliveZombies.length === 0) {
                endGame('human');
                return;
            }

            // 1. Process characters
            chars.forEach(char => {
                if (!char.isAlive) {
                    // Count down respawn
                    char.respawnTimer -= 1;
                    if (char.respawnTimer <= 0) {
                        // Respawn Zombie
                        char.isAlive = true;
                        char.team = 'zombie';
                        char.level = 1;
                        char.hp = 1800;
                        char.maxHp = 1800;
                        char.speed = 4.0;
                        char.hitSlowdownTimer = 0;
                        char.bombCount = 0;
                        if (char.id === 'player') {
                            setPlayerBombCount(0);
                        }
                        
                        // Spawn at random location
                        const positions = [
                            { x: 100, y: 100 },
                            { x: 100, y: 1500 },
                            { x: 1500, y: 100 },
                            { x: 1500, y: 1500 }
                        ];
                        const pick = positions[Math.floor(Math.random() * positions.length)];
                        char.x = pick.x;
                        char.y = pick.y;
                    }
                    return;
                }

                // --- Zombie HP Regeneration ---
                if (char.team === 'zombie' && Date.now() - char.lastDamageTime > 4000) {
                    if (char.hp < char.maxHp) {
                        char.hp = Math.min(char.maxHp, char.hp + 4); // heal +4 HP per tick (~240 HP/s)
                    }
                }

                // --- Skill durations & cooldowns ---
                if (char.skillDuration > 0) {
                    char.skillDuration -= 1;
                }
                if (char.skillCooldown > 0) {
                    char.skillCooldown -= 1;
                }

                // --- Handle reloading ---
                if (char.isReloading) {
                    char.reloadTimer -= 1;
                    if (char.id === 'player') {
                        setPlayerReloadProgress(Math.floor(((108 - char.reloadTimer) / 108) * 100));
                    }
                    if (char.reloadTimer <= 0) {
                        char.ammo = char.maxAmmo;
                        char.isReloading = false;
                        if (char.id === 'player') {
                            setPlayerAmmo(char.maxAmmo);
                            setPlayerReloadProgress(0);
                        }
                    }
                }

                // --- Speed determination ---
                let currentSpeed = char.speed;
                // Level 1 speed skill active
                if (char.team === 'zombie' && char.level === 1 && char.skillDuration > 0) {
                    currentSpeed *= 1.5;
                }
                // Speed buff from energy pack
                if (char.speedBuffDuration > 0) {
                    char.speedBuffDuration -= 1;
                    currentSpeed *= 1.35;
                }
                // Slow down when hit (decrease zombie speed by 50% for 20 frames)
                if (char.hitSlowdownTimer && char.hitSlowdownTimer > 0) {
                    char.hitSlowdownTimer -= 1;
                    if (char.team === 'zombie') {
                        currentSpeed *= 0.5;
                    }
                }

                // --- MOVEMENT LOGIC ---
                // Player Control
                if (char.id === 'player') {
                    if (char.dashActiveTimer > 0) {
                        char.dashActiveTimer -= 1;
                        char.x += char.dashDirectionX * 13.0;
                        char.y += char.dashDirectionY * 13.0;

                        if (char.dashActiveTimer % 2 === 0) {
                            createExplosion(char.x, char.y, 'rgba(255, 214, 0, 0.4)', 2, 'smoke');
                        }
                    } else {
                        let moveX = 0;
                        let moveY = 0;

                        if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY -= 1;
                        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY += 1;
                        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
                        if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

                        // Normalize
                        const mag = Math.sqrt(moveX*moveX + moveY*moveY);
                        if (mag > 0) {
                            char.x += (moveX / mag) * currentSpeed;
                            char.y += (moveY / mag) * currentSpeed;
                        }
                    }

                    // Dash recharge: 1 charge per 4.5 seconds (at 60fps = 270 frames) -> 1/270 per frame
                    if (char.dashEnergy < 2.0) {
                        char.dashEnergy = Math.min(2.0, char.dashEnergy + (1 / 270));
                    }
                    setPlayerDashEnergy(char.dashEnergy);
                    setPlayerBombCount(char.bombCount || 0);

                    // Rotate facing angle towards mouse cursor
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    
                    const screenMouseX = (mousePosRef.current.x - rect.left) * scaleX;
                    const screenMouseY = (mousePosRef.current.y - rect.top) * scaleY;

                    // Account for camera translation
                    const camX = Math.max(0, Math.min(mapWidth - canvas.width, player.x - canvas.width / 2));
                    const camY = Math.max(0, Math.min(mapHeight - canvas.height, player.y - canvas.height / 2));
                    const worldMouseX = screenMouseX + camX;
                    const worldMouseY = screenMouseY + camY;

                    char.angle = Math.atan2(worldMouseY - char.y, worldMouseX - char.x);

                    // Shoot bullets on mouse click (processed in canvas listener)
                } 
                // AI Bot Control
                else {
                    if (char.team === 'human') {
                        // 1. Human Bot: Steer away from closest zombie
                        let closestZombie = null;
                        let minDist = 300;
                        chars.forEach(other => {
                            if (other.isAlive && other.team === 'zombie') {
                                const dx = other.x - char.x;
                                const dy = other.y - char.y;
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                if (dist < minDist) {
                                    minDist = dist;
                                    closestZombie = other;
                                }
                            }
                        });

                        if (closestZombie) {
                            // Run in opposite direction
                            const runAngle = Math.atan2(char.y - closestZombie.y, char.x - closestZombie.x);
                            char.x += Math.cos(runAngle) * currentSpeed;
                            char.y += Math.sin(runAngle) * currentSpeed;
                            char.angle = runAngle;

                            // Shoot at the zombie!
                            if (char.ammo > 0 && !char.isReloading) {
                                // Random rate of fire
                                if (Math.random() < 0.15) {
                                    char.ammo -= 1;
                                    const spread = (Math.random() - 0.5) * 0.18;
                                    bullets.push({
                                        id: Math.random().toString(),
                                        x: char.x + Math.cos(char.angle) * 15,
                                        y: char.y + Math.sin(char.angle) * 15,
                                        vx: Math.cos(char.angle + spread) * 9,
                                        vy: Math.sin(char.angle + spread) * 9,
                                        damage: 180,
                                        ownerId: char.id
                                    });
                                    playSound('shoot');
                                    createExplosion(char.x + Math.cos(char.angle) * 16, char.y + Math.sin(char.angle) * 16, '#ffeb3b', 2, 'spark');
                                }
                            } else if (char.ammo <= 0 && !char.isReloading) {
                                char.isReloading = true;
                                char.reloadTimer = 108; // 1.8s
                            }
                        } else {
                            // Wander around / search for defense points
                            // Seek a safe wall corner
                            if (Math.random() < 0.01) {
                                char.angle = Math.random() * Math.PI * 2;
                            }
                            char.x += Math.cos(char.angle) * (currentSpeed * 0.4);
                            char.y += Math.sin(char.angle) * (currentSpeed * 0.4);
                        }
                    } else {
                        // 2. Zombie Bot: Chase closest human
                        let closestHuman = null;
                        let minDist = Infinity;
                        chars.forEach(other => {
                            if (other.isAlive && other.team === 'human') {
                                const dx = other.x - char.x;
                                const dy = other.y - char.y;
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                if (dist < minDist) {
                                    minDist = dist;
                                    closestHuman = other;
                                }
                            }
                        });

                        // Check for zombie corpses to absorb nearby
                        let closestCorpse = null;
                        let corpseMinDist = 200;
                        corpses.forEach(corpse => {
                            const dx = corpse.x - char.x;
                            const dy = corpse.y - char.y;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            if (dist < corpseMinDist) {
                                corpseMinDist = dist;
                                closestCorpse = corpse;
                            }
                        });

                        if (closestHuman) {
                            const chaseAngle = Math.atan2(closestHuman.y - char.y, closestHuman.x - char.x);
                            char.x += Math.cos(chaseAngle) * currentSpeed;
                            char.y += Math.sin(chaseAngle) * currentSpeed;
                            char.angle = chaseAngle;

                            // Active skill triggering logic
                            if (char.skillCooldown === 0 && char.hp > 1500) {
                                if (minDist < 250 && Math.random() < 0.05) {
                                    triggerZombieSkill(char.id);
                                }
                            }
                        } else if (closestCorpse) {
                            // Navigate to absorb corpse
                            const corpseAngle = Math.atan2(closestCorpse.y - char.y, closestCorpse.x - char.x);
                            char.x += Math.cos(corpseAngle) * currentSpeed;
                            char.y += Math.sin(corpseAngle) * currentSpeed;
                            char.angle = corpseAngle;

                            // Absorb check
                            if (corpseMinDist < 28) {
                                createExplosion(closestCorpse.x, closestCorpse.y, '#e53935', 5, 'blood');
                                char.hp = Math.min(char.maxHp, char.hp + 500);
                                // level up test
                                if (char.level < 3) {
                                    char.level += 1;
                                    char.maxHp = char.level === 2 ? 3000 : 5000;
                                    char.hp = Math.min(char.maxHp, char.hp + 1000);
                                    char.speed = char.level === 2 ? 4.3 : 4.6;
                                }
                                // remove corpse
                                const cIdx = corpses.indexOf(closestCorpse);
                                if (cIdx > -1) corpses.splice(cIdx, 1);
                            }
                        }
                    }
                }

                // Resolve wall boundaries
                resolveWallCollisions(char, 16);
            });

            // --- Update Thrown Bombs ---
            const thrownBombs = thrownBombsRef.current;
            for (let i = thrownBombs.length - 1; i >= 0; i--) {
                const bomb = thrownBombs[i];
                bomb.fuse -= 1;

                // Move bomb
                let nextX = bomb.x + bomb.vx;
                let nextY = bomb.y + bomb.vy;

                // Simple wall bouncing:
                let hitWallX = false;
                let hitWallY = false;

                // Check Map boundary collision
                if (nextX < 15 || nextX > mapWidth - 15) {
                    hitWallX = true;
                }
                if (nextY < 15 || nextY > mapHeight - 15) {
                    hitWallY = true;
                }

                // Check obstacle walls collision using check AABB bounds
                const walls = wallsRef.current;
                for (let wall of walls) {
                    const radius = bomb.radius;
                    const closestX = Math.max(wall.x, Math.min(nextX, wall.x + wall.w));
                    const closestY = Math.max(wall.y, Math.min(nextY, wall.y + wall.h));
                    const dx = nextX - closestX;
                    const dy = nextY - closestY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < radius) {
                        if (bomb.x < wall.x || bomb.x > wall.x + wall.w) {
                            hitWallX = true;
                        }
                        if (bomb.y < wall.y || bomb.y > wall.y + wall.h) {
                            hitWallY = true;
                        }
                    }
                }

                if (hitWallX) {
                    bomb.vx = -bomb.vx * 0.7;
                    nextX = bomb.x + bomb.vx;
                }
                if (hitWallY) {
                    bomb.vy = -bomb.vy * 0.7;
                    nextY = bomb.y + bomb.vy;
                }

                // Decelerate bomb (friction)
                bomb.vx *= 0.98;
                bomb.vy *= 0.98;

                bomb.x = nextX;
                bomb.y = nextY;

                // Detonate if fuse is finished
                if (bomb.fuse <= 0) {
                    thrownBombs.splice(i, 1);
                    detonateBomb(bomb.x, bomb.y);
                }
            }

            // 2. Process bullet movements & entity hits
            bullets.forEach((bullet, bIdx) => {
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;

                // Wall bounds check
                if (bullet.x < 15 || bullet.x > mapWidth - 15 || bullet.y < 15 || bullet.y > mapHeight - 15 || isPointInWall(bullet.x, bullet.y)) {
                    bullets.splice(bIdx, 1);
                    createExplosion(bullet.x, bullet.y, '#bdbdbd', 2, 'spark');
                    return;
                }

                // Character intersection check
                for (let other of chars) {
                    if (!other.isAlive || other.team === 'human' || other.id === bullet.ownerId) continue;

                    const dx = other.x - bullet.x;
                    const dy = other.y - bullet.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < 18) { // hitbox radius
                        bullets.splice(bIdx, 1);
                        createExplosion(bullet.x, bullet.y, '#d500f9', 2, 'spark');

                        // Evaluate zombie shield skill
                        let finalDamage = bullet.damage;
                        if (other.level === 3 && other.skillDuration > 0) {
                            finalDamage *= 0.15; // 85% reduced damage
                        }

                        other.hp -= finalDamage;
                        other.lastDamageTime = Date.now();
                        other.hitSlowdownTimer = 20; // 20 frames slowdown when hit
                        createExplosion(other.x, other.y, '#e53935', 4, 'blood');

                        // Score awarding
                        const owner = chars.find(c => c.id === bullet.ownerId);
                        if (owner) {
                            owner.score += Math.floor(finalDamage * 0.08); // shoot dmg points
                            if (owner.id === 'player') {
                                setPlayerScore(owner.score);
                            }
                        }

                        if (other.hp <= 0) {
                            other.isAlive = false;
                            other.respawnTimer = 240; // 4s respawn
                            createExplosion(other.x, other.y, '#b71c1c', 20, 'blood');
                            
                            // Spawn corpse
                            corpses.push({
                                id: Math.random().toString(),
                                x: other.x,
                                y: other.y,
                                color: other.color,
                                timeRemaining: 600 // lasts 10s
                            });

                            if (owner) {
                                owner.score += 800; // kill bonus
                                if (owner.id === 'player') {
                                    setPlayerScore(owner.score);
                                }
                            }
                        }
                        return;
                    }
                }
            });

            // 3. Melee Zombie infection touch check
            if (gameStage === 'fight') {
                const zombies = chars.filter(c => c.isAlive && c.team === 'zombie');
                const humans = chars.filter(c => c.isAlive && c.team === 'human');

                zombies.forEach(zombie => {
                    humans.forEach(human => {
                        const dx = human.x - zombie.x;
                        const dy = human.y - zombie.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);

                        // Melee touch bounds
                        if (dist < 26) {
                            if (human.hasShield) {
                                human.hasShield = false;
                                playSound('alarm');
                                createExplosion(human.x, human.y, '#00e5ff', 18, 'spark');
                                
                                const angle = Math.atan2(zombie.y - human.y, zombie.x - human.x);
                                zombie.x += Math.cos(angle) * 45;
                                zombie.y += Math.sin(angle) * 45;
                                resolveWallCollisions(zombie, 16);
                            } else {
                                triggerInfection(zombie, human);
                            }
                        }
                    });
                });
            }

            // --- Update Power-Ups Collisions ---
            const powerUps = powerUpsRef.current;
            chars.forEach(char => {
                if (!char.isAlive || char.team !== 'human') return;

                powerUps.forEach((powerUp, puIdx) => {
                    const dx = char.x - powerUp.x;
                    const dy = char.y - powerUp.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < 28) {
                        powerUps.splice(puIdx, 1);
                        playSound('click');

                        if (powerUp.type === 'energy') {
                            char.dashEnergy = Math.min(2.0, char.dashEnergy + 1.0);
                            char.speedBuffDuration = 180;
                            createExplosion(powerUp.x, powerUp.y, '#ffd600', 10, 'spark');
                        } else if (powerUp.type === 'shield') {
                            char.hasShield = true;
                            createExplosion(powerUp.x, powerUp.y, '#00e5ff', 10, 'spark');
                        } else if (powerUp.type === 'bomb') {
                            char.bombCount = Math.min(2, (char.bombCount || 0) + 1);
                            createExplosion(powerUp.x, powerUp.y, '#ff9800', 10, 'spark');
                        }
                    }
                });
            });

            // Maintain power-ups count
            if (powerUps.length < 8 && Math.random() < 0.005) {
                spawnRandomPowerUp();
            }

            // 4. Update corpses
            corpses.forEach((corpse, cIdx) => {
                corpse.timeRemaining -= 1;
                if (corpse.timeRemaining <= 0) {
                    corpses.splice(cIdx, 1);
                }
            });

            // 5. Update particles
            particles.forEach((p, pIdx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.035;
                if (p.life <= 0) {
                    particles.splice(pIdx, 1);
                }
            });
        };

        const drawStage = () => {
            const chars = charactersRef.current;
            const bullets = bulletsRef.current;
            const corpses = corpsesRef.current;
            const particles = particlesRef.current;
            const walls = wallsRef.current;
            const player = chars.find(c => c.id === 'player')!;

            // Camera bounds locking
            const camX = Math.max(0, Math.min(mapWidth - canvas.width, player.x - canvas.width / 2));
            const camY = Math.max(0, Math.min(mapHeight - canvas.height, player.y - canvas.height / 2));

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0d14'; // laboratory midnight background
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(-camX, -camY);

            // Grid Backdrop
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            const gridSpacing = 40;
            for (let x = 0; x <= mapWidth; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, mapHeight);
                ctx.stroke();
            }
            for (let y = 0; y <= mapHeight; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(mapWidth, y);
                ctx.stroke();
            }

            // Draw zombie corpses
            corpses.forEach(corpse => {
                ctx.save();
                ctx.fillStyle = 'rgba(229, 57, 53, 0.65)';
                ctx.beginPath();
                ctx.arc(corpse.x, corpse.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Draw power-ups
            powerUpsRef.current.forEach(p => {
                ctx.save();
                const glow = 5 + Math.sin(Date.now() / 120) * 3;
                ctx.shadowBlur = glow;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                if (p.type === 'energy') {
                    ctx.fillStyle = '#ffd600';
                    ctx.strokeStyle = '#ffffff';
                    ctx.shadowColor = '#ffd600';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText('⚡', p.x, p.y + 0.5);
                } else if (p.type === 'shield') {
                    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
                    ctx.strokeStyle = '#00e5ff';
                    ctx.shadowColor = '#00e5ff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px monospace';
                    ctx.fillText('🛡️', p.x, p.y);
                } else if (p.type === 'bomb') {
                    ctx.fillStyle = '#ff9800';
                    ctx.strokeStyle = '#ffffff';
                    ctx.shadowColor = '#ff9800';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText('💣', p.x, p.y + 0.5);
                }
                ctx.restore();
            });

            // Draw obstacle walls/crates
            ctx.fillStyle = '#1c2230'; // dark steel crate texture color
            ctx.strokeStyle = '#2c3547';
            ctx.lineWidth = 3;
            walls.forEach(w => {
                ctx.fillRect(w.x, w.y, w.w, w.h);
                ctx.strokeRect(w.x, w.y, w.w, w.h);

                // Hatch markings on crate blocks
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.beginPath();
                ctx.moveTo(w.x, w.y);
                ctx.lineTo(w.x + w.w, w.y + w.h);
                ctx.moveTo(w.x + w.w, w.y);
                ctx.lineTo(w.x, w.y + w.h);
                ctx.stroke();
            });

            // Draw bullets
            ctx.fillStyle = '#ffea00';
            bullets.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw thrown bombs
            thrownBombsRef.current.forEach(bomb => {
                ctx.save();
                
                // Bomb body
                ctx.fillStyle = '#ff3d00';
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = '#ff3d00';
                ctx.shadowBlur = 8 + Math.sin(Date.now() / 50) * 4;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Sparking fuse: draw a small line and yellow/red sparks
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(bomb.x, bomb.y - bomb.radius);
                ctx.quadraticCurveTo(bomb.x + 5, bomb.y - bomb.radius - 5, bomb.x + 8, bomb.y - bomb.radius - 3);
                ctx.stroke();

                // Spark point
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(bomb.x + 8, bomb.y - bomb.radius - 3, 2, 0, Math.PI * 2);
                ctx.fill();

                // Show bomb countdown visually (flashing color if low fuse)
                if (bomb.fuse < 20) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.arc(bomb.x, bomb.y, bomb.radius + 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            // Draw characters
            chars.forEach(char => {
                if (!char.isAlive) return;

                // Level 2 Skill active: Invisibility
                let opacity = 1.0;
                if (char.team === 'zombie' && char.level === 2 && char.skillDuration > 0) {
                    opacity = char.id === 'player' ? 0.4 : 0.15; // player sees self translucent, bots see almost fully invisible
                }

                ctx.save();
                ctx.globalAlpha = opacity;

                // Draw special skills glows
                if (char.team === 'zombie' && char.skillDuration > 0) {
                    if (char.level === 1) { // Speed boost trails
                        ctx.shadowColor = '#00e676';
                        ctx.shadowBlur = 15;
                    } else if (char.level === 3) { // Energy Shield red ring
                        ctx.strokeStyle = '#d500f9';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.arc(char.x, char.y, 22, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }

                // Outer circle container based on team
                ctx.strokeStyle = char.team === 'human' ? '#00b0ff' : '#d500f9'; // Blue: Human, Violet: Zombie
                if (char.team === 'zombie' && char.level === 3) {
                    ctx.strokeStyle = '#e53935'; // Mother Zombie Red Outline
                }
                ctx.lineWidth = 3.5;
                ctx.fillStyle = char.team === 'human' ? '#1c2438' : '#3c0042';
                ctx.beginPath();
                ctx.arc(char.x, char.y, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.shadowBlur = 0; // reset

                // Draw active protection shield ring
                if (char.hasShield) {
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 10 + Math.sin(Date.now() / 100) * 4;
                    ctx.beginPath();
                    ctx.arc(char.x, char.y, 21, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0; // reset
                }

                // Avatar clipping
                ctx.save();
                ctx.translate(char.x, char.y);
                ctx.rotate(char.angle + Math.PI / 2);

                const avatar = avatarImgs[char.id === 'player' ? 'player' : char.id];
                if (avatar) {
                    ctx.beginPath();
                    ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(avatar, -13.5, -13.5, 27, 27);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(char.name.substring(0, 2).toUpperCase(), 0, 0);
                }
                ctx.restore();

                // Draw health bar
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(char.x - 18, char.y - 28, 36, 4);
                ctx.fillStyle = char.team === 'human' ? '#00e5ff' : '#e53935';
                ctx.fillRect(char.x - 18, char.y - 28, 36 * (char.hp / char.maxHp), 4);

                // Draw dash energy bar for player (if human)
                if (char.id === 'player' && char.team === 'human') {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(char.x - 18, char.y - 34, 36, 3);
                    ctx.fillStyle = '#ffeb3b';
                    ctx.fillRect(char.x - 18, char.y - 34, 36 * (char.dashEnergy / 2.0), 3);

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(char.x - 1, char.y - 34, 2, 3);
                }

                // Name tag
                ctx.fillStyle = char.id === 'player' ? '#ffd600' : '#ffffff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(
                    char.team === 'zombie'
                        ? `Lvl.${char.level} ${char.name}`
                        : char.name,
                    char.x, char.y - 40
                );

                ctx.restore();
            });

            // Draw particles
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.restore(); // Restore world camera view translation

            // --- 5. RENDER FOG OF WAR (LIGHTING OVERLAY) ---
            ctx.save();
            if (player.team === 'zombie') {
                // Zombie night-vision: Green radioactive overlay
                ctx.fillStyle = 'rgba(76, 175, 80, 0.12)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                // Human dark shroud fog
                const canvasOverlay = document.createElement('canvas');
                canvasOverlay.width = canvas.width;
                canvasOverlay.height = canvas.height;
                const oCtx = canvasOverlay.getContext('2d')!;

                oCtx.fillStyle = 'rgba(0, 0, 0, 0.94)'; // deep dark shadow
                oCtx.fillRect(0, 0, canvas.width, canvas.height);

                // Cut out ambient player light & flashlight cone
                oCtx.globalCompositeOperation = 'destination-out';

                const pScreenX = player.x - camX;
                const pScreenY = player.y - camY;

                // Ambient halo grad
                const ambient = oCtx.createRadialGradient(pScreenX, pScreenY, 0, pScreenX, pScreenY, 110);
                ambient.addColorStop(0, 'rgba(0, 0, 0, 1)');
                ambient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                oCtx.fillStyle = ambient;
                oCtx.beginPath();
                oCtx.arc(pScreenX, pScreenY, 110, 0, Math.PI * 2);
                oCtx.fill();

                // Flashlight search cone
                const lookAngle = player.angle;
                oCtx.beginPath();
                oCtx.moveTo(pScreenX, pScreenY);
                oCtx.arc(pScreenX, pScreenY, 400, lookAngle - 0.52, lookAngle + 0.52); // ~60 degree arc
                oCtx.closePath();

                const flashGrad = oCtx.createRadialGradient(pScreenX, pScreenY, 30, pScreenX, pScreenY, 400);
                flashGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
                flashGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.45)');
                flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                oCtx.fillStyle = flashGrad;
                oCtx.fill();

                // Cut out teammate halos briefly
                chars.forEach(other => {
                    if (other.isAlive && other.team === 'human' && other.id !== 'player') {
                        const oScreenX = other.x - camX;
                        const oScreenY = other.y - camY;
                        const mateHalo = oCtx.createRadialGradient(oScreenX, oScreenY, 0, oScreenX, oScreenY, 70);
                        mateHalo.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
                        mateHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        oCtx.fillStyle = mateHalo;
                        oCtx.beginPath();
                        oCtx.arc(oScreenX, oScreenY, 70, 0, Math.PI * 2);
                        oCtx.fill();
                    }
                });

                ctx.drawImage(canvasOverlay, 0, 0);
            }
            ctx.restore();

            // --- 6. DRAW BIG CIRCULAR COUNTDOWN TIMER ON SCREEN ---
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const timeNow = Date.now();
            const pulse = 1.0 + Math.sin(timeNow / 150) * 0.06; // Heartbeat pulsing scale
            const alphaPulse = 0.5 + Math.sin(timeNow / 150) * 0.4; // Glowing alpha

            if (gameStage === 'ready') {
                // Center coordinate
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(pulse, pulse);

                // Draw background circle
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                ctx.beginPath();
                ctx.arc(0, 0, 65, 0, Math.PI * 2);
                ctx.fill();

                // Draw pulsing red shadow outer glow
                ctx.strokeStyle = `rgba(255, 23, 68, ${alphaPulse})`;
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ff1744';
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.arc(0, 0, 65, 0, Math.PI * 2);
                ctx.stroke();

                // Draw draining arc (clockwise from top)
                ctx.strokeStyle = '#ffd600'; // Golden progress indicator
                ctx.lineWidth = 5;
                ctx.shadowBlur = 0; // reset glow for progress
                ctx.beginPath();
                const progressAngle = (prepTimeRemainingRef.current / 5) * Math.PI * 2;
                ctx.arc(0, 0, 65, -Math.PI / 2, -Math.PI / 2 + progressAngle, false);
                ctx.stroke();

                // Biohazard symbol or warning text
                ctx.fillStyle = '#ff1744';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('⚠️ WARNING', 0, -22);

                // Huge blinking warning digits
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 38px monospace';
                ctx.fillText(`${prepTimeRemainingRef.current}`, 0, 8);

                ctx.fillStyle = '#ffd600';
                ctx.font = '9px monospace';
                ctx.fillText('MUTATION INCOMING', 0, 32);

                ctx.restore();
            } else if (gameStage === 'fight') {
                // Top center coordinate
                const cx = canvas.width / 2;
                const cy = 45;

                ctx.save();
                ctx.translate(cx, cy);
                
                // If final 5s, pulse aggressively
                const isFinalSeconds = fightTimeRemainingRef.current <= 5;
                const scaleVal = isFinalSeconds ? pulse * 1.15 : 1.0;
                ctx.scale(scaleVal, scaleVal);

                // Draw circular background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.beginPath();
                ctx.arc(0, 0, 28, 0, Math.PI * 2);
                ctx.fill();

                // Pulse color determination (yellow for standard, red for warning)
                const baseColor = isFinalSeconds ? '#ff1744' : '#e53935';
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = 3;
                
                if (isFinalSeconds) {
                    ctx.shadowColor = '#ff1744';
                    ctx.shadowBlur = 15;
                }
                ctx.beginPath();
                ctx.arc(0, 0, 28, 0, Math.PI * 2);
                ctx.stroke();

                // Draining progress arc
                ctx.strokeStyle = isFinalSeconds ? '#ff1744' : '#00e5ff'; // Cyan for humans, red for final panic
                ctx.lineWidth = 3.5;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                const fightProgress = (fightTimeRemainingRef.current / 120) * Math.PI * 2;
                ctx.arc(0, 0, 28, -Math.PI / 2, -Math.PI / 2 + fightProgress, false);
                ctx.stroke();

                // Render digits
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px monospace';
                ctx.fillText(`${fightTimeRemainingRef.current}`, 0, 0);

                ctx.restore();

                // If final 10s, draw huge blinking countdown in absolute center of screen
                if (isFinalSeconds && Math.floor(timeNow / 250) % 2 === 0) {
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(pulse, pulse);
                    ctx.font = 'bold 110px monospace';
                    ctx.fillStyle = 'rgba(255, 23, 68, 0.9)';
                    
                    // Add text shadow for heavy impact
                    ctx.shadowColor = '#ff1744';
                    ctx.shadowBlur = 30;
                    
                    ctx.fillText(`${fightTimeRemainingRef.current}`, 0, 0);
                    ctx.restore();
                }
            }

            // --- 7. DRAW MINI-MAP ---
            const mapSize = 120;
            const margin = 20;
            const mx = canvas.width - mapSize - margin;
            const my = margin;

            ctx.save();
            // Draw mini-map container background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(mx, my, mapSize, mapSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.strokeRect(mx, my, mapSize, mapSize);

            // Draw obstacles/walls on the mini-map
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            walls.forEach(w => {
                const wx = mx + (w.x / mapWidth) * mapSize;
                const wy = my + (w.y / mapHeight) * mapSize;
                const ww = (w.w / mapWidth) * mapSize;
                const wh = (w.h / mapHeight) * mapSize;
                ctx.fillRect(wx, wy, ww, wh);
            });

            // Draw power-ups on the mini-map
            powerUpsRef.current.forEach(p => {
                const px = mx + (p.x / mapWidth) * mapSize;
                const py = my + (p.y / mapHeight) * mapSize;
                ctx.fillStyle = p.type === 'energy' ? '#ffd600' : (p.type === 'shield' ? '#00e5ff' : '#ff9800');
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw characters on the mini-map
            chars.forEach(char => {
                if (!char.isAlive) return;

                const cx = mx + (char.x / mapWidth) * mapSize;
                const cy = my + (char.y / mapHeight) * mapSize;

                if (char.id === 'player') {
                    ctx.fillStyle = '#00e5ff';
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = char.team === 'human' ? 'rgba(0, 176, 255, 0.7)' : 'rgba(213, 0, 249, 0.7)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.restore();

            ctx.restore();
        };

        const renderLoop = () => {
            updatePhysics();
            drawStage();
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        // Resize handler
        const handleResize = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.parentElement?.getBoundingClientRect();
                if (rect) {
                    canvasRef.current.width = rect.width;
                    canvasRef.current.height = rect.height;
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // trigger initial layout sizes

        renderLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [gameStage, avatarImgs]);

    // Handle aiming shooting on mouse clicks
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (gameStage !== 'fight') return;
        
        const chars = charactersRef.current;
        const player = chars.find(c => c.id === 'player')!;
        if (!player.isAlive || player.team !== 'human') return; // zombies use melee collision touch

        if (player.ammo > 0 && !player.isReloading) {
            player.ammo -= 1;
            setPlayerAmmo(player.ammo);

            const spread = (Math.random() - 0.5) * 0.12;
            bulletsRef.current.push({
                id: Math.random().toString(),
                x: player.x + Math.cos(player.angle) * 15,
                y: player.y + Math.sin(player.angle) * 15,
                vx: Math.cos(player.angle + spread) * 9.5,
                vy: Math.sin(player.angle + spread) * 9.5,
                damage: 220,
                ownerId: 'player'
            });

            playSound('shoot');
            createExplosion(player.x + Math.cos(player.angle) * 16, player.y + Math.sin(player.angle) * 16, '#ffd600', 2, 'spark');
        } else if (player.ammo <= 0 && !player.isReloading) {
            triggerReload();
        }
    };

    const triggerReload = () => {
        const chars = charactersRef.current;
        const player = chars.find(c => c.id === 'player')!;
        if (!player.isAlive || player.team !== 'human' || player.isReloading) return;

        player.isReloading = true;
        player.reloadTimer = 108; // 1.8s
        playSound('reload');
    };

    // Tracks screen mouse positions for aiming direction
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    // Count statistics
    const list = charactersRef.current;
    const humanCount = list.filter(c => c.isAlive && c.team === 'human').length;
    const zombieCount = list.filter(c => c.isAlive && c.team === 'zombie').length;

    return (
        <div className="flex flex-col h-full bg-[#0a0d14] relative overflow-hidden select-none text-white font-mono">
            {/* Header HUD info */}
            <div className="bg-black/95 backdrop-blur-md p-4 flex justify-between items-center z-20 border-b-4 border-black shadow-xl text-xs md:text-sm">
                <button onClick={onBack} className="font-black text-gray-400 hover:text-white transition-colors">EXIT</button>
                
                <div className="flex gap-4 md:gap-8 items-center">
                    {gameStage === 'ready' ? (
                        <span className="text-yellow-400 font-bold tracking-wider animate-pulse">
                            ⏳ {t.prepTime}: {prepTimeRemaining}s
                        </span>
                    ) : (
                        <span className="text-red-500 font-bold tracking-wider">
                            ⏰ {t.timeRemaining}: {fightTimeRemaining}s
                        </span>
                    )}

                    <div className="flex gap-3 border-l border-white/20 pl-4 font-black">
                        <span className="text-cyan-400">💂 {t.humans}: {humanCount}</span>
                        <span className="text-purple-400">🧟 {t.zombies}: {zombieCount}</span>
                    </div>
                </div>

                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="font-bold text-gray-400 hover:text-white w-8 text-center text-sm"
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>
            </div>

            {/* Sub-HUD instruction bar */}
            <div className="bg-red-500/10 border-b border-red-500/20 py-1.5 px-4 text-center z-10 text-[9px] md:text-xs font-semibold tracking-wider text-red-400 uppercase">
                🛡️ {t.instruction}
            </div>

            {/* Active stage canvas */}
            <div className="flex-1 flex relative w-full h-full bg-[#0a0d14]">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    className="w-full h-full cursor-crosshair object-cover"
                />

                {/* Scoreboard and Ammo overlay */}
                <div className="absolute bottom-4 left-4 z-10 bg-black/85 border-2 border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-2 min-w-[140px] text-xs">
                    <div className="font-black text-yellow-400 tracking-wider uppercase border-b border-white/10 pb-1.5 mb-1 text-center">🎯 STATUS</div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">SCORE:</span>
                        <span className="font-bold">{playerScore}</span>
                    </div>

                    {/* Weapon controls if human */}
                    {list.find(c => c.id === 'player')?.team === 'human' ? (
                        <div className="flex flex-col gap-1.5 mt-1 border-t border-white/10 pt-2">
                            <div className="flex justify-between items-center font-black">
                                <span className="text-gray-400">AMMO:</span>
                                <span className={playerAmmo < 10 ? 'text-red-500 animate-pulse' : 'text-white'}>
                                    {playerAmmo}/{playerMaxAmmo}
                                </span>
                            </div>
                            
                            <button
                                onClick={triggerReload}
                                disabled={playerReloadProgress > 0}
                                className="w-full py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-cyan-500/15 border border-cyan-400/35 hover:bg-cyan-500/25 transition-all"
                            >
                                {playerReloadProgress > 0 ? `RELOADING ${playerReloadProgress}%` : 'RELOAD (R)'}
                            </button>

                            {/* Bombs if human */}
                            <div className="flex flex-col gap-1 mt-1 border-t border-white/10 pt-2 text-[10px] font-black">
                                <div className="flex justify-between items-center text-orange-400 uppercase">
                                    <span>BOMBS (E):</span>
                                    <span>{playerBombCount} / 2</span>
                                </div>
                                <div className="flex gap-1.5 mt-0.5">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs ${
                                                i < playerBombCount
                                                    ? 'bg-orange-500/20 border-orange-400/50 text-white shadow-[0_0_8px_rgba(239,108,0,0.4)]'
                                                    : 'bg-gray-800/40 border-gray-700/30 text-gray-600'
                                            }`}
                                        >
                                            💣
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Zombie skill CD
                        <div className="flex flex-col gap-1.5 mt-1 border-t border-white/10 pt-2 text-[10px] font-black">
                            <span className="text-purple-400 uppercase">ZOMBIE ACTIVE:</span>
                            <div className="text-gray-300">HP: {list.find(c => c.id === 'player')?.hp}</div>
                            <div className="text-gray-400 mt-1">Press G: SPEED BOOST (costs 500 HP)</div>
                        </div>
                    )}

                    {/* Dash Energy Bar */}
                    <div className="flex flex-col gap-1 mt-1 border-t border-white/10 pt-2 text-[10px] font-black">
                        <div className="flex justify-between items-center text-yellow-400 uppercase">
                            <span>DASH (SPACE):</span>
                            <span>{Math.floor(playerDashEnergy)} / 2</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden border border-black/35 relative">
                            <div
                                className="bg-yellow-400 h-full transition-all duration-75"
                                style={{ width: `${(playerDashEnergy / 2) * 100}%` }}
                            />
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/40" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Over Modal Screen */}
            {gameStage === 'gameover' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fadeIn">
                    <div className="bg-white border-4 border-black text-black rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                        <span className="text-5xl mb-4">{outcome === 'human' ? '🏆' : '💀'}</span>
                        <h2 className="font-black text-2xl text-rose-600 tracking-wider mb-2 uppercase">{t.gameOver}</h2>
                        
                        <p className="font-bold text-gray-800 text-sm my-2 max-w-xs leading-relaxed">
                            {outcome === 'human' ? t.humanWin : t.zombieWin}
                        </p>

                        <div className="flex flex-col gap-1.5 my-4 font-mono text-sm text-gray-700 w-full border-t border-b border-black/10 py-3">
                            <div className="flex justify-between px-4">
                                <span>Score points:</span>
                                <span className="font-bold text-black">{playerScore}</span>
                            </div>
                            <div className="flex justify-between px-4 mt-2">
                                <span className="font-sans font-bold bg-yellow-400 text-black px-3 py-1 rounded-full text-xs flex items-center gap-1">
                                    🪙 {t.coinsRewarded}:
                                </span>
                                <span className="font-bold text-black text-base">{coinsWon} Coins</span>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full mt-2">
                            <Button
                                onClick={resetGame}
                                className="flex-1 py-3.5 text-xs font-black"
                            >
                                {t.btnPlayAgain}
                            </Button>
                            <Button
                                onClick={onBack}
                                variant="secondary"
                                className="flex-1 py-3.5 text-xs font-black"
                            >
                                {t.btnBack}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
