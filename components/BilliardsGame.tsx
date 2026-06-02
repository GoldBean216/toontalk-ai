
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface BilliardsGameProps {
    onBack: () => void;
    userAvatar: string;
    onWin?: (coins: number) => void;
}

type OpponentId = 'gorilla' | 'giraffe';
type GamePhase = 'select' | 'playing' | 'gameover';

interface Ball {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    isStriped: boolean; // Not strictly used for logic in simplified version but good for visuals
    isCue: boolean;
    isEight: boolean;
    inPocket: boolean;
}

const TABLE_WIDTH = 600;
const TABLE_HEIGHT = 300;
const BALL_RADIUS = 10;
const POCKET_RADIUS = 20;
const FRICTION = 0.985;
const POWER_LIMIT = 20;

const OPPONENTS = {
    gorilla: {
        name: 'Kong',
        avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Gorilla.png',
        color: 'bg-gray-800',
        skill: 0.7 // Accuracy variance
    },
    giraffe: {
        name: 'Stretch',
        avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Giraffe.png',
        color: 'bg-yellow-200',
        skill: 0.9 // High accuracy
    }
};

export const BilliardsGame: React.FC<BilliardsGameProps> = ({ onBack, userAvatar, onWin }) => {
    const [phase, setPhase] = useState<GamePhase>('select');
    const [opponentId, setOpponentId] = useState<OpponentId>('gorilla');
    const [turn, setTurn] = useState<'user' | 'ai'>('user');
    const [msg, setMsg] = useState('');
    const [winner, setWinner] = useState<'user' | 'ai' | null>(null);
    
    // Canvas & Game State refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ballsRef = useRef<Ball[]>([]);
    const animationRef = useRef<number>(0);
    const isMovingRef = useRef(false);
    
    // Aiming State
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [power, setPower] = useState(0);
    const [isCharging, setIsCharging] = useState(false);

    // --- INITIALIZATION ---
    const initGame = (opp: OpponentId) => {
        setOpponentId(opp);
        
        // Setup Balls
        const newBalls: Ball[] = [];
        
        // Cue Ball
        newBalls.push({ id: 0, x: TABLE_WIDTH / 4, y: TABLE_HEIGHT / 2, vx: 0, vy: 0, color: '#FFFFFF', isCue: true, isEight: false, isStriped: false, inPocket: false });

        // Rack (Triangle)
        let startX = TABLE_WIDTH * 0.75;
        let startY = TABLE_HEIGHT / 2;
        let col = 0;
        let row = 0;
        const colors = ['#FFD700', '#0000FF', '#FF0000', '#800080', '#FFA500', '#008000', '#800000', '#000000', '#FFFF00'];
        
        // Simplified Rack: 1, 2, 3, 4, 5 balls in cols
        // We will do a diamond of 6 balls + 8ball for simplicity/performance in mini-game
        // Layout:
        //   O
        //  O O
        // O 8 O
        const rackOffsets = [
            {x:0, y:0}, 
            {x:1, y:-1}, {x:1, y:1},
            {x:2, y:-2}, {x:2, y:0}, {x:2, y:2} // 8 ball at 2,0
        ];

        rackOffsets.forEach((off, idx) => {
            const bx = startX + (off.x * (BALL_RADIUS * 2 + 2));
            const by = startY + (off.y * (BALL_RADIUS + 1));
            const isEight = idx === 4; // Center of 3rd col
            const color = isEight ? '#000000' : colors[idx % colors.length];
            
            newBalls.push({
                id: idx + 1,
                x: bx,
                y: by,
                vx: 0,
                vy: 0,
                color: color,
                isCue: false,
                isEight: isEight,
                isStriped: false, // simplified
                inPocket: false
            });
        });

        ballsRef.current = newBalls;
        setTurn('user');
        setPhase('playing');
        setMsg("Your Turn");
        setWinner(null);
    };

    // --- PHYSICS ENGINE ---
    useEffect(() => {
        if (phase !== 'playing') return;

        const update = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            const balls = ballsRef.current;
            let moving = false;

            // 1. Movement & Wall Collision
            balls.forEach(b => {
                if (b.inPocket) return;

                b.x += b.vx;
                b.y += b.vy;

                // Friction
                b.vx *= FRICTION;
                b.vy *= FRICTION;

                // Stop if slow
                if (Math.abs(b.vx) < 0.05) b.vx = 0;
                if (Math.abs(b.vy) < 0.05) b.vy = 0;

                if (b.vx !== 0 || b.vy !== 0) moving = true;

                // Wall Bounce
                if (b.x - BALL_RADIUS < 0) { b.x = BALL_RADIUS; b.vx *= -1; }
                if (b.x + BALL_RADIUS > TABLE_WIDTH) { b.x = TABLE_WIDTH - BALL_RADIUS; b.vx *= -1; }
                if (b.y - BALL_RADIUS < 0) { b.y = BALL_RADIUS; b.vy *= -1; }
                if (b.y + BALL_RADIUS > TABLE_HEIGHT) { b.y = TABLE_HEIGHT - BALL_RADIUS; b.vy *= -1; }

                // Pockets
                // Top-Left, Top-Mid, Top-Right, Bot-Left, Bot-Mid, Bot-Right
                const pockets = [
                    {x:0, y:0}, {x:TABLE_WIDTH/2, y:0}, {x:TABLE_WIDTH, y:0},
                    {x:0, y:TABLE_HEIGHT}, {x:TABLE_WIDTH/2, y:TABLE_HEIGHT}, {x:TABLE_WIDTH, y:TABLE_HEIGHT}
                ];

                pockets.forEach(p => {
                    const dx = b.x - p.x;
                    const dy = b.y - p.y;
                    if (Math.sqrt(dx*dx + dy*dy) < POCKET_RADIUS) {
                        b.inPocket = true;
                        b.vx = 0;
                        b.vy = 0;
                        handlePocket(b);
                    }
                });
            });

            // 2. Ball Collisions
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const b1 = balls[i];
                    const b2 = balls[j];
                    if (b1.inPocket || b2.inPocket) continue;

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < BALL_RADIUS * 2) {
                        // Collision response
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        // Rotate velocity
                        const vx1 = b1.vx * cos + b1.vy * sin;
                        const vy1 = b1.vy * cos - b1.vx * sin;
                        const vx2 = b2.vx * cos + b2.vy * sin;
                        const vy2 = b2.vy * cos - b2.vx * sin;

                        // Swap 1D velocity
                        const vx1Final = vx2;
                        const vx2Final = vx1;

                        // Rotate back
                        b1.vx = vx1Final * cos - vy1 * sin;
                        b1.vy = vy1 * cos + vx1Final * sin;
                        b2.vx = vx2Final * cos - vy2 * sin;
                        b2.vy = vy2 * cos + vx2Final * sin;

                        // Separate balls to prevent sticking
                        const overlap = (BALL_RADIUS * 2 - dist) / 2;
                        b1.x -= overlap * Math.cos(angle);
                        b1.y -= overlap * Math.sin(angle);
                        b2.x += overlap * Math.cos(angle);
                        b2.y += overlap * Math.sin(angle);
                    }
                }
            }

            // State Logic
            if (moving) {
                isMovingRef.current = true;
            } else if (isMovingRef.current) {
                // Just stopped moving
                isMovingRef.current = false;
                endTurn();
            }

            // Render
            draw(ctx);
            animationRef.current = requestAnimationFrame(update);
        };

        animationRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationRef.current);
    }, [phase]); // Re-bind if phase changes

    // --- GAME LOGIC ---

    const handlePocket = (b: Ball) => {
        if (b.isCue) {
            // Scratch! Reset Cue
            setTimeout(() => {
                b.inPocket = false;
                b.x = TABLE_WIDTH / 4;
                b.y = TABLE_HEIGHT / 2;
                b.vx = 0;
                b.vy = 0;
            }, 100);
        } else if (b.isEight) {
            // Game Over
            // If other balls remain, loss. If all others gone, win.
            const others = ballsRef.current.filter(ball => !ball.isCue && !ball.isEight && !ball.inPocket);
            if (others.length === 0) {
                handleGameOver(turn === 'user' ? 'user' : 'ai', "8-Ball Sunk! Victory!");
            } else {
                handleGameOver(turn === 'user' ? 'ai' : 'user', "8-Ball Sunk Early! Loss!");
            }
        }
    };

    const endTurn = () => {
        // Simple turn swap for now. In real pool, potting a ball keeps turn.
        // We'll stick to strict turn swapping for this mini-game simplicity
        setTurn(prev => {
            const next = prev === 'user' ? 'ai' : 'user';
            setMsg(next === 'user' ? "Your Turn" : "AI Thinking...");
            return next;
        });
    };

    const handleGameOver = (w: 'user' | 'ai', reason: string) => {
        setWinner(w);
        setMsg(reason);
        setPhase('gameover');
        if (w === 'user' && onWin) onWin(50);
    };

    // --- AI LOGIC ---
    useEffect(() => {
        if (phase === 'playing' && turn === 'ai' && !isMovingRef.current) {
            const timer = setTimeout(() => {
                const balls = ballsRef.current;
                const cue = balls.find(b => b.isCue);
                // Find target (random non-pocketed object ball)
                const targets = balls.filter(b => !b.isCue && !b.inPocket && !b.isEight); // Save 8 ball for last ideally
                const target = targets.length > 0 
                    ? targets[Math.floor(Math.random() * targets.length)] 
                    : balls.find(b => b.isEight && !b.inPocket); // Aim for 8 if last

                if (cue && target) {
                    const dx = target.x - cue.x;
                    const dy = target.y - cue.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // Add AI variance based on skill
                    const variance = (1 - OPPONENTS[opponentId].skill) * 0.5; // +/- radians
                    const finalAngle = angle + (Math.random() * variance - variance/2);
                    const power = 10 + Math.random() * 10; // Random power 10-20

                    shoot(finalAngle, power);
                } else {
                    // No targets? Just shoot random
                    shoot(Math.random() * Math.PI * 2, 15);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [turn, isMovingRef.current, phase]);

    // --- INPUT HANDLERS ---
    const handleMouseDown = () => {
        if (turn === 'user' && !isMovingRef.current) {
            setIsCharging(true);
            setPower(0);
        }
    };

    const handleMouseUp = () => {
        if (isCharging) {
            setIsCharging(false);
            const cue = ballsRef.current.find(b => b.isCue);
            if (cue) {
                const dx = mousePos.x - cue.x;
                const dy = mousePos.y - cue.y;
                const angle = Math.atan2(dy, dx);
                // Mouse is direction we pull stick back, so shoot opposite
                shoot(angle + Math.PI, power); 
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            setMousePos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    // Power Charge Loop
    useEffect(() => {
        let anim: number;
        if (isCharging) {
            const charge = () => {
                setPower(p => {
                    const next = p + 0.5;
                    return next > POWER_LIMIT ? 0 : next; // Loop power
                });
                anim = requestAnimationFrame(charge);
            };
            anim = requestAnimationFrame(charge);
        }
        return () => cancelAnimationFrame(anim);
    }, [isCharging]);

    const shoot = (angle: number, p: number) => {
        const cue = ballsRef.current.find(b => b.isCue);
        if (cue) {
            cue.vx = Math.cos(angle) * p;
            cue.vy = Math.sin(angle) * p;
        }
    };

    // --- DRAWING ---
    const draw = (ctx: CanvasRenderingContext2D) => {
        // Table
        ctx.fillStyle = '#2E7D32'; // Felt Green
        ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
        
        // Rails
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#3E2723'; // Wood
        ctx.strokeRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

        // Pockets
        ctx.fillStyle = '#000';
        [
            {x:0, y:0}, {x:TABLE_WIDTH/2, y:0}, {x:TABLE_WIDTH, y:0},
            {x:0, y:TABLE_HEIGHT}, {x:TABLE_WIDTH/2, y:TABLE_HEIGHT}, {x:TABLE_WIDTH, y:TABLE_HEIGHT}
        ].forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });

        // Balls
        ballsRef.current.forEach(b => {
            if (b.inPocket) return;
            
            // Shadow
            ctx.beginPath();
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.arc(b.x + 2, b.y + 2, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.beginPath();
            ctx.fillStyle = b.color;
            ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            
            // Shine
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.arc(b.x - 3, b.y - 3, BALL_RADIUS/3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Cue Stick UI
        if (turn === 'user' && !isMovingRef.current && !isCharging) {
            const cue = ballsRef.current.find(b => b.isCue);
            if (cue) {
                // Draw aim line
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2;
                ctx.moveTo(cue.x, cue.y);
                ctx.lineTo(mousePos.x, mousePos.y);
                ctx.stroke();
            }
        }
    };

    // --- RENDER ---

    if (phase === 'select') {
        return (
            <div className="flex flex-col h-full bg-green-900 text-white p-6 items-center">
                <div className="w-full bg-black/30 p-4 rounded-xl flex justify-between items-center mb-8 border-b-2 border-white/20">
                    <button onClick={onBack} className="text-2xl font-bold">←</button>
                    <h1 className="text-3xl font-black uppercase tracking-widest text-yellow-400">Billiards</h1>
                    <div className="w-8"></div>
                </div>
                
                <h2 className="text-xl font-bold mb-6">Choose Your Opponent</h2>
                <div className="flex gap-6">
                    {Object.entries(OPPONENTS).map(([id, opp]) => (
                        <div 
                            key={id}
                            onClick={() => initGame(id as OpponentId)}
                            className={`
                                w-40 h-56 rounded-3xl border-4 border-white/50 cursor-pointer flex flex-col items-center justify-center p-4 transition-all
                                ${opp.color} text-black hover:scale-105 hover:border-white shadow-xl
                            `}
                        >
                            <img src={opp.avatar} className="w-24 h-24 mb-4 drop-shadow-md" />
                            <h3 className="font-black text-xl uppercase">{opp.name}</h3>
                            <div className="mt-2 text-xs font-bold bg-black/20 px-2 py-1 rounded">
                                {id === 'giraffe' ? 'High Precision' : 'Aggressive'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1b5e20] items-center justify-center p-4 relative select-none">
            {/* HUD */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/50 text-white z-20">
                <button onClick={onBack} className="font-bold border border-white/50 px-3 py-1 rounded hover:bg-black">EXIT</button>
                <div className="font-black text-xl tracking-wider text-yellow-400">{msg}</div>
                <div className="flex items-center gap-2">
                    <span className="text-xs">{OPPONENTS[opponentId].name}</span>
                    <img src={OPPONENTS[opponentId].avatar} className="w-8 h-8 rounded-full bg-white border" />
                </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="relative border-8 border-[#3E2723] rounded-xl shadow-2xl bg-[#2E7D32]">
                <canvas 
                    ref={canvasRef}
                    width={TABLE_WIDTH}
                    height={TABLE_HEIGHT}
                    className="cursor-crosshair touch-none"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleMouseUp}
                />
                
                {/* Power Meter Overlay */}
                {isCharging && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/50 rounded-full border-2 border-white overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-75"
                            style={{ width: `${(power / POWER_LIMIT) * 100}%` }}
                        ></div>
                    </div>
                )}
            </div>

            {/* Game Over Modal */}
            {phase === 'gameover' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-sm border-4 border-black text-black">
                        <div className="text-6xl mb-4">{winner === 'user' ? '🎱' : '💀'}</div>
                        <h2 className="text-4xl font-black mb-2 uppercase">
                            {winner === 'user' ? 'YOU WIN!' : 'YOU LOSE!'}
                        </h2>
                        <p className="text-gray-500 font-bold mb-4">{msg}</p>
                        {winner === 'user' && (
                            <p className="text-xl font-bold text-yellow-500 mb-6">+50 TT Coins</p>
                        )}
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => initGame(opponentId)} variant="primary">Play Again</Button>
                            <Button onClick={onBack} variant="secondary">Exit</Button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-4 text-white/50 text-xs font-bold text-center">
                Drag to Aim • Hold to Power • Release to Shoot
            </div>
        </div>
    );
};
