import React, { useEffect, useRef, useState } from 'react';

interface ZumaGameProps {
  onClose: () => void;
  language: string;
  buildingType: string;
  isPaused?: boolean;
}

interface ChainItem {
  id: string;
  emoji: string;
  renderX: number;
  targetX: number;
  birthFrame: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string; alpha: number;
}

interface ShotBall {
  x: number;
  y: number;
  emoji: string;
}

// ─── Theme emojis ─────────────────────────────────────────────────────────────
const getThemeEmojis = (buildingType: string): string[] => {
  const t = (buildingType || '').toLowerCase();
  if (t.includes('cafe') || t.includes('shop') || t.includes('boba'))
    return ['☕', '🍰', '🍩', '🥐', '🍪', '🥤'];
  if (t.includes('training') || t.includes('gym'))
    return ['🏋️', '🏃', '🤸', '🧘', '🚴', '🥊'];
  if (t.includes('education') || t.includes('library'))
    return ['📚', '📖', '✏️', '🔖', '🕯️', '🎓'];
  if (t.includes('entertainment') || t.includes('arcade') || t.includes('cinema'))
    return ['👾', '🎮', '🎳', '🍿', '🎲', '🎸'];
  if (t.includes('hospital'))
    return ['🩺', '💊', '🩹', '🛏️', '🧪', '🚑'];
  if (t.includes('lake'))
    return ['🐠', '🐡', '🐙', '🦀', '🐚', '🌊'];
  if (t.includes('park') || t.includes('fountain') || t.includes('garden') || t.includes('forest'))
    return ['🌸', '🌼', '🌻', '🌳', '🍂', '🦋'];
  if (t.includes('mountain') || t.includes('peak') || t.includes('hill') || t.includes('climb'))
    return ['🏔️', '⛰️', '⛺', '🥾', '🚩', '🦅'];
  return ['💻', '📎', '📁', '📓', '🖊️', '☕'];
};

// Layout constants
const BELT_MID_Y  = 42;   // belt centre (upper zone)
const SHOOTER_Y   = 115;  // shooter ball y (lower zone)
const SHOT_SPEED  = 10;   // px/frame upward travel
const SPACING     = 32;   // px between chain item centres
const TARGET_CHAIN = 18;  // items to maintain in chain
const INTRO_FRAMES = 80;
const INTRO_SPEED_START = 10.0;
const FLASH_FRAMES = 12;
const COLLISION_RANGE = 26;


