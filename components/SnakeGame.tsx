import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Contact } from '../types';
import { useLanguage } from '../lib/language-context';

interface SnakeGameProps {
    onBack: () => void;
    userAvatar: string;
    contacts: Contact[];
    onRewardCoins: (amount: number) => void;
}

interface SnakeSegment {
    x: number;
    y: number;
}

interface Snake {
    id: string; // 'player' or AI contact ID
    name: string;
    avatarUrl: string;
    color: string;
    segments: SnakeSegment[];
    angle: number;
    targetAngle: number;
    score: number;
    isAlive: boolean;
    respawnTimer: number; // in frames
    spawnX?: number; // target spawn X coordinate
    spawnY?: number; // target spawn Y coordinate
}

interface Food {
    id: string;
    x: number;
    y: number;
    size: number;
    color: string;
    value: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
}

const LOCAL_TRANS = {
    English: {
        title: 'Multiplayer Snake',
        score: 'Score',
        length: 'Length',
        leaderboard: 'Leaderboard',
        gameOver: 'GAME OVER',
        coinsRewarded: 'TT Coins Rewarded',
        btnPlayAgain: 'PLAY AGAIN',
        btnBack: 'BACK TO LOBBY',
        instruction: 'Move mouse cursor to steer. Eat food to grow. Avoid other snakes\' bodies!',
        rank: 'Rank',
    },
    '简体中文': {
        title: '多人大乱斗贪吃蛇',
        score: '积分',
        length: '长度',
        leaderboard: '排行榜',
        gameOver: '游戏结束',
        coinsRewarded: '奖励 TT 币',
        btnPlayAgain: '再玩一次',
        btnBack: '返回大厅',
        instruction: '移动鼠标指针控制蛇头转向，吃掉球变长，不能碰到别人的身体哦！',
        rank: '排名',
    }
};

// Web Audio sound synthesizer for Snake Game
const createSnakeSoundEngine = () => {
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

    // Low crash noise on death
    const playCrash = (duration = 0.5) => {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    };

    return {
        eat: () => {
            // High-pitched cute blip
            playTone(880, 'sine', 0.08, 0.08);
            setTimeout(() => playTone(1320, 'sine', 0.08, 0.05), 40);
        },
        die: () => {
            playCrash(0.6);
        },
        respawn: () => {
            playTone(330, 'triangle', 0.15, 0.08);
            setTimeout(() => playTone(660, 'triangle', 0.15, 0.08), 100);
        },
        ctx
    };
};

