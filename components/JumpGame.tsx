import React, { useEffect, useRef, useState } from 'react';

interface JumpGameProps {
  avatarUrl: string;
  onClose: () => void;
  language: string;
  buildingType: string;
  isPaused?: boolean;
}

interface Obstacle {
  x: number;
  emoji: string;
  width: number;
  height: number;
  passed: boolean;
  clusterId: number;    // which cluster this obstacle belongs to
  clusterIndex: number; // position within the cluster (0 = leftmost)
  clusterSize: number;  // total obstacles in this cluster
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const JumpGame: React.FC<JumpGameProps> = ({
  avatarUrl,
  onClose,
  language,
  buildingType,
  isPaused = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isChinese = language === "简体中文";

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  // Game state
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('toon_jump_highscore') || 0);
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
 
  // References for the loop
  const gameStateRef = useRef({
    playerY: 92,
    playerVy: 0,
    isJumping: false,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    speed: 4.5,
    frameCount: 1,
    nextClusterId: 0,
    score: 0,
    highScore: 0,
    gameOver: false,
    gameStarted: false,
    groundY: 110,
    playerRadius: 18,
    playerX: 55,
  });
 
  const avatarImgRef = useRef<HTMLImageElement | null>(null);

  // Load avatar image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = avatarUrl;
    img.onload = () => {
      avatarImgRef.current = img;
    };
  }, [avatarUrl]);

  // Sync highscore ref
  useEffect(() => {
    gameStateRef.current.highScore = highScore;
  }, [highScore]);

  // Restart game
  const initGame = () => {
    const state = gameStateRef.current;
    state.playerY = state.groundY - state.playerRadius;
    state.playerVy = 0;
    state.isJumping = false;
    state.obstacles = [];
    state.particles = [];
    state.speed = 4.5;
    state.frameCount = 1;
    state.nextClusterId = 0;
    state.score = 0;
    state.gameOver = false;
    state.gameStarted = true;

    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  };

  // Trigger jump
  const triggerJump = () => {
    if (isPausedRef.current) return;
    const state = gameStateRef.current;
    if (!state.gameStarted) {
      initGame();
      return;
    }
    if (state.gameOver) {
      initGame();
      return;
    }
    if (!state.isJumping) {
      state.playerVy = -8.5;
      state.isJumping = true;
      // Spawn jump dust particles
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: state.playerX,
          y: state.groundY,
          vx: -1 - Math.random() * 2,
          vy: -Math.random() * 2,
          size: 3 + Math.random() * 4,
          color: '#000000',
          alpha: 0.6
        });
      }
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        triggerJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main game loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set correct dimensions for crisp rendering
    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = 140;

    const loop = () => {
      const state = gameStateRef.current;

      // Enforce dynamic width adjustments to prevent coordinate compression
      if (canvas.parentElement) {
        const clientWidth = canvas.parentElement.clientWidth;
        const targetWidth = clientWidth > 200 ? clientWidth : 600;
        if (canvas.width !== targetWidth) {
          canvas.width = targetWidth;
        }
      }

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Draw background tint (Underwater cyan if lake, soft green if park, soft gray-blue if mountain, light blue otherwise)
      const typeLower = (buildingType || '').toLowerCase();
      const isLake = typeLower.includes('lake');
      const isPark = typeLower.includes('park') || typeLower.includes('fountain') || typeLower.includes('garden') || typeLower.includes('forest');
      const isMountain = typeLower.includes('mountain') || typeLower.includes('peak') || typeLower.includes('hill') || typeLower.includes('climb');
      ctx.fillStyle = isLake ? '#e6f7ff' : isPark ? '#ecfdf5' : isMountain ? '#f1f5f9' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Draw Ground
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, state.groundY);
      ctx.lineTo(width, state.groundY);
      ctx.stroke();

      // Draw Ground ticks (scrolling effect)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      const tickOffset = state.gameStarted && !state.gameOver ? (state.frameCount * state.speed) % 30 : 0;
      for (let x = -tickOffset; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, state.groundY);
        ctx.lineTo(x - 5, state.groundY + 8);
        ctx.stroke();
      }

      if (state.gameStarted) {
        const paused = isPausedRef.current;
        if (!paused) {
          state.frameCount++;
        }

        // Physics: Gravity
        if (state.isJumping && !state.gameOver) {
          if (!paused) {
            state.playerY += state.playerVy;
            state.playerVy += 0.45; // Gravity acceleration

            // Check landing
            if (state.playerY >= state.groundY - state.playerRadius) {
              state.playerY = state.groundY - state.playerRadius;
              state.playerVy = 0;
              state.isJumping = false;
            }
          }
        }

        // Spawn obstacles
        const obstacleEmojis = isLake 
          ? ['🦀', '🐚', '⚓', '🪸'] 
          : isPark 
            ? ['🪵', '🪨', '🌿', '🍄', '🦔'] 
            : isMountain
              ? ['🪨', '🌲', '🪵', '⛺', '🐐']
              : ['📦', '💻', '🪑', '🗑️'];
        const spawnInterval = state.obstacles.length === 0 ? 30 : 90;
        if (state.frameCount % spawnInterval === 0 && !state.gameOver && !paused) {
          // The first obstacle of the game is always a single obstacle
          // Subsequent spawns have a 60% chance of 1, 30% chance of 2, 10% chance of 3
          const isFirstSpawn = state.score === 0 && state.obstacles.length === 0;
          const rand = Math.random();
          const count = isFirstSpawn ? 1 : (rand < 0.6 ? 1 : rand < 0.9 ? 2 : 3);

          // Add a subtle random offset to vary spacing between clusters
          const randomOffset = state.obstacles.length === 0 ? 0 : (Math.random() * 40 - 20);

          const clusterId = state.nextClusterId++;
          for (let i = 0; i < count; i++) {
            const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)];
            state.obstacles.push({
              x: width + 20 + randomOffset + (i * 80),
              emoji,
              width: 20,
              height: 20,
              passed: false,
              clusterId,
              clusterIndex: i,
              clusterSize: count,
            });
          }
        }

        // ─── Cluster-aware obstacle logic ───────────────────────────────
        // Step 1: Move all obstacles
        if (!state.gameOver && !paused) {
          state.obstacles.forEach(obs => { obs.x -= state.speed; });
        }

        // Step 2: Draw all obstacles
        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.obstacles.forEach(obs => {
          ctx.fillText(obs.emoji, obs.x, state.groundY - 12);
        });

        // Step 3: Group by clusterId
        const clusterMap = new Map<number, Obstacle[]>();
        state.obstacles.forEach(obs => {
          const group = clusterMap.get(obs.clusterId) ?? [];
          group.push(obs);
          clusterMap.set(obs.clusterId, group);
        });

        // Step 4: Per-cluster pass + collision
        const obsHalfW = 8;
        const obsHalfH = 10;
        const obsCY = state.groundY - 12;
        const hitRadius = state.playerRadius - 4; // 14px — forgiveness margin
        const playerLeft   = state.playerX - hitRadius;
        const playerRight  = state.playerX + hitRadius;
        const playerTop    = state.playerY - hitRadius;
        const playerBottom = state.playerY + hitRadius;

        clusterMap.forEach(clusterObs => {
          const unpassed = clusterObs.filter(o => !o.passed);
          if (unpassed.length === 0) return;

          // Cluster bounding box (min/max x of unpassed members)
          const xs = unpassed.map(o => o.x);
          const clusterMinX = Math.min(...xs);
          const clusterMaxX = Math.max(...xs);
          const clusterCenterX = (clusterMinX + clusterMaxX) / 2;

          // Pass check: when cluster center crosses player center
          if (clusterCenterX < state.playerX) {
            unpassed.forEach(o => { o.passed = true; });
            state.score += unpassed.length * 10;
            setScore(state.score);
            if (state.score > state.highScore) {
              state.highScore = state.score;
              setHighScore(state.highScore);
              try { localStorage.setItem('toon_jump_highscore', String(state.highScore)); } catch {}
            }
            if (!paused) state.speed += 0.05 * unpassed.length;
            return; // already passed, skip collision
          }

          // Collision check — cluster CENTER ± halfW vs player hitbox
          // The collision box is centered on the cluster's midpoint, not the full span.
          // This prevents early death from the leading edge of a multi-obstacle cluster.
          if (!state.gameOver && !paused) {
            const obsLeft   = clusterCenterX - obsHalfW;
            const obsRight  = clusterCenterX + obsHalfW;
            const obsTop    = obsCY - obsHalfH;
            const obsBottom = obsCY + obsHalfH;

            const hit = playerRight > obsLeft  &&
                        playerLeft  < obsRight &&
                        playerBottom > obsTop  &&
                        playerTop   < obsBottom;

            if (hit) {
              state.gameOver = true;
              setGameOver(true);
              for (let i = 0; i < 15; i++) {
                state.particles.push({
                  x: state.playerX, y: state.playerY,
                  vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                  size: 4 + Math.random() * 6,
                  color: isLake ? '#06b6d4' : isPark ? '#10b981' : isMountain ? '#64748b' : '#ef4444',
                  alpha: 1
                });
              }
            }
          }
        });

        // Filter out off-screen obstacles
        state.obstacles = state.obstacles.filter(obs => obs.x > -50);

        // Update & Draw particles
        state.particles.forEach((p) => {
          if (!paused) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
          }
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        state.particles = state.particles.filter(p => p.alpha > 0);
      }

      // Draw Player (AI Avatar)
      const avatarImg = avatarImgRef.current;
      if (avatarImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(state.playerX, state.playerY, state.playerRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          avatarImg, 
          state.playerX - state.playerRadius, 
          state.playerY - state.playerRadius, 
          state.playerRadius * 2, 
          state.playerRadius * 2
        );
        ctx.restore();
        
        // Draw avatar black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.playerX, state.playerY, state.playerRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Fallback drawing if avatar isn't loaded yet
        ctx.fillStyle = '#6366f1';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.playerX, state.playerY, state.playerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 2. Draw Start Screen overlay
      if (!state.gameStarted) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#000000';
        ctx.font = 'black 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          isChinese ? '🏃 点击画面或空格开始跳跃游戏！' : '🏃 Click or Space to Start Jumping!',
          width / 2, 
          height / 2 + 5
        );
      }

      // 3. Draw Game Over overlay
      if (state.gameOver) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥 GAME OVER', width / 2, height / 2 - 8);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          isChinese ? '点击画面或按空格重新挑战' : 'Click or Press Space to Retry',
          width / 2,
          height / 2 + 16
        );
      }

      // 4. Draw Game Paused overlay
      if (isPausedRef.current && state.gameStarted && !state.gameOver) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#000000';
        ctx.font = '900 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          isChinese ? '⏸️ 游戏已暂停' : '⏸️ GAME PAUSED',
          width / 2, 
          height / 2 - 12
        );

        ctx.fillStyle = '#4b5563';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(
          isChinese ? 'AI 已成功回复内容，即将关闭...' : 'AI replied successfully! Closing...',
          width / 2, 
          height / 2 + 15
        );
      }

      // Request next frame
      if (canvasRef.current) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [buildingType, isPaused]);

  return (
    <div className="w-full bg-slate-100 border-t-4 border-b-4 border-black py-2 overflow-hidden relative select-none z-10 flex flex-col items-center">
      {/* Game Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full border-2 border-black bg-white hover:bg-slate-100 flex items-center justify-center text-[10px] font-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
        title={isChinese ? "关闭游戏" : "Close Game"}
      >
        ✕
      </button>

      {/* Top Banner (Score & HighScore) */}
      <div className="absolute top-2 left-4 z-20 flex gap-4 text-[10px] font-black text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-black/20 shadow-sm">
        <span>SCORE: {score}</span>
        <span className="text-slate-400">HI: {highScore}</span>
      </div>

      {/* Canvas viewport */}
      <canvas
        ref={canvasRef}
        onClick={triggerJump}
        className="w-full cursor-pointer h-[140px]"
        style={{ display: 'block' }}
      />

    </div>
  );
};