// ─── Component ────────────────────────────────────────────────────────────────
export const ZumaGame: React.FC<ZumaGameProps> = ({
  onClose, language, buildingType, isPaused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isChinese = language === '简体中文';
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const [score, setScore]             = useState(0);
  const [highScore, setHighScore]     = useState(() => {
    try { return Number(localStorage.getItem('toon_zuma_hs') || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver]       = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [comboText, setComboText]     = useState<string | null>(null);

  const emojis = React.useMemo(() => getThemeEmojis(buildingType), [buildingType]);

  const randEmoji = () => emojis[Math.floor(Math.random() * emojis.length)];

  // ─── Mutable game state ───────────────────────────────────────────────────
  const S = useRef({
    items:        [] as ChainItem[],
    particles:    [] as Particle[],
    score:        0,
    gameOver:     false,
    gameStarted:  false,
    speed:        0.25,
    frameCount:   0,
    bounceFrames:    0,
    bounceVelocity:  0,
    // Shooter state
    shooterX:     200,
    shooterEmoji: '☕',
    nextEmoji:    '🍩',
    shotBall:     null as ShotBall | null,
    canShoot:     true,
  });

  // ─── Match / combo ────────────────────────────────────────────────────────
  const runMatchCycle = (items: ChainItem[]) => {
    let cur = [...items];
    let totalElim = 0, combo = 0, changed = true;
    while (changed) {
      const matched = new Set<number>();
      let i = 0;
      while (i < cur.length) {
        let j = i + 1;
        while (j < cur.length && cur[j].emoji === cur[i].emoji) j++;
        if (j - i >= 3) for (let k = i; k < j; k++) matched.add(k);
        i = j;
      }
      if (matched.size > 0) {
        totalElim += matched.size; combo++;
        cur = cur.filter((_, idx) => !matched.has(idx));
      } else changed = false;
    }
    return { newItems: cur, totalElim, combo };
  };

  const processMatches = () => {
    const st = S.current;
    const { newItems, totalElim, combo } = runMatchCycle(st.items);
    if (totalElim === 0) return;

    const pts = totalElim * 10 * combo;
    st.score += pts;
    setScore(st.score);
    if (st.score > highScore) {
      setHighScore(st.score);
      try { localStorage.setItem('toon_zuma_hs', String(st.score)); } catch {}
    }
    if (combo > 1) { setComboText(`COMBO x${combo}! +${pts}`); setTimeout(() => setComboText(null), 1500); }

    // Particle burst at eliminated positions
    const pColors = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#ef4444'];
    st.items.forEach(item => {
      if (!newItems.find(ni => ni.id === item.id)) {
        const c = pColors[Math.floor(Math.random() * pColors.length)];
        for (let p = 0; p < 10; p++) {
          st.particles.push({
            x: item.renderX, y: BELT_MID_Y,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 5,
            size: 3 + Math.random() * 4, color: c, alpha: 1,
          });
        }
      }
    });

    // Bounce-back: all remaining items spring leftward
    const bounceDist = totalElim * SPACING * 1.5;
    newItems.forEach(item => { item.renderX -= bounceDist; item.targetX = item.renderX; });
    st.items = newItems;
    st.bounceFrames   = 28;
    st.bounceVelocity = -bounceDist / 28;
  };

  // ─── Add one item at the left end of chain ────────────────────────────────
  const addToChain = (frame: number) => {
    const st = S.current;
    const tail = st.items.length > 0 ? st.items[st.items.length - 1] : null;
    const x = tail ? tail.renderX - SPACING : -SPACING;
    st.items.push({
      id: `c-${frame}-${Math.random().toString(36).substr(2, 5)}`,
      emoji: randEmoji(),
      renderX: x, targetX: x,
      birthFrame: -999,
    });
  };



  // ─── Reset & Load/Save State ──────────────────────────────────────────────
  const [resumeText, setResumeText] = useState<string | null>(null);

  const showResumeToast = () => {
    setResumeText(isChinese ? '🔮 游戏已继续' : '🔮 Game Resumed');
    setTimeout(() => setResumeText(null), 1500);
  };

  const saveGameState = () => {
    const st = S.current;
    if (!st.gameStarted) return;
    const stateData = {
      items: st.items,
      score: st.score,
      speed: st.speed,
      frameCount: st.frameCount,
      shooterEmoji: st.shooterEmoji,
      nextEmoji: st.nextEmoji,
      gameOver: st.gameOver,
    };
    try {
      localStorage.setItem(`zuma_state_${buildingType}`, JSON.stringify(stateData));
    } catch (e) {
      console.error('Failed to save Zuma state:', e);
    }
  };

  const loadGameState = (): boolean => {
    try {
      const dataStr = localStorage.getItem(`zuma_state_${buildingType}`);
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);
      if (!data || data.gameOver) return false;

      const st = S.current;
      st.items = data.items || [];
      st.score = data.score || 0;
      st.speed = data.speed || 0.25;
      st.frameCount = data.frameCount || 0;
      st.shooterEmoji = data.shooterEmoji || emojis[0];
      st.nextEmoji = data.nextEmoji || emojis[1];
      st.gameOver = false;
      st.gameStarted = true;
      st.particles = [];
      st.shotBall = null;
      st.canShoot = true;

      setScore(st.score);
      setGameOver(false);
      setGameStarted(true);

      showResumeToast();
      return true;
    } catch (e) {
      console.error('Failed to load Zuma state:', e);
      return false;
    }
  };

  const resetGame = (forceFresh = false) => {
    const st = S.current;

    if (!forceFresh) {
      const restored = loadGameState();
      if (restored) return;
    }

    st.items          = [];
    st.particles      = [];
    st.score          = 0;
    st.gameOver       = false;
    st.gameStarted    = true;
    st.speed          = 0.25;
    st.frameCount     = 0;
    st.bounceFrames   = 0;
    st.bounceVelocity = 0;
    st.shotBall       = null;
    st.canShoot       = true;
    st.shooterEmoji   = randEmoji();
    st.nextEmoji      = randEmoji();

    // Seed chain: all items off-screen left, intro push brings them in
    for (let i = 0; i < TARGET_CHAIN; i++) {
      const x = -(i + 1) * SPACING;
      st.items.push({
        id: `seed-${i}`, emoji: randEmoji(),
        renderX: x, targetX: x, birthFrame: -999,
      });
    }

    setScore(0); setGameOver(false); setGameStarted(true);
  };

  // ─── Mouse event handlers ─────────────────────────────────────────────────
  const getX = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return e.clientX - r.left;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPausedRef.current) return;
    const st = S.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    st.shooterX = Math.max(16, Math.min(W - 16, getX(e)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPausedRef.current) return;
    const st = S.current;
    if (st.gameOver)     { resetGame(true); return; }
    if (!st.gameStarted) { resetGame(true); return; }
    if (!st.canShoot || st.shotBall !== null) return; // already in flight

    // Fire the shooter ball upward
    st.shotBall = { x: st.shooterX, y: SHOOTER_Y, emoji: st.shooterEmoji };
    st.canShoot = false;

    // Rotate emojis
    st.shooterEmoji = st.nextEmoji;
    st.nextEmoji = randEmoji();
  };

  useEffect(() => {
    resetGame();
    const onKey = (e: KeyboardEvent) => {
      if (isPausedRef.current) return;
      if (e.code === 'Space') { e.preventDefault(); resetGame(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      saveGameState();
    };
  }, []);

  // ─── Main rAF loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const update = () => {
      const st = S.current;
      if (isPausedRef.current || st.gameOver || !st.gameStarted) return;

      st.frameCount++;

      // Maintain chain (pause during bounce so retreat is visible)
      if (st.items.length < TARGET_CHAIN && st.bounceFrames === 0) {
        addToChain(st.frameCount);
      }

      // ── Chain movement ──
      if (st.items.length > 0) {
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.width / dpr;
        const warningX = W * 0.85;
        const startX = W * 0.15;

        if (st.frameCount <= INTRO_FRAMES) {
          // Rush in from left
          const t = st.frameCount / INTRO_FRAMES;
          const eased = 1 - Math.pow(1 - t, 2);
          const iSpeed = INTRO_SPEED_START * (1 - eased) + st.speed * eased;
          st.items.forEach(item => { item.renderX += iSpeed; });
        } else if (st.bounceFrames > 0) {
          // Bounce-back leftward
          const t = 1 - st.bounceFrames / 28;
          const bSpeed = st.bounceVelocity * (1 - t);
          st.items.forEach(item => { item.renderX += bSpeed; });
          st.bounceFrames--;
        } else {
          // Normal belt movement
          st.items[0].renderX += st.items[0].renderX < startX ? 4.0 : st.speed;
          for (let i = 1; i < st.items.length; i++) {
            st.items[i].targetX = st.items[i - 1].renderX - SPACING;
            const isBehindStart = st.items[i].renderX < startX;
            const t = isBehindStart ? 0.45 : 0.15;
            st.items[i].renderX += (st.items[i].targetX - st.items[i].renderX) * t;
          }
          if (st.items[0].renderX >= warningX) {
            st.gameOver = true;
            setGameOver(true);
            try { localStorage.removeItem(`zuma_state_${buildingType}`); } catch {}
          }
        }

        // Speed ramp-up
        if (st.frameCount % 400 === 0) st.speed = Math.min(1.5, st.speed + 0.03);
      }

      // ── Shot ball physics ──
      if (st.shotBall) {
        st.shotBall.y -= SHOT_SPEED;

        // Collision check: check distance to any visible item in the chain
        let collidedItem: ChainItem | null = null;
        let collidedIdx = -1;
        for (let i = 0; i < st.items.length; i++) {
          const item = st.items[i];
          if (item.renderX < -16) continue;
          const dx = st.shotBall.x - item.renderX;
          const dy = st.shotBall.y - BELT_MID_Y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= COLLISION_RANGE) {
            collidedItem = item;
            collidedIdx = i;
            break;
          }
        }

        if (collidedItem) {
          const insertX = st.shotBall.x;
          const insertIdx = insertX > collidedItem.renderX ? collidedIdx : collidedIdx + 1;
          const spawnX = insertX > collidedItem.renderX 
            ? collidedItem.renderX + SPACING 
            : collidedItem.renderX - SPACING;

          st.items.splice(insertIdx, 0, {
            id: `shot-${Date.now()}`,
            emoji: st.shotBall.emoji,
            renderX: spawnX,
            targetX: spawnX,
            birthFrame: st.frameCount,
          });
          st.shotBall  = null;
          st.canShoot  = true;
          processMatches();
        } else if (st.shotBall.y < -20) {
          st.shotBall  = null;
          st.canShoot  = true;
        }
      }

      // Particles
      st.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.alpha -= 0.022; });
      st.particles = st.particles.filter(p => p.alpha > 0);
    };

    // ── Draw one chain/shot item with pop-in ──────────────────────────────
    const drawBall = (x: number, y: number, emoji: string, age: number, highlight = false) => {
      const t = Math.min(age / FLASH_FRAMES, 1);
      let scale = 1;
      let ringAlpha = 0;
      if (age >= 0 && age < FLASH_FRAMES) {
        scale = t < 0.55 ? (t / 0.55) * 1.3 : 1.3 - ((t - 0.55) / 0.45) * 0.3;
        ringAlpha = Math.max(0, 1 - t * 2.5);
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      if (ringAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.arc(2, 2, 13, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = highlight ? '#fef3c7' : '#ffffff';
      ctx.strokeStyle = highlight ? '#f59e0b' : '#1e293b';
      ctx.lineWidth = highlight ? 3 : 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    };

    const draw = () => {
      const st = S.current;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      const warningX = W * 0.85;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // ── Background ──
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, W, H);

      // Shooter zone background
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, BELT_MID_Y + 22, W, H - BELT_MID_Y - 22);

      // ── Belt rails ──
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, BELT_MID_Y - 22); ctx.lineTo(W, BELT_MID_Y - 22);
      ctx.moveTo(0, BELT_MID_Y + 22); ctx.lineTo(W, BELT_MID_Y + 22);
      ctx.stroke();

      // Animated belt slats
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
      const slat = (st.frameCount * st.speed * 0.5) % 14;
      ctx.beginPath();
      for (let x = slat; x < W; x += 14) {
        ctx.moveTo(x, BELT_MID_Y - 22); ctx.lineTo(x, BELT_MID_Y + 22);
      }
      ctx.stroke();

      // Left fade (entry)
      const lf = ctx.createLinearGradient(0, 0, 30, 0);
      lf.addColorStop(0, 'rgba(241,245,249,1)'); lf.addColorStop(1, 'rgba(241,245,249,0)');
      ctx.fillStyle = lf; ctx.fillRect(0, 0, 30, BELT_MID_Y + 22);

      // Start zone (symmetrical to danger zone)
      const startX = W * 0.15;
      const sg = ctx.createLinearGradient(0, 0, startX + 40, 0);
      sg.addColorStop(0, 'rgba(16,185,129,0.18)'); sg.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, startX + 40, BELT_MID_Y + 22);

      // Start line (symmetrical to warning line)
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, BELT_MID_Y + 22); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10b981'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('▶️', startX, 9);

      // Danger zone
      const dg = ctx.createLinearGradient(warningX - 40, 0, W, 0);
      dg.addColorStop(0, 'rgba(239,68,68,0)'); dg.addColorStop(1, 'rgba(239,68,68,0.18)');
      ctx.fillStyle = dg; ctx.fillRect(warningX - 40, 0, W - warningX + 40, BELT_MID_Y + 22);

      // Warning line
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(warningX, 0); ctx.lineTo(warningX, BELT_MID_Y + 22); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⛔', warningX, 9);

      // ── Chain items ──
      for (let i = st.items.length - 1; i >= 0; i--) {
        const item = st.items[i];
        if (item.renderX < -SPACING || item.renderX > W + SPACING) continue;
        const age = st.frameCount - item.birthFrame;
        drawBall(item.renderX, BELT_MID_Y, item.emoji, age);
      }

      // ── Aim indicator (when can shoot) ──
      if (st.gameStarted && !st.gameOver && st.canShoot && !st.shotBall) {
        const sx = st.shooterX;
        let closestItem: ChainItem | null = null;
        let closestIdx = -1;
        let minDist = Infinity;
        st.items.forEach((item, idx) => {
          if (item.renderX < -16) return;
          const d = Math.abs(sx - item.renderX);
          if (d < minDist) {
            minDist = d;
            closestItem = item;
            closestIdx = idx;
          }
        });

        const collides = closestItem && minDist <= COLLISION_RANGE;

        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = 'rgba(99,102,241,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, SHOOTER_Y - 13);

        if (collides && closestItem) {
          const aimX = sx > closestItem.renderX
            ? closestItem.renderX + SPACING / 2
            : closestItem.renderX - SPACING / 2;
          ctx.lineTo(aimX, BELT_MID_Y + 14);
          ctx.stroke();
          ctx.setLineDash([]);

          // Target gap indicator on belt
          ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 8;
          ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(aimX, BELT_MID_Y - 22);
          ctx.lineTo(aimX, BELT_MID_Y + 22);
          ctx.stroke();
        } else {
          ctx.lineTo(sx, BELT_MID_Y - 22);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Shot ball in flight ──
      if (st.shotBall) {
        const sb = st.shotBall;
        // Motion trail
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#6366f1';
        ctx.beginPath(); ctx.arc(sb.x, sb.y + 8, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.arc(sb.x, sb.y + 16, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        drawBall(sb.x, sb.y, sb.emoji, 999, false);
      }

      // ── Shooter platform & ball ──
      // Divider line
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, BELT_MID_Y + 26); ctx.lineTo(W, BELT_MID_Y + 26); ctx.stroke();

      // "NEXT" preview (top-right of shooter zone)
      const previewX = W - 32;
      ctx.fillStyle = '#64748b'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('NEXT', previewX, BELT_MID_Y + 36);
      // Preview ball (small, next to shoot)
      ctx.save();
      ctx.translate(previewX, SHOOTER_Y);
      ctx.scale(0.7, 0.7);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(st.nextEmoji, 0, 0);
      ctx.restore();

      // Shooter ball (current) - larger, animated pulse
      if (st.gameStarted && !st.gameOver) {
        const pulse = 1 + 0.05 * Math.sin(st.frameCount * 0.15);
        ctx.save();
        ctx.translate(st.shooterX, SHOOTER_Y);
        ctx.scale(pulse, pulse);

        // Glow ring
        ctx.save();
        ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Ball
        ctx.fillStyle = st.canShoot ? '#ffffff' : '#e2e8f0';
        ctx.strokeStyle = st.canShoot ? '#6366f1' : '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(st.shooterEmoji, 0, 0);
        ctx.restore();

        // Shoot hint
        if (st.canShoot) {
          ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(isChinese ? '点击发射' : 'CLICK', st.shooterX, SHOOTER_Y + 20);
        }
      }

      // ── Particles ──
      st.particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });

      // ── Start overlay ──
      if (!st.gameStarted) {
        ctx.fillStyle = 'rgba(241,245,249,0.94)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1e293b'; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🔮 祖玛消消乐', W / 2, H / 2 - 16);
        ctx.fillStyle = '#475569'; ctx.font = 'bold 8px sans-serif';
        ctx.fillText(
          isChinese ? '移动鼠标瞄准，点击发射！三个相同即消除！' : 'Move to aim, click to shoot! Match 3 to eliminate!',
          W / 2, H / 2 + 2);
        ctx.fillStyle = '#6366f1'; ctx.font = 'bold 10px sans-serif';
        ctx.fillText(isChinese ? '点击开始' : 'Click to Start', W / 2, H / 2 + 18);
      }

      // ── Game Over overlay ──
      if (st.gameOver) {
        ctx.fillStyle = 'rgba(241,245,249,0.95)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💥 GAME OVER', W / 2, H / 2 - 10);
        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 9px sans-serif';
        ctx.fillText(
          isChinese ? `得分: ${st.score}  最高: ${highScore}  点击或空格重试`
                    : `Score: ${st.score}  Best: ${highScore}  Click or Space`,
          W / 2, H / 2 + 12);
      }

      // ── Pause overlay ──
      if (isPausedRef.current && st.gameStarted && !st.gameOver) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; // slate-900 with 0.65 opacity
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isChinese ? '⏸️ 游戏暂停' : '⏸️ PAUSED', W / 2, H / 2 - 12);

        ctx.fillStyle = '#cbd5e1'; // slate-300
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText(
          isChinese ? 'AI 已完成回复，即将收起...' : 'AI replied, closing soon...',
          W / 2, H / 2 + 10
        );
      }

      ctx.restore();
    };

    const loop = () => { update(); draw(); animId = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [gameStarted, emojis, highScore, isChinese]);

  // Canvas DPR setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.getBoundingClientRect().width * dpr;
    canvas.height = 140 * dpr;
  }, []);

  // Save state on pause/unpause
  useEffect(() => {
    if (isPaused) {
      saveGameState();
    }
  }, [isPaused]);

  // Toast when resuming without unmounting
  const prevPausedVal = useRef(isPaused);
  useEffect(() => {
    if (prevPausedVal.current && !isPaused && gameStarted && !gameOver) {
      showResumeToast();
    }
    prevPausedVal.current = isPaused;
  }, [isPaused, gameStarted, gameOver]);

  return (
    <div className="w-full relative border-y-4 border-black select-none pointer-events-auto h-[140px] overflow-hidden bg-slate-100">
      <button
        onClick={onClose}
        className="absolute top-1.5 right-2 z-20 w-5 h-5 rounded-full border-2 border-black bg-white hover:bg-red-50 flex items-center justify-center text-[9px] font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
      >✕</button>

      <div className="absolute top-1.5 left-3 z-20 flex gap-3 text-[9px] font-black text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-black/20 shadow-sm">
        <span>SCORE: {score}</span>
        <span className="text-slate-400">BEST: {highScore}</span>
      </div>

      {comboText && (
        <div className="absolute top-6 left-3 z-20 bg-indigo-500 text-white font-black text-[8px] px-2 py-0.5 rounded-md border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] animate-bounce">
          {comboText}
        </div>
      )}

      {resumeText && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-emerald-500 text-white font-black text-[10px] px-3.5 py-1 rounded-xl border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] animate-scaleUp">
            {resumeText}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        className="w-full h-[140px] cursor-crosshair"
        style={{ display: 'block' }}
      />
    </div>
  );
};