export const SnakeGame: React.FC<SnakeGameProps> = ({ onBack, userAvatar, contacts, onRewardCoins }) => {
    const { language } = useLanguage();
    const t = LOCAL_TRANS[language as keyof typeof LOCAL_TRANS] || LOCAL_TRANS.English;

    const [score, setScore] = useState(0);
    const [length, setLength] = useState(5);
    const [isMuted, setIsMuted] = useState(false);
    const [phase, setPhase] = useState<'playing' | 'gameover'>('playing');
    const [rewardCoins, setRewardCoins] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const soundRef = useRef<ReturnType<typeof createSnakeSoundEngine> | null>(null);
    
    // Map dimensions
    const mapWidth = 2200;
    const mapHeight = 2200;

    // Viewport sizes
    const [viewportSize, setViewportSize] = useState({ width: 800, height: 550 });

    // Entities refs to avoid React state lag in animation loop
    const snakesRef = useRef<Snake[]>([]);
    const foodsRef = useRef<Food[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const mousePosRef = useRef<{ x: number; y: number }>({ x: 400, y: 275 }); // client relative to canvas
    const isMutedRef = useRef(isMuted);

    // Preloaded image tags
    const [avatarImgs, setAvatarImgs] = useState<Record<string, HTMLImageElement>>({});

    // Color choices for bodies
    const colors = [
        '#00e676', // green
        '#00b0ff', // blue
        '#d500f9', // purple
        '#ff9100', // orange
        '#ff1744', // red
        '#f50057', // pink
        '#1de9b6', // teal
        '#ffea00', // yellow
    ];

    // Load avatars
    useEffect(() => {
        soundRef.current = createSnakeSoundEngine();
        
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

        return () => {
            if (soundRef.current?.ctx) {
                soundRef.current.ctx.close().catch(() => {});
            }
        };
    }, [userAvatar, contacts]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    const playSound = (name: 'eat' | 'die' | 'respawn') => {
        if (isMutedRef.current || !soundRef.current) return;
        if (soundRef.current.ctx.state === 'suspended') {
            soundRef.current.ctx.resume();
        }
        soundRef.current[name]();
    };

    // Creates a random position far from map borders
    const getRandomPos = () => ({
        x: Math.floor(Math.random() * (mapWidth - 200)) + 100,
        y: Math.floor(Math.random() * (mapHeight - 200)) + 100
    });

    const createRandomFood = (): Food => {
        const pos = getRandomPos();
        const rand = Math.random();
        let size = 4;
        let value = 1;
        let color = colors[Math.floor(Math.random() * colors.length)];

        if (rand < 0.12) {
            size = 9; // Big glowing food
            value = 4;
        } else if (rand < 0.35) {
            size = 6; // Medium food
            value = 2;
        }

        return {
            id: Math.random().toString(),
            x: pos.x,
            y: pos.y,
            size,
            color,
            value
        };
    };

    const spawnSnakes = () => {
        const list: Snake[] = [];
        const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

        // 1. Player snake
        const playerPos = { x: mapWidth / 2, y: mapHeight / 2 };
        const playerSegments: SnakeSegment[] = [];
        for (let i = 0; i < 5; i++) {
            playerSegments.push({ x: playerPos.x, y: playerPos.y + i * 11 });
        }
        list.push({
            id: 'player',
            name: 'YOU',
            avatarUrl: userAvatar,
            color: '#00e5ff', // bright cyan
            segments: playerSegments,
            angle: -Math.PI / 2,
            targetAngle: -Math.PI / 2,
            score: 0,
            isAlive: true,
            respawnTimer: 0
        });

        // 2. AI Snakes representing contacts
        const aiContacts = contacts.filter(c => c.isAi && !c.isGroup);
        // Fill up to at least 7 bots for map density
        const botCount = Math.max(7, aiContacts.length);

        for (let i = 0; i < botCount; i++) {
            const contact = aiContacts[i % aiContacts.length];
            const name = contact ? contact.name : `Bot ${i + 1}`;
            const avatarUrl = contact ? contact.avatarUrl : '';
            const contactId = contact ? contact.id : `bot_${i}`;
            const color = colors[i % colors.length];

            const pos = getRandomPos();
            const angle = directions[i % directions.length];
            const segments: SnakeSegment[] = [];
            
            for (let s = 0; s < 5; s++) {
                segments.push({
                    x: pos.x - Math.cos(angle) * s * 11,
                    y: pos.y - Math.sin(angle) * s * 11
                });
            }

            list.push({
                id: contactId,
                name,
                avatarUrl,
                color,
                segments,
                angle,
                targetAngle: angle,
                score: 0,
                isAlive: true,
                respawnTimer: 0
            });
        }

        snakesRef.current = list;
    };

    const resetGame = () => {
        setScore(0);
        setLength(5);
        setPhase('playing');
        
        // Spawn foods
        const foodList: Food[] = [];
        for (let i = 0; i < 75; i++) {
            foodList.push(createRandomFood());
        }
        foodsRef.current = foodList;
        particlesRef.current = [];
        
        // Spawn snakes
        spawnSnakes();
        playSound('respawn');
    };

    const createExplosion = (x: number, y: number, color: string, count = 10) => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color,
                size: Math.random() * 3 + 2,
                life: 1.0
            });
        }
    };

    const handleSnakeDeath = (snake: Snake) => {
        snake.isAlive = false;
        createExplosion(snake.segments[0].x, snake.segments[0].y, snake.color, 25);

        // Turn dead segments into food!
        snake.segments.forEach((seg, sIdx) => {
            if (sIdx % 2 === 0) {
                foodsRef.current.push({
                    id: Math.random().toString(),
                    x: seg.x + (Math.random() - 0.5) * 12,
                    y: seg.y + (Math.random() - 0.5) * 12,
                    size: 6,
                    color: snake.color,
                    value: 2
                });
            }
        });

        if (snake.id === 'player') {
            playSound('die');
            const coins = Math.min(100, Math.floor(snake.score / 3));
            setRewardCoins(coins);
            onRewardCoins(coins);
            setPhase('gameover');
        } else {
            // bot dies, schedule respawn in 150 frames (approx 2.5 seconds)
            snake.respawnTimer = 150;
            const pos = getRandomPos();
            snake.spawnX = pos.x;
            snake.spawnY = pos.y;
        }
    };

    // Main game logic and render loops
    useEffect(() => {
        if (phase !== 'playing') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const updateGame = () => {
            const snakes = snakesRef.current;
            const foods = foodsRef.current;
            const particles = particlesRef.current;
            const speed = 3.6; // constant movement speed
            const turnSpeed = 0.09;
            const segmentSpacing = 11;
            const headRadius = 14;

            // 1. Process active snakes
            snakes.forEach(snake => {
                if (!snake.isAlive) {
                    if (snake.id !== 'player') {
                        // Count down respawn
                        snake.respawnTimer -= 1;
                        if (snake.respawnTimer <= 0) {
                            // Respawn Bot at the pre-calculated position
                            const spawnX = snake.spawnX || mapWidth / 2;
                            const spawnY = snake.spawnY || mapHeight / 2;
                            const angle = Math.random() * Math.PI * 2;
                            
                            snake.segments = [];
                            for (let s = 0; s < 5; s++) {
                                snake.segments.push({
                                    x: spawnX - Math.cos(angle) * s * segmentSpacing,
                                    y: spawnY - Math.sin(angle) * s * segmentSpacing
                                });
                            }
                            snake.angle = angle;
                            snake.targetAngle = angle;
                            snake.score = 0;
                            snake.isAlive = true;
                        }
                    }
                    return;
                }

                const head = snake.segments[0];

                // --- AI Behavior ---
                if (snake.id !== 'player') {
                    // Check local proximity for obstacle avoidance (other snakes' bodies)
                    let obstacleFound = false;
                    let avoidanceAngle = 0;

                    for (let other of snakes) {
                        if (!other.isAlive) continue;
                        
                        // Bot can slide through its own body
                        if (other.id === snake.id) continue;

                        const otherScale = 1 + Math.min(1.5, Math.sqrt(other.score) * 0.08);
                        const dangerDist = 85 + 11 * otherScale;

                        for (let j = 0; j < other.segments.length; j++) {
                            const seg = other.segments[j];
                            const dx = seg.x - head.x;
                            const dy = seg.y - head.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < dangerDist) {
                                const angleToObstacle = Math.atan2(dy, dx);
                                let angleDiff = angleToObstacle - snake.angle;
                                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                                if (Math.abs(angleDiff) < 1.1) { // in front of head (~60 degrees)
                                    obstacleFound = true;
                                    // Steer away!
                                    avoidanceAngle += (angleDiff > 0 ? -0.85 : 0.85);
                                }
                            }
                        }
                    }

                    if (obstacleFound) {
                        snake.targetAngle = snake.angle + avoidanceAngle;
                    } else {
                        // Hunt for closest food
                        let closestFood = null;
                        let minDist = 350; // detection radius
                        
                        foods.forEach(food => {
                            const dx = food.x - head.x;
                            const dy = food.y - head.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < minDist) {
                                minDist = dist;
                                closestFood = food;
                            }
                        });

                        if (closestFood) {
                            snake.targetAngle = Math.atan2(closestFood.y - head.y, closestFood.x - head.x);
                        }
                    }

                    // Border avoidance
                    const borderBuffer = 120;
                    if (head.x < borderBuffer) snake.targetAngle = 0;
                    if (head.x > mapWidth - borderBuffer) snake.targetAngle = Math.PI;
                    if (head.y < borderBuffer) snake.targetAngle = Math.PI / 2;
                    if (head.y > mapHeight - borderBuffer) snake.targetAngle = -Math.PI / 2;

                    // Smooth turn
                    let diff = snake.targetAngle - snake.angle;
                    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                    snake.angle += Math.max(-turnSpeed, Math.min(turnSpeed, diff));
                } 
                // --- Player steering ---
                else {
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    
                    // Convert screen cursor coordinate to world map coordinate
                    // Since camera translates by: viewport / 2 - playerHead
                    const screenCursorX = (mousePosRef.current.x - rect.left) * scaleX;
                    const screenCursorY = (mousePosRef.current.y - rect.top) * scaleY;

                    const worldCursorX = screenCursorX - canvas.width / 2 + head.x;
                    const worldCursorY = screenCursorY - canvas.height / 2 + head.y;

                    snake.targetAngle = Math.atan2(worldCursorY - head.y, worldCursorX - head.x);
                    
                    // Smooth turn for player snake
                    let diff = snake.targetAngle - snake.angle;
                    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                    snake.angle += Math.max(-0.11, Math.min(0.11, diff));
                }

                // Move head position
                head.x += Math.cos(snake.angle) * speed;
                head.y += Math.sin(snake.angle) * speed;

                // Trail body segments smoothly behind with dynamic spacing scaling
                const snakeScale = 1 + Math.min(9.0, Math.sqrt(snake.score) * 0.08);
                const currentSpacing = segmentSpacing * snakeScale;

                for (let i = snake.segments.length - 1; i > 0; i--) {
                    const seg = snake.segments[i];
                    const prevSeg = snake.segments[i - 1];
                    const dx = prevSeg.x - seg.x;
                    const dy = prevSeg.y - seg.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > currentSpacing) {
                        const ratio = currentSpacing / dist;
                        seg.x = prevSeg.x - dx * ratio;
                        seg.y = prevSeg.y - dy * ratio;
                    }
                }
            });

            // 2. Map boundary check & collisions
            snakes.forEach(snake => {
                if (!snake.isAlive) return;
                const head = snake.segments[0];
                const snakeScale = 1 + Math.min(9.0, Math.sqrt(snake.score) * 0.08);
                const currentHeadRadius = headRadius * snakeScale;

                // Hitting border edge
                if (head.x < 12 * snakeScale || head.x > mapWidth - 12 * snakeScale || head.y < 12 * snakeScale || head.y > mapHeight - 12 * snakeScale) {
                    handleSnakeDeath(snake);
                    return;
                }

                // Head hitting other snake segments
                for (let other of snakes) {
                    if (!other.isAlive || other.id === snake.id) continue;

                    const otherScale = 1 + Math.min(9.0, Math.sqrt(other.score) * 0.08);
                    const currentOtherBodyRadius = 11 * otherScale;

                    for (let sIdx = 0; sIdx < other.segments.length; sIdx++) {
                        const segment = other.segments[sIdx];
                        const dx = segment.x - head.x;
                        const dy = segment.y - head.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < currentHeadRadius + currentOtherBodyRadius * 0.75) {
                            handleSnakeDeath(snake);
                            return;
                        }
                    }
                }
            });

            // 3. Eating food & scoring
            snakes.forEach(snake => {
                if (!snake.isAlive) return;
                const head = snake.segments[0];
                const snakeScale = 1 + Math.min(9.0, Math.sqrt(snake.score) * 0.08);
                const currentHeadRadius = headRadius * snakeScale;

                foods.forEach((food, fIdx) => {
                    if (food.size < 0) return;
                    const dx = food.x - head.x;
                    const dy = food.y - head.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < currentHeadRadius + food.size) {
                        // Growth!
                        snake.score += food.value;
                        const tail = snake.segments[snake.segments.length - 1];
                        
                        // Grow body based on food size value
                        for (let k = 0; k < Math.floor(food.value); k++) {
                            snake.segments.push({ x: tail.x, y: tail.y });
                        }

                        // Play sound & particles
                        if (snake.id === 'player') {
                            playSound('eat');
                            setScore(snake.score);
                            setLength(snake.segments.length);
                        }

                        // Spawn sparkle particles
                        for (let p = 0; p < 4; p++) {
                            particles.push({
                                x: food.x,
                                y: food.y,
                                vx: (Math.random() - 0.5) * 2,
                                vy: (Math.random() - 0.5) * 2,
                                color: food.color,
                                size: Math.random() * 2 + 1,
                                life: 0.8
                            });
                        }

                        // Respawn new food coordinate or delete if too many foods on map
                        if (foods.length > 75) {
                            food.size = -1; // mark for deletion
                        } else {
                            foods[fIdx] = createRandomFood();
                        }
                    }
                });
            });

            // Filter out eaten foods that should not respawn
            foodsRef.current = foods.filter(f => f.size >= 0);

            // 4. Update particles
            particles.forEach((p, pIdx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.035;
                if (p.life <= 0) {
                    particles.splice(pIdx, 1);
                }
            });
        };

        const drawGame = () => {
            const snakes = snakesRef.current;
            const foods = foodsRef.current;
            const particles = particlesRef.current;
            const playerSnake = snakes.find(s => s.id === 'player');
            if (!playerSnake || !playerSnake.isAlive) return;

            const playerHead = playerSnake.segments[0];

            // Clear screen
            ctx.fillStyle = '#0d0e15'; // deep dark blue space
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            // Translate camera to center on player's snake head
            ctx.translate(canvas.width / 2 - playerHead.x, canvas.height / 2 - playerHead.y);

            // --- World Grid Background ---
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            const gridSpacing = 50;

            const startX = Math.max(0, Math.floor((playerHead.x - canvas.width) / gridSpacing) * gridSpacing);
            const endX = Math.min(mapWidth, Math.floor((playerHead.x + canvas.width) / gridSpacing) * gridSpacing);
            const startY = Math.max(0, Math.floor((playerHead.y - canvas.height) / gridSpacing) * gridSpacing);
            const endY = Math.min(mapHeight, Math.floor((playerHead.y + canvas.height) / gridSpacing) * gridSpacing);

            for (let x = startX; x <= endX; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, mapHeight);
                ctx.stroke();
            }
            for (let y = startY; y <= endY; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(mapWidth, y);
                ctx.stroke();
            }

            // Draw map boundaries
            ctx.strokeStyle = '#ff1744'; // neon red boundaries
            ctx.lineWidth = 8;
            ctx.strokeRect(0, 0, mapWidth, mapHeight);

            // Draw map boundary grid markings
            ctx.fillStyle = 'rgba(255, 23, 68, 0.1)';
            ctx.fillRect(-10, -10, mapWidth + 20, 10);
            ctx.fillRect(-10, mapHeight, mapWidth + 20, 10);
            ctx.fillRect(-10, 0, 10, mapHeight);
            ctx.fillRect(mapWidth, 0, 10, mapHeight);

            // --- Render Spawning Indicators ---
            snakes.forEach(snake => {
                if (snake.isAlive || snake.respawnTimer <= 0) return;
                if (snake.spawnX === undefined || snake.spawnY === undefined) return;

                ctx.save();
                
                // Pulsing dashed circle warning
                const pulse = Math.sin(Date.now() / 80) * 0.5 + 0.5; // [0, 1]
                const color = `rgba(255, 61, 0, ${0.45 + pulse * 0.45})`; // pulsing opacity
                ctx.strokeStyle = color;
                ctx.lineWidth = 3.5;
                ctx.setLineDash([5, 5]);

                // Pulse radius
                const r = 24 + pulse * 8;
                ctx.beginPath();
                ctx.arc(snake.spawnX, snake.spawnY, r, 0, Math.PI * 2);
                ctx.stroke();

                // Innermost warning crosshair
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(snake.spawnX - 10, snake.spawnY);
                ctx.lineTo(snake.spawnX + 10, snake.spawnY);
                ctx.moveTo(snake.spawnX, snake.spawnY - 10);
                ctx.lineTo(snake.spawnX, snake.spawnY + 10);
                ctx.stroke();

                // Warning label text
                ctx.fillStyle = color;
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚠️ SPAWNING', snake.spawnX, snake.spawnY - r - 10);
                ctx.fillText(snake.name.substring(0, 8).toUpperCase(), snake.spawnX, snake.spawnY + r + 10);

                ctx.restore();
            });

            // --- Render Foods ---
            foods.forEach(food => {
                ctx.shadowColor = food.color;
                ctx.shadowBlur = food.size > 5 ? 10 : 0;
                ctx.fillStyle = food.color;
                ctx.beginPath();
                ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0; // reset shadow

            // --- Render Snakes Bodies & Heads ---
            snakes.forEach(snake => {
                if (!snake.isAlive) return;

                const snakeScale = 1 + Math.min(9.0, Math.sqrt(snake.score) * 0.08);
                const currentHeadRadius = 14 * snakeScale;
                const currentBodyRadius = 11 * snakeScale;

                // Draw segments from tail to neck (excluding head)
                for (let i = snake.segments.length - 1; i > 0; i--) {
                    const seg = snake.segments[i];
                    
                    // Draw circles
                    ctx.fillStyle = snake.color;
                    ctx.beginPath();
                    // Draw tapering body segment scaled up based on score
                    const segmentRadius = currentBodyRadius - (i * 0.05 * snakeScale > currentBodyRadius * 0.4 ? currentBodyRadius * 0.4 : i * 0.05 * snakeScale);
                    ctx.arc(seg.x, seg.y, segmentRadius, 0, Math.PI * 2);
                    ctx.fill();

                    // Optional scales/details overlay
                    if (i % 3 === 0) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.beginPath();
                        ctx.arc(seg.x, seg.y, currentBodyRadius * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Draw Head
                const head = snake.segments[0];
                
                // Outer circle container
                ctx.save();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3.5 * snakeScale;
                ctx.fillStyle = snake.color;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 16 * snakeScale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Rotate avatar to align with head direction
                ctx.translate(head.x, head.y);
                ctx.rotate(snake.angle + Math.PI / 2);

                const avatar = avatarImgs[snake.id === 'player' ? 'player' : snake.id];
                if (avatar) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(0, 0, 13.5 * snakeScale, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(avatar, -13.5 * snakeScale, -13.5 * snakeScale, 27 * snakeScale, 27 * snakeScale);
                    ctx.restore();
                } else {
                    // Fallback avatar letter
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${9 * snakeScale}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(snake.name.substring(0, 2).toUpperCase(), 0, 0);
                }
                ctx.restore();

                // Draw label above player head
                ctx.fillStyle = snake.id === 'player' ? '#00e5ff' : 'rgba(255, 255, 255, 0.65)';
                ctx.font = `bold ${Math.max(9, 9 * Math.sqrt(snakeScale))}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(`${snake.name} (${snake.score})`, head.x, head.y - 25 * snakeScale);
            });

            // --- Render Sparkle Particles ---
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.restore(); // restore viewport translation
        };

        const renderLoop = () => {
            updateGame();
            drawGame();
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        // Resize observer
        const handleResize = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.parentElement?.getBoundingClientRect();
                if (rect) {
                    canvasRef.current.width = rect.width;
                    canvasRef.current.height = rect.height;
                    setViewportSize({ width: rect.width, height: rect.height });
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // initial call

        renderLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [phase, avatarImgs]);

    // Handle mouse move to capture cursor coordinates
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    // Real-time top 5 leaderboard
    const activeSnakes = snakesRef.current.filter(s => s.isAlive);
    const sortedSnakes = [...activeSnakes].sort((a, b) => b.score - a.score).slice(0, 5);

    return (
        <div className="flex flex-col h-full bg-[#0d0e15] relative overflow-hidden select-none text-white">
            {/* Header HUD */}
            <div className="bg-black/90 backdrop-blur-md p-4 flex justify-between items-center z-20 border-b-4 border-black shadow-xl">
                <button onClick={onBack} className="font-black text-sm text-gray-400 hover:text-white transition-colors">EXIT</button>
                <div className="flex gap-6 items-center">
                    <span className="font-black text-xs md:text-sm uppercase tracking-widest text-yellow-400">
                        {t.score}: <span className="font-mono text-white text-base">{score}</span>
                    </span>
                    <span className="font-black text-xs md:text-sm uppercase tracking-widest text-emerald-400">
                        {t.length}: <span className="font-mono text-white text-base">{length}</span>
                    </span>
                </div>
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="font-bold text-gray-400 hover:text-white w-8 text-center text-sm"
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>
            </div>

            {/* Instruction Bar */}
            <div className="bg-yellow-400/10 border-b border-yellow-400/20 py-1.5 px-4 text-center z-10 text-[10px] md:text-xs font-medium text-yellow-400/80 tracking-wide uppercase">
                🖱️ {t.instruction}
            </div>

            {/* Leaderboard Overlay */}
            <div className="absolute top-28 right-4 z-10 bg-black/80 border-3 border-white/10 rounded-2xl p-3 shadow-xl text-white w-48 font-mono text-xs select-none">
                <div className="text-[10px] text-yellow-400 uppercase font-black mb-2 tracking-widest text-center">🏆 {t.leaderboard}</div>
                <div className="flex flex-col gap-1.5">
                    {sortedSnakes.map((s, idx) => (
                        <div key={s.id} className={`flex justify-between items-center ${s.id === 'player' ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>
                            <span className="truncate max-w-[110px] text-[11px]">{idx + 1}. {s.name}</span>
                            <span className="font-bold">{s.score}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stage Canvas */}
            <div className="flex-1 flex relative w-full h-full bg-[#0d0e15]">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    className="w-full h-full cursor-crosshair object-cover"
                />

                {/* Minimap Overlay */}
                <div className="absolute bottom-4 right-4 z-10 bg-black/80 border-2 border-white/20 rounded-2xl p-1.5 shadow-2xl w-28 h-28 flex overflow-hidden">
                    <canvas
                        ref={(mapCanvas) => {
                            if (!mapCanvas) return;
                            const ctx = mapCanvas.getContext('2d');
                            if (!ctx) return;

                            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
                            ctx.fillStyle = '#0d0e15';
                            ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

                            // Draw border box
                            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                            ctx.lineWidth = 1.5;
                            ctx.strokeRect(0, 0, mapCanvas.width, mapCanvas.height);

                            const factor = mapCanvas.width / mapWidth;

                            // Draw food
                            ctx.fillStyle = 'rgba(255,255,255,0.3)';
                            foodsRef.current.forEach(f => {
                                ctx.fillRect(f.x * factor, f.y * factor, 1.5, 1.5);
                            });

                            // Draw snakes
                            snakesRef.current.forEach(s => {
                                if (!s.isAlive) return;
                                const head = s.segments[0];
                                ctx.fillStyle = s.id === 'player' ? '#00e5ff' : '#ff1744';
                                ctx.beginPath();
                                ctx.arc(head.x * factor, head.y * factor, s.id === 'player' ? 2.5 : 2, 0, Math.PI * 2);
                                ctx.fill();
                            });
                        }}
                        width={100}
                        height={100}
                        className="w-full h-full rounded-xl"
                    />
                </div>
            </div>

            {/* Game Over Modal */}
            {phase === 'gameover' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fadeIn">
                    <div className="bg-white border-4 border-black text-black rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                        <span className="text-5xl mb-4">💀</span>
                        <h2 className="font-black text-3xl text-rose-600 tracking-wider mb-2 uppercase">{t.gameOver}</h2>
                        
                        <div className="flex flex-col gap-1 my-4 font-mono text-sm text-gray-700">
                            <div>Score: <span className="font-bold text-black">{score}</span></div>
                            <div>Length reached: <span className="font-bold text-black">{length} segments</span></div>
                            <div className="mt-2 text-xs font-sans font-bold bg-yellow-400 text-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                                🪙 {t.coinsRewarded}: <span className="font-mono text-sm">{rewardCoins}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full mt-4">
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
