import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { generateCharacterResponse, generateSpeech, decodeAndPlayAudio } from '../services/gemini';
import { Contact } from '../types';
import { useLanguage } from '../lib/language-context';

interface PenaltyShootoutGameProps {
    onBack: () => void;
    userAvatar: string;
    contacts: Contact[];
    onRewardCoins: (amount: number) => void;
}

type GamePhase = 'select' | 'ready' | 'dive' | 'kick' | 'result' | 'gameover';
type ShotDirection = 'left' | 'center' | 'right';

const LOCAL_TRANS = {
  English: {
    title: 'Penalty Shootout',
    subtitle: 'Show your goalkeeper skills against the team!',
    selectOpp: 'Choose AI Shooter...',
    saves: 'Saves',
    goals: 'Goals Conceded',
    score: 'Score',
    round: 'Round',
    diveLeft: '🧤 Dive Left',
    diveRight: '🧤 Dive Right',
    stayCenter: '🧤 Stay Center',
    btnBack: 'BACK TO LOBBY',
    btnPlayAgain: 'PLAY AGAIN',
    startText: 'Kickoff! Defend the goal!',
    saveMsg: '🧤 GREAT SAVE!',
    goalMsg: '🥅 GOAL!',
    winTitle: '🏆 MATCH WON!',
    loseTitle: '💀 MATCH LOST!',
    winDesc: 'You saved {saves}/{total} shots. Reward: {coins} TT Coins!',
    loseDesc: 'You only saved {saves}/{total} shots. Keep practicing!',
    waitingKicker: 'AI preparing shot...',
    instruction: '⌨️ Arrow keys ⬅️ ⬇️ ➡️ / Click buttons to save the balls on the beat! ⚽🧤',
  },
  '简体中文': {
    title: '世界杯点球大战',
    subtitle: '展现你的守门技术，扑出AI对手的射门！',
    selectOpp: '选择你的AI点球手...',
    saves: '扑出',
    goals: '失球',
    score: '比分',
    round: '轮次',
    diveLeft: '🧤 扑向左侧',
    diveRight: '🧤 扑向右侧',
    stayCenter: '🧤 守在中间',
    btnBack: '返回大厅',
    btnPlayAgain: '再玩一次',
    startText: '比赛开始！守住球门！',
    saveMsg: '🧤 精彩扑救！',
    goalMsg: '🥅 球进了！',
    winTitle: '🏆 赢得比赛！',
    loseTitle: '💀 输掉比赛！',
    winDesc: '你成功扑出了 {saves}/{total} 次射门。奖励：{coins} TT 币！',
    loseDesc: '你只扑出了 {saves}/{total} 次射门。继续加油！',
    waitingKicker: '点球手准备中...',
    instruction: '⌨️ 键盘方向键 ⬅️ ⬇️ ➡️ / 点击按钮，跟着节拍扑出足球！⚽🧤',
  },
  '日本語': {
    title: 'ペナルティシュートアウト',
    subtitle: 'ゴールキーパーのスキルを見せつけろ！',
    selectOpp: 'キッカーとなるAIを選択...',
    saves: 'セーブ',
    goals: 'ゴール',
    score: 'スコア',
    round: 'ラウンド',
    diveLeft: '🧤 左に飛ぶ',
    diveRight: '🧤 右に飛ぶ',
    stayCenter: '🧤 中央を死守',
    btnBack: 'ロビーに戻る',
    btnPlayAgain: 'もう一度プレイ',
    startText: 'キックオフ！ゴールを守れ！',
    saveMsg: '🧤 ナイスセーブ！',
    goalMsg: '🥅 ゴール！',
    winTitle: '🏆 試合勝利！',
    loseTitle: '💀 敗北...',
    winDesc: '{total}回中 {saves} 回セーブしました！報酬: {coins} TT コイン！',
    loseDesc: '{total}回中 {saves} 回しかセーブできませんでした。練習あるのみ！',
    waitingKicker: 'AIが准备中...',
    instruction: '⌨️ 矢印キー ⬅️ ⬇️ ➡️ / ボタンをクリックして、リズムに合わせてボールをセーブしよう！⚽🧤',
  },
  'Español': {
    title: 'Tanda de Penaltis',
    subtitle: '¡Demuestra tus habilidades de portero contra el equipo!',
    selectOpp: 'Elige al tirador de IA...',
    saves: 'Paradas',
    goals: 'Goles',
    score: 'Marcador',
    round: 'Ronda',
    diveLeft: '🧤 Tirarse a la Izquierda',
    diveRight: '🧤 Tirarse a la Derecha',
    stayCenter: '🧤 Quedarse en el Centro',
    btnBack: 'VOLVER AL LOBBY',
    btnPlayAgain: 'JUGAR DE NUEVO',
    startText: '¡Comienza el partido! ¡Defiende el arco!',
    saveMsg: '🧤 ¡GRAN PARADA!',
    goalMsg: '🥅 ¡GOL!',
    winTitle: '🏆 ¡PARTIDO GANADO!',
    loseTitle: '💀 ¡PARTIDO PERDIDO!',
    winDesc: 'Salvaste {saves}/{total} tiros. ¡Recompensa: {coins} TT monedas!',
    loseDesc: 'Solo salvaste {saves}/{total} tiros. ¡Sigue practicando!',
    waitingKicker: 'IA preparando tiro...',
    instruction: '⌨️ Teclas de flecha ⬅️ ⬇️ ➡️ / ¡Haz clic en los botones para parar los balones al ritmo! ⚽🧤',
  },
  'Français': {
    title: 'Tirs au But',
    subtitle: 'Montrez vos talents de gardien contre l\'équipe !',
    selectOpp: 'Choisissez le tireur IA...',
    saves: 'Arrêts',
    goals: 'Buts',
    score: 'Score',
    round: 'Round',
    diveLeft: '🧤 Plonger à Gauche',
    diveRight: '🧤 Plonger à Droite',
    stayCenter: '🧤 Rester au Centre',
    btnBack: 'RETOUR AU LOBBY',
    btnPlayAgain: 'REJOUER',
    startText: 'Coup d\'envoi ! Défendez le but !',
    saveMsg: '🧤 BEL ARRÊT !',
    goalMsg: '🥅 BUT !',
    winTitle: '🏆 MATCH GAGNÉ !',
    loseTitle: '💀 MATCH PERDU !',
    winDesc: 'Vous avez arrêté {saves}/{total} tirs. Récompense : {coins} TT Coins !',
    loseDesc: 'Vous n\'avez arrêté que {saves}/{total} tirs. Continuez à vous entraîner !',
    waitingKicker: 'L\'IA se prépare...',
    instruction: '⌨️ Touches fléchées ⬅️ ⬇️ ➡️ / Cliquez sur les boutons pour arrêter les ballons en rythme ! ⚽🧤',
  }
};

// --- Web Audio Synthesizer ---
const createSoundEngine = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass() as AudioContext;

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    const playNoise = (duration: number, vol = 0.1) => {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    };

    const playKickAt = (time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
    };

    const playSnareAt = (time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(550, time);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.08);
    };

    const playMelodyNoteAt = (freq: number, time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.035, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
    };

    return {
        whistle: () => {
            playTone(950, 'sine', 0.15, 0.08);
            setTimeout(() => playTone(950, 'sine', 0.3, 0.08), 180);
        },
        kick: () => {
            playTone(70, 'sine', 0.15, 0.3);
            playTone(130, 'triangle', 0.1, 0.15);
        },
        save: () => {
            playTone(280, 'triangle', 0.1, 0.25);
            playTone(550, 'sine', 0.06, 0.15);
        },
        goal: () => {
            playNoise(0.9, 0.2);
            playTone(110, 'sawtooth', 0.5, 0.05);
        },
        win: () => {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                setTimeout(() => playTone(freq, 'triangle', 0.4, 0.1), i * 120);
            });
        },
        lose: () => {
            playTone(160, 'sawtooth', 0.9, 0.15);
        },
        resume: () => {
            if (ctx.state === 'suspended') ctx.resume();
        },
        playKickAt,
        playSnareAt,
        playMelodyNoteAt,
        ctx
    };
};

export interface RhythmNote {
    id: number;
    direction: ShotDirection; // 'left' | 'center' | 'right'
    hitTime: number; // timestamp in ms when note aligns with hit zone
    evaluated: boolean;
    result?: 'perfect' | 'wrong' | 'miss';
}

export interface ActiveShot {
    noteId: number;
    kicker: Contact;
    direction: ShotDirection;
    keeperTargetX: number;
    startTime: number;
    duration: number;
    isSaved: boolean;
    phase: 'flight' | 'result';
    resultShowTime: number;
}

export const PenaltyShootoutGame: React.FC<PenaltyShootoutGameProps> = ({ onBack, userAvatar, contacts, onRewardCoins }) => {
    const { language } = useLanguage();
    const t = LOCAL_TRANS[language as keyof typeof LOCAL_TRANS] || LOCAL_TRANS.English;

    const [phase, setPhase] = useState<GamePhase>('select');
    const [selectedOpponent, setSelectedOpponent] = useState<Contact | null>(null);
    const [kickerList, setKickerList] = useState<Contact[]>([]);
    const [currentKickerIndex, setCurrentKickerIndex] = useState(0);
    const [saves, setSaves] = useState(0);
    const [goalsConceded, setGoalsConceded] = useState(0);
    const [round, setRound] = useState(0); // 0-4
    const [toast, setToast] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);

    // Dynamic Comments
    const [aiSpeechText, setAiSpeechText] = useState<string>('');
    const [aiSpeechAudio, setAiSpeechAudio] = useState<string | null>(null);
    const [aiSpeechVisible, setAiSpeechVisible] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const soundRef = useRef<ReturnType<typeof createSoundEngine> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastQuoteRequestId = useRef<number>(0);

    const keeperXRef = useRef<number>(400);
    const kickerXRef = useRef<number>(400);
    const shotStartXRef = useRef<number>(400);
    const shotTargetXRef = useRef<number>(400);
    const isSavedRef = useRef<boolean>(false);
    const phaseRef = useRef<GamePhase>(phase);
    
    // Rhythm refs
    const notesRef = useRef<RhythmNote[]>([]);
    const activeShotRef = useRef<ActiveShot | null>(null);
    const bgmTimeoutRef = useRef<any>(null);
    const beatIndexRef = useRef<number>(0);
    const isMutedRef = useRef<boolean>(isMuted);
    const hitFeedbackRef = useRef<{ text: string; color: string; time: number } | null>(null);

    const savesRef = useRef<number>(0);
    const goalsConcededRef = useRef<number>(0);
    const roundRef = useRef<number>(0);

    // Custom song and beat detection states/refs
    const totalNotesRef = useRef<number>(24);
    const [totalNotesState, setTotalNotesState] = useState<number>(24);
    const isCustomSongRef = useRef<boolean>(false);
    const customAudioBufferRef = useRef<AudioBuffer | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioGainNodeRef = useRef<GainNode | null>(null);
    const customBeatTimestampsRef = useRef<number[]>([]);
    
    const [customSongName, setCustomSongName] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    // Dynamic mute handler for custom source and synthesizer BGM
    useEffect(() => {
        isMutedRef.current = isMuted;
        if (audioGainNodeRef.current) {
            audioGainNodeRef.current.gain.value = isMuted ? 0 : 1;
        }
    }, [isMuted]);

    // Client-side beat transient analyzer using average local energy thresholds
    const detectBeats = (audioBuffer: AudioBuffer): number[] => {
        const rawData = audioBuffer.getChannelData(0); // Left channel analysis
        const sampleRate = audioBuffer.sampleRate;
        const blockSize = 2048;
        const numBlocks = Math.floor(rawData.length / blockSize);
        const blockEnergies: number[] = [];

        for (let i = 0; i < numBlocks; i++) {
            let sum = 0;
            const offset = i * blockSize;
            for (let j = 0; j < blockSize; j++) {
                sum += rawData[offset + j] * rawData[offset + j];
            }
            blockEnergies.push(Math.sqrt(sum / blockSize));
        }

        const windowSize = 25; // ~1.1 second local average window
        const threshold = 1.32; // peak multiplier trigger
        const beatTimes: number[] = [];

        for (let i = windowSize; i < blockEnergies.length - windowSize; i++) {
            let localSum = 0;
            for (let w = -windowSize; w <= windowSize; w++) {
                localSum += blockEnergies[i + w];
            }
            const localAverage = localSum / (windowSize * 2 + 1);

            if (
                blockEnergies[i] > localAverage * threshold &&
                blockEnergies[i] > blockEnergies[i - 1] &&
                blockEnergies[i] > blockEnergies[i + 1]
            ) {
                const beatTimeSec = (i * blockSize) / sampleRate;
                beatTimes.push(beatTimeSec);
                i += Math.floor((0.35 * sampleRate) / blockSize); // min 350ms spacing
            }
        }

        // Fallback: if silent or slow song, generate beats every 1.8s
        if (beatTimes.length === 0) {
            for (let t = 2.0; t < audioBuffer.duration - 2.0; t += 1.8) {
                beatTimes.push(t);
            }
        }

        // Cap to 60 notes max to maintain playable level length
        if (beatTimes.length > 60) {
            return beatTimes.slice(0, 60);
        }

        return beatTimes;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setCustomSongName(file.name);
        try {
            const arrayBuffer = await file.arrayBuffer();
            // Use a clean temporary AudioContext to decode audio data at its native sample rate
            const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
            await tempCtx.close();
            
            customAudioBufferRef.current = decodedBuffer;
            const detected = detectBeats(decodedBuffer);
            customBeatTimestampsRef.current = detected;
            isCustomSongRef.current = true;

            showToast("🎵 RHYTHM CHART GENERATED!");
        } catch (err) {
            console.error("Error decoding custom audio file:", err);
            showToast("❌ DECODE ERROR. TRY ANOTHER FILE");
            setCustomSongName(null);
            isCustomSongRef.current = false;
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    const triggerShot = (note: RhythmNote, keeperDir: ShotDirection | null, isSaved: boolean) => {
        let keeperTargetX = 400;
        if (keeperDir === 'left') keeperTargetX = 220;
        if (keeperDir === 'right') keeperTargetX = 580;
        if (keeperDir === 'center') keeperTargetX = 400;

        let ballTargetX = 400;
        if (note.direction === 'left') ballTargetX = 220;
        if (note.direction === 'right') ballTargetX = 580;
        if (note.direction === 'center') ballTargetX = 400;

        // Trigger kick sound
        playSound('kick');

        const kicker = kickerList[note.id] || selectedOpponent || contacts[0];

        activeShotRef.current = {
            noteId: note.id,
            kicker,
            direction: note.direction,
            keeperTargetX,
            startTime: Date.now(),
            duration: 600,
            isSaved,
            phase: 'flight',
            resultShowTime: 0
        };

        // Trigger kicker response
        if (isSaved) {
            setTimeout(() => triggerAiQuote(kicker, `The goalkeeper just saved your penalty kick. Show dejection and respect in 1 sentence.`), 700);
        } else {
            setTimeout(() => triggerAiQuote(kicker, `You successfully scored a goal past the goalkeeper. Show celebration and brag in 1 sentence.`), 700);
        }
    };

    const handleGameInput = (pressedDir: ShotDirection) => {
        if (phaseRef.current !== 'ready') return;

        const now = Date.now();
        // Find the closest unevaluated note
        const activeNote = notesRef.current.find(n => !n.evaluated);
        if (!activeNote) return;

        // Check window
        const timeDiff = now - activeNote.hitTime;
        const windowLimit = 280; // +/- 280ms

        if (Math.abs(timeDiff) <= windowLimit) {
            activeNote.evaluated = true;
            if (pressedDir === activeNote.direction) {
                // Save!
                activeNote.result = 'perfect';
                savesRef.current += 1;
                setSaves(savesRef.current);
                showToast(t.saveMsg || "GREAT SAVE! 🧤");
                hitFeedbackRef.current = { text: 'PERFECT!', color: '#ffeb3b', time: now };
                triggerShot(activeNote, pressedDir, true);
            } else {
                // Goal! Wrong key
                activeNote.result = 'wrong';
                goalsConcededRef.current += 1;
                setGoalsConceded(goalsConcededRef.current);
                showToast(t.goalMsg || "GOAL! 🥅");
                hitFeedbackRef.current = { text: 'WRONG!', color: '#ff3d00', time: now };
                triggerShot(activeNote, pressedDir, false);
            }
        }
    };

    // Keyboard controls listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phaseRef.current === 'ready') {
                if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
                    e.preventDefault();
                    handleGameInput('left');
                } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
                    e.preventDefault();
                    handleGameInput('center');
                } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
                    e.preventDefault();
                    handleGameInput('right');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleExit = () => {
        if (bgmTimeoutRef.current) {
            clearTimeout(bgmTimeoutRef.current);
            bgmTimeoutRef.current = null;
        }
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop();
            } catch (e) {}
            audioSourceRef.current = null;
        }
        stopAllSpeech();
        onBack();
    };

    // Assets Preloading
    const [userImg, setUserImg] = useState<HTMLImageElement | null>(null);
    const [kickerImgs, setKickerImgs] = useState<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        soundRef.current = createSoundEngine();
        
        // Preload user avatar
        const img = new Image();
        img.src = userAvatar;
        img.onload = () => setUserImg(img);

        return () => {
            audioContextRef.current?.close();
            if (bgmTimeoutRef.current) {
                clearTimeout(bgmTimeoutRef.current);
            }
            if (audioSourceRef.current) {
                try {
                    audioSourceRef.current.stop();
                } catch (e) {}
            }
        };
    }, [userAvatar]);

    const getAudioContext = () => {
        if (soundRef.current?.ctx) {
            if (soundRef.current.ctx.state === 'suspended') {
                soundRef.current.ctx.resume();
            }
            return soundRef.current.ctx;
        }
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const playSound = (name: 'whistle' | 'kick' | 'save' | 'goal' | 'win' | 'lose') => {
        if (isMuted || !soundRef.current) return;
        soundRef.current.resume();
        soundRef.current[name]();
    };

    const playAudioBase64 = (base64: string) => {
        if (!base64 || isMuted) return;
        const ctx = getAudioContext();
        decodeAndPlayAudio(base64, ctx);
    };

    const stopAllSpeech = () => {
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    const showToast = (msg: string, duration = 1800) => {
        setToast(msg);
        setTimeout(() => setToast(null), duration);
    };

    // AI dynamic commentary handler
    const triggerAiQuote = async (opp: Contact, context: string) => {
        const requestId = ++lastQuoteRequestId.current;
        setIsAiThinking(true);
        setAiSpeechVisible(false);
        try {
            const promptContext = `[Penalty Shootout Game Context]: You are the shooter. ${context} Target language: ${language || 'English'}. Reply in 1 sentence matching your species/persona.`;
            const resp = await generateCharacterResponse(
                opp.species!,
                opp.name,
                opp.persona!,
                promptContext,
                [],
                'extremely concise, 1 short sentence'
            );

            if (requestId !== lastQuoteRequestId.current) return;

            const text = typeof resp === 'string' ? resp : (resp.translation || '');
            setAiSpeechText(text);
            setAiSpeechVisible(true);
            setIsAiThinking(false);

            if (!isMuted && text) {
                const audio = await generateSpeech(text, opp.species!, opp.persona!, 4, opp.aiBrain?.ttsVoice, opp.aiBrain, resp.raw_sound);
                if (requestId !== lastQuoteRequestId.current) return;
                if (audio) {
                    setAiSpeechAudio(audio);
                    playAudioBase64(audio);
                }
            }
        } catch (e) {
            console.error("Failed to generate AI shooter speech", e);
            if (requestId === lastQuoteRequestId.current) {
                setIsAiThinking(false);
            }
        }
    };

    const handleSelectOpponent = (opp: Contact) => {
        setSelectedOpponent(opp);
        
        // Compile a sequence of kickers to cycle indefinitely starting with the selected opponent
        const otherAis = contacts.filter(c => !c.isGroup && c.isAi && c.id !== opp.id);
        const sequence = [opp, ...otherAis];

        setKickerList(sequence);
        setCurrentKickerIndex(0);
        setSaves(0);
        setGoalsConceded(0);
        setRound(0);
        savesRef.current = 0;
        goalsConcededRef.current = 0;
        roundRef.current = 0;

        isSavedRef.current = false;
        kickerXRef.current = 400;
        shotStartXRef.current = 400;
        shotTargetXRef.current = 400;
        keeperXRef.current = 400;
        activeShotRef.current = null;
        hitFeedbackRef.current = null;

        // Clear notes and reset beat index
        notesRef.current = [];
        beatIndexRef.current = 0;

        setPhase('ready');
        phaseRef.current = 'ready';

        // Clear BGM timeouts or audio nodes
        if (bgmTimeoutRef.current) {
            clearTimeout(bgmTimeoutRef.current);
            bgmTimeoutRef.current = null;
        }
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop();
            } catch (e) {}
            audioSourceRef.current = null;
        }

        const directions: ShotDirection[] = ['left', 'center', 'right'];

        if (isCustomSongRef.current && customAudioBufferRef.current) {
            // PLAY CUSTOM SONG MODE
            const leadIn = 1500;
            const now = Date.now();
            let noteId = 0;

            for (let i = 0; i < customBeatTimestampsRef.current.length; i++) {
                const beatTimeSec = customBeatTimestampsRef.current[i];
                
                // Randomly generate combos of 2 or 3 notes to increase game difficulty
                const rand = Math.random();
                if (rand < 0.15 && i + 2 < customBeatTimestampsRef.current.length) {
                    // 3-note combo spaced 350ms apart
                    for (let k = 0; k < 3; k++) {
                        const randDir = directions[Math.floor(Math.random() * directions.length)];
                        notesRef.current.push({
                            id: noteId++,
                            direction: randDir,
                            hitTime: now + leadIn + beatTimeSec * 1000 + k * 350,
                            evaluated: false
                        });
                    }
                    i += 2; // skip next beats to prevent overcrowding
                } else if (rand < 0.35 && i + 1 < customBeatTimestampsRef.current.length) {
                    // 2-note combo spaced 350ms apart
                    for (let k = 0; k < 2; k++) {
                        const randDir = directions[Math.floor(Math.random() * directions.length)];
                        notesRef.current.push({
                            id: noteId++,
                            direction: randDir,
                            hitTime: now + leadIn + beatTimeSec * 1000 + k * 350,
                            evaluated: false
                        });
                    }
                    i += 1;
                } else {
                    // Single note
                    const randDir = directions[Math.floor(Math.random() * directions.length)];
                    notesRef.current.push({
                        id: noteId++,
                        direction: randDir,
                        hitTime: now + leadIn + beatTimeSec * 1000,
                        evaluated: false
                    });
                }
            }

            const totalNotes = notesRef.current.length;
            totalNotesRef.current = totalNotes;
            setTotalNotesState(totalNotes);

            // Start AudioBufferSourceNode playback
            const ctx = getAudioContext();
            const source = ctx.createBufferSource();
            source.buffer = customAudioBufferRef.current;
            
            // Gain Node for dynamic muting
            const gain = ctx.createGain();
            gain.gain.value = isMutedRef.current ? 0 : 1;
            source.connect(gain);
            gain.connect(ctx.destination);
            
            audioSourceRef.current = source;
            audioGainNodeRef.current = gain;

            // Start playing after 1.5 seconds
            source.start(ctx.currentTime + 1.5);
        } else {
            // DEFAULT MODE: "WE WILL ROCK YOU" (synthesized BGM, 12 bars total)
            const bpm = 82;
            const subBeatDuration = 60000 / (bpm * 2); // 365.85ms per eighth note
            const maxSubBeats = 96; // 12 bars total

            const now = Date.now();
            let noteId = 0;

            // Pre-generate default level notes with combos
            for (let subBeatIdx = 0; subBeatIdx < maxSubBeats; subBeatIdx++) {
                const pos = subBeatIdx % 8;
                if (subBeatIdx + 4 >= maxSubBeats) continue;

                if (pos === 2 || pos === 6) {
                    const rand = Math.random();
                    if (rand < 0.15 && subBeatIdx + 6 < maxSubBeats) {
                        // 3-note combo: spawn at current, current + 1, current + 2
                        for (let k = 0; k < 3; k++) {
                            const randDir = directions[Math.floor(Math.random() * directions.length)];
                            notesRef.current.push({
                                id: noteId++,
                                direction: randDir,
                                hitTime: now + (subBeatIdx + k) * subBeatDuration + subBeatDuration * 4,
                                evaluated: false
                            });
                        }
                        subBeatIdx += 2;
                    } else if (rand < 0.35 && subBeatIdx + 5 < maxSubBeats) {
                        // 2-note combo: spawn at current, current + 1
                        for (let k = 0; k < 2; k++) {
                            const randDir = directions[Math.floor(Math.random() * directions.length)];
                            notesRef.current.push({
                                id: noteId++,
                                direction: randDir,
                                hitTime: now + (subBeatIdx + k) * subBeatDuration + subBeatDuration * 4,
                                evaluated: false
                            });
                        }
                        subBeatIdx += 1;
                    } else {
                        // Single note
                        const randDir = directions[Math.floor(Math.random() * directions.length)];
                        notesRef.current.push({
                            id: noteId++,
                            direction: randDir,
                            hitTime: now + subBeatIdx * subBeatDuration + subBeatDuration * 4,
                            evaluated: false
                        });
                    }
                }
            }

            const totalNotes = notesRef.current.length;
            totalNotesRef.current = totalNotes;
            setTotalNotesState(totalNotes);

            const scheduleWeWillRockYou = () => {
                if (phaseRef.current !== 'ready') return;

                const subBeatIdx = beatIndexRef.current;
                const bar = Math.floor(subBeatIdx / 8);
                const pos = subBeatIdx % 8;

                if (!isMutedRef.current && soundRef.current) {
                    soundRef.current.resume();
                    const ctx = soundRef.current.ctx;
                    const time = ctx.currentTime;

                    // Play Boom Boom Clap, rest, Boom Boom Clap, rest
                    if (pos === 0 || pos === 1 || pos === 4 || pos === 5) {
                        soundRef.current.playKickAt(time);
                    } else if (pos === 2 || pos === 6) {
                        soundRef.current.playSnareAt(time); // Snare/Clap
                    }

                    // Vocal chorus melody: "We will, we will rock you"
                    if (bar % 2 === 0 && bar < 12) {
                        if (pos === 0) soundRef.current.playMelodyNoteAt(440.00, time); // "We" (A4)
                        if (pos === 2) soundRef.current.playMelodyNoteAt(369.99, time); // "will" (F#4)
                        if (pos === 4) soundRef.current.playMelodyNoteAt(440.00, time); // "we" (A4)
                        if (pos === 6) soundRef.current.playMelodyNoteAt(369.99, time); // "will" (F#4)
                    } else if (bar % 2 === 1 && bar < 12) {
                        if (pos === 0) soundRef.current.playMelodyNoteAt(329.63, time); // "rock" (E4)
                        if (pos === 2) soundRef.current.playMelodyNoteAt(293.66, time); // "you" (D4)
                    }
                }

                beatIndexRef.current += 1;
                if (beatIndexRef.current < maxSubBeats) {
                    bgmTimeoutRef.current = setTimeout(scheduleWeWillRockYou, subBeatDuration);
                }
            };

            // Start synthesized song loop
            scheduleWeWillRockYou();
        }

        // Preload shooter avatars
        sequence.forEach(kicker => {
            if (!kickerImgs[kicker.id]) {
                const img = new Image();
                img.src = kicker.avatarUrl;
                img.onload = () => {
                    setKickerImgs(prev => ({ ...prev, [kicker.id]: img }));
                };
            }
        });

        setTimeout(() => {
            playSound('whistle');
            triggerAiQuote(opp, `Match starting. You are kicking round 1. Say something to intimidate the goalkeeper.`);
        }, 800);
    };

    // Canvas animation logic
    useEffect(() => {
        if (phase === 'select' || phase === 'gameover' || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animFrameId: number;

        const width = canvas.width;
        const height = canvas.height;

        const goalLeft = 180;
        const goalRight = 620;
        const goalTop = 90;
        const goalBottom = 230;

        const keeperY = 190;

        // Particle System
        const particles: Array<{x: number, y: number, vx: number, vy: number, color: string, size: number, type: string, life: number}> = [];
        const createExplosion = (x: number, y: number, color: string, type = 'square', count = 15) => {
            for (let i = 0; i < count; i++) {
                particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6 - 2,
                    color,
                    size: Math.random() * 4 + 2,
                    type,
                    life: 1.0
                });
            }
        };

        const drawStadium = () => {
            // Pitch grass stripes
            for (let i = 0; i < height; i += 40) {
                ctx.fillStyle = (i / 40) % 2 === 0 ? '#27ae60' : '#2ecc71';
                ctx.fillRect(0, i, width, 40);
            }

            // Penalty box lines
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 4;
            
            // Penalty box outer boundary
            ctx.beginPath();
            ctx.moveTo(goalLeft - 80, goalBottom);
            ctx.lineTo(goalLeft - 80, height - 120);
            ctx.lineTo(goalRight + 80, height - 120);
            ctx.lineTo(goalRight + 80, goalBottom);
            ctx.stroke();

            // Goal area inner boundary
            ctx.beginPath();
            ctx.moveTo(goalLeft - 20, goalBottom);
            ctx.lineTo(goalLeft - 20, goalBottom + 50);
            ctx.lineTo(goalRight + 20, goalBottom + 50);
            ctx.lineTo(goalRight + 20, goalBottom);
            ctx.stroke();

            // Penalty Spot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(width / 2, height - 80, 6, 0, Math.PI * 2);
            ctx.fill();

            // Goal Net back anchors & perspective net grids
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            
            const netBackY = goalTop - 15;
            const netBackLeft = goalLeft + 15;
            const netBackRight = goalRight - 15;

            // Draw net cells
            for (let x = goalLeft; x <= goalRight; x += 15) {
                ctx.beginPath();
                ctx.moveTo(x, goalTop);
                const prop = (x - goalLeft) / (goalRight - goalLeft);
                const backX = netBackLeft + prop * (netBackRight - netBackLeft);
                ctx.lineTo(backX, netBackY);
                ctx.lineTo(backX, goalBottom - 5);
                ctx.stroke();
            }

            for (let y = goalTop; y <= goalBottom; y += 15) {
                const propY = (y - goalTop) / (goalBottom - goalTop);
                const currentY = goalTop + propY * (goalBottom - goalTop);
                ctx.beginPath();
                ctx.moveTo(goalLeft + propY * 15, currentY);
                ctx.lineTo(goalRight - propY * 15, currentY);
                ctx.stroke();
            }

            // Outer Net boundary outline
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.moveTo(goalLeft, goalTop);
            ctx.lineTo(netBackLeft, netBackY);
            ctx.lineTo(netBackRight, netBackY);
            ctx.lineTo(goalRight, goalTop);
            ctx.closePath();
            ctx.fill();

            // White Goalpost frames
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(goalLeft, goalBottom);
            ctx.lineTo(goalLeft, goalTop);
            ctx.lineTo(goalRight, goalTop);
            ctx.lineTo(goalRight, goalBottom);
            ctx.stroke();
        };

        const drawGoalkeeper = () => {
            let keeperAngle = 0;
            let displayY = keeperY;
            const activeShot = activeShotRef.current;

            if (activeShot && activeShot.phase === 'result') {
                if (activeShot.isSaved) {
                    // Bounce up and down
                    displayY = keeperY - Math.abs(Math.sin(Date.now() / 100) * 15);
                    keeperAngle = Math.sin(Date.now() / 80) * 0.15;
                } else {
                    // Fall down (conceded goal)
                    keeperAngle = Math.PI; // upside down
                    displayY = keeperY + 15;
                }
            } else {
                // Tilt based on position relative to center
                const diff = keeperXRef.current - 400;
                if (Math.abs(diff) > 20) {
                    keeperAngle = (diff > 0 ? 0.25 : -0.25) * (Math.abs(diff) / 180);
                }
            }

            ctx.save();
            ctx.translate(keeperXRef.current, displayY);
            ctx.rotate(keeperAngle);

            // Goalkeeper Avatar Head (Circular clipping)
            if (userImg) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, 32, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(userImg, -32, -32, 64, 64);
                ctx.restore();
            }

            // Head frame outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        };

        const drawKicker = () => {
            const activeKicker = kickerList[roundRef.current] || selectedOpponent;
            if (!activeKicker) return;

            const currentKickerX = width / 2;
            let currentKickerY = height - 40;
            let kickerYOffset = 0;

            const activeShot = activeShotRef.current;
            if (activeShot) {
                if (activeShot.phase === 'flight') {
                    kickerYOffset = Math.sin(Date.now() / 50) * 12;
                    currentKickerY = (height - 40) - 25;
                } else {
                    currentKickerY = (height - 40) - 25;
                }
            }

            // Draw circular avatar kicker
            const img = kickerImgs[activeKicker.id];
            if (img) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(currentKickerX, currentKickerY + kickerYOffset, 32, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, currentKickerX - 32, currentKickerY + kickerYOffset - 32, 64, 64);
                ctx.restore();
            }

            // Outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(currentKickerX, currentKickerY + kickerYOffset, 32, 0, Math.PI * 2);
            ctx.stroke();

            // Kicker label tag
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(currentKickerX - 50, currentKickerY + kickerYOffset + 40, 100, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(activeKicker.name.toUpperCase(), currentKickerX, currentKickerY + kickerYOffset + 52);
        };

        const drawBall = () => {
            const ballStartY = height - 80;
            let ballX = width / 2;
            let ballY = ballStartY;
            let ballScale = 1.0;

            const activeShot = activeShotRef.current;
            if (activeShot) {
                const now = Date.now();
                let ballTargetX = 400;
                if (activeShot.direction === 'left') ballTargetX = 220;
                if (activeShot.direction === 'right') ballTargetX = 580;

                if (activeShot.phase === 'flight') {
                    const progress = Math.min(1.0, (now - activeShot.startTime) / activeShot.duration);
                    ballX = width / 2 + (ballTargetX - width / 2) * progress;
                    ballY = ballStartY + (goalTop + 50 - ballStartY) * progress;
                    ballScale = 1.0 - 0.6 * progress;

                    // Add grass particles
                    if (progress < 0.2) {
                        particles.push({
                            x: ballX + (Math.random() - 0.5) * 15,
                            y: ballY + 10,
                            vx: (Math.random() - 0.5) * 4,
                            vy: -Math.random() * 3 - 1,
                            color: '#27ae60',
                            size: Math.random() * 3 + 1,
                            type: 'square',
                            life: 0.8
                        });
                    }
                } else {
                    // Result phase
                    const resultElapsed = now - activeShot.resultShowTime;
                    if (activeShot.isSaved) {
                        // Deflect ball outwards
                        const deflectDir = activeShot.direction === 'left' ? -1 : 1;
                        ballX = ballTargetX + deflectDir * resultElapsed * 0.12;
                        ballY = (goalTop + 50) + resultElapsed * 0.08;
                        ballScale = 0.45;
                    } else {
                        // Stays inside the net
                        ballX = ballTargetX;
                        ballY = goalTop + 45;
                        ballScale = 0.35;
                    }
                }
            }

            // Draw soccer ball with scale
            ctx.save();
            ctx.translate(ballX, ballY);
            ctx.scale(ballScale, ballScale);
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.rotate(Date.now() / 70);
            ctx.fillText('⚽', 0, 0);
            ctx.restore();
        };

        const updateAndDrawParticles = () => {
            particles.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // Gravity
                p.life -= 0.025;

                if (p.life <= 0) {
                    particles.splice(idx, 1);
                    return;
                }

                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;

                if (p.type === 'star') {
                    ctx.font = `${p.size * 3}px sans-serif`;
                    ctx.fillText('✨', p.x, p.y);
                } else {
                    ctx.fillRect(p.x, p.y, p.size, p.size);
                }
                ctx.restore();
            });
        };

        const drawNoteTrack = () => {
            const trackY = 30;
            const trackHeight = 44;
            const trackWidth = 700;
            const trackX = (width - trackWidth) / 2;

            // Draw track background (dark glassmorphism)
            ctx.save();
            ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(trackX, trackY, trackWidth, trackHeight, 14);
            ctx.fill();
            ctx.stroke();

            // Draw static faint guides inside the Hit Zone for visual reference
            const drawVectorArrowOutline = (cx: number, cy: number, direction: ShotDirection) => {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                if (direction === 'left') {
                    ctx.moveTo(cx - 10, cy);
                    ctx.lineTo(cx, cy - 8);
                    ctx.lineTo(cx, cy - 3.5);
                    ctx.lineTo(cx + 10, cy - 3.5);
                    ctx.lineTo(cx + 10, cy + 3.5);
                    ctx.lineTo(cx, cy + 3.5);
                    ctx.lineTo(cx, cy + 8);
                } else if (direction === 'right') {
                    ctx.moveTo(cx + 10, cy);
                    ctx.lineTo(cx, cy - 8);
                    ctx.lineTo(cx, cy - 3.5);
                    ctx.lineTo(cx - 10, cy - 3.5);
                    ctx.lineTo(cx - 10, cy + 3.5);
                    ctx.lineTo(cx, cy + 3.5);
                    ctx.lineTo(cx, cy + 8);
                } else if (direction === 'center') {
                    ctx.moveTo(cx, cy + 10);
                    ctx.lineTo(cx - 8, cy);
                    ctx.lineTo(cx - 3.5, cy);
                    ctx.lineTo(cx - 3.5, cy - 10);
                    ctx.lineTo(cx + 3.5, cy - 10);
                    ctx.lineTo(cx + 3.5, cy);
                    ctx.lineTo(cx + 8, cy);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            };

            // Draw hit zone target crosshair and ring
            ctx.save();
            ctx.strokeStyle = '#ffeb3b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(width / 2, trackY + trackHeight / 2, 22, 0, Math.PI * 2);
            ctx.stroke();

            // Reticle crosshair lines
            ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(width / 2 - 28, trackY + trackHeight / 2);
            ctx.lineTo(width / 2 - 16, trackY + trackHeight / 2);
            ctx.moveTo(width / 2 + 16, trackY + trackHeight / 2);
            ctx.lineTo(width / 2 + 28, trackY + trackHeight / 2);
            ctx.moveTo(width / 2, trackY + trackHeight / 2 - 28);
            ctx.lineTo(width / 2, trackY + trackHeight / 2 - 16);
            ctx.moveTo(width / 2, trackY + trackHeight / 2 + 16);
            ctx.lineTo(width / 2, trackY + trackHeight / 2 + 28);
            ctx.stroke();

            // Draw faint stacked guides overlapping in hit zone center
            drawVectorArrowOutline(width / 2, trackY + trackHeight / 2, 'left');
            drawVectorArrowOutline(width / 2, trackY + trackHeight / 2, 'center');
            drawVectorArrowOutline(width / 2, trackY + trackHeight / 2, 'right');

            ctx.restore();

            // Hit zone title
            ctx.fillStyle = '#ffeb3b';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('HIT ZONE', width / 2, trackY - 8);

            const drawVectorArrow = (cx: number, cy: number, direction: ShotDirection, isEvaluated: boolean) => {
                ctx.save();
                ctx.fillStyle = isEvaluated ? 'rgba(255, 255, 255, 0.3)' : '#ffffff';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                if (direction === 'left') {
                    ctx.moveTo(cx - 12, cy); // tip
                    ctx.lineTo(cx, cy - 9);
                    ctx.lineTo(cx, cy - 4);
                    ctx.lineTo(cx + 12, cy - 4);
                    ctx.lineTo(cx + 12, cy + 4);
                    ctx.lineTo(cx, cy + 4);
                    ctx.lineTo(cx, cy + 9);
                } else if (direction === 'right') {
                    ctx.moveTo(cx + 12, cy); // tip
                    ctx.lineTo(cx, cy - 9);
                    ctx.lineTo(cx, cy - 4);
                    ctx.lineTo(cx - 12, cy - 4);
                    ctx.lineTo(cx - 12, cy + 4);
                    ctx.lineTo(cx, cy + 4);
                    ctx.lineTo(cx, cy + 9);
                } else if (direction === 'center') {
                    ctx.moveTo(cx, cy + 12); // tip
                    ctx.lineTo(cx - 9, cy);
                    ctx.lineTo(cx - 4, cy);
                    ctx.lineTo(cx - 4, cy - 12);
                    ctx.lineTo(cx + 4, cy - 12);
                    ctx.lineTo(cx + 4, cy);
                    ctx.lineTo(cx + 9, cy);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            // Draw notes
            const now = Date.now();
            notesRef.current.forEach(note => {
                const x = width / 2 + (now - note.hitTime) * 0.2;

                if (x >= trackX - 20 && x <= trackX + trackWidth + 20) {
                    ctx.save();

                    // Glow if close to hit zone
                    const dist = Math.abs(x - width / 2);
                    if (dist < 40 && !note.evaluated) {
                        ctx.shadowColor = '#ffeb3b';
                        ctx.shadowBlur = 15;
                    }

                    // Neon colors matching buttons exactly
                    let color = '#00b0ff'; // neon blue: left
                    if (note.direction === 'center') {
                        color = '#d500f9'; // neon magenta: center
                    } else if (note.direction === 'right') {
                        color = '#ff6d00'; // neon orange: right
                    }

                    // Draw outer border black outline
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.arc(x, trackY + trackHeight / 2, 22, 0, Math.PI * 2);
                    ctx.fill();

                    // Draw note circle body
                    ctx.fillStyle = note.evaluated ? 'rgba(100, 100, 100, 0.4)' : color;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.arc(x, trackY + trackHeight / 2, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Draw the vector arrow inside the note circle
                    drawVectorArrow(x, trackY + trackHeight / 2, note.direction, note.evaluated);

                    ctx.restore();
                }
            });

            // Draw hit timing feedback text (PERFECT, WRONG, MISS)
            const feedback = hitFeedbackRef.current;
            if (feedback && now - feedback.time < 750) {
                const elapsed = now - feedback.time;
                const opacity = 1.0 - elapsed / 750;
                const yOffset = (elapsed / 750) * 16;
                ctx.save();
                ctx.fillStyle = feedback.color;
                ctx.globalAlpha = opacity;
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 4;
                ctx.fillText(feedback.text, width / 2, trackY + trackHeight / 2 - 25 - yOffset);
                ctx.restore();
            }

            ctx.restore();
        };

        const renderLoop = () => {
            const now = Date.now();

            // 1. Check for missed notes
            notesRef.current.forEach(note => {
                if (!note.evaluated && now - note.hitTime > 280) {
                    note.evaluated = true;
                    note.result = 'miss';
                    
                    goalsConcededRef.current += 1;
                    setGoalsConceded(goalsConcededRef.current);
                    showToast(t.goalMsg || "GOAL! 🥅");
                    hitFeedbackRef.current = { text: 'MISS!', color: '#7f8c8d', time: now };
                    triggerShot(note, null, false);
                }
            });

            // 2. Active shot update & Goalkeeper sliding movement
            const activeShot = activeShotRef.current;
            if (activeShot) {
                if (activeShot.phase === 'flight') {
                    const elapsed = now - activeShot.startTime;
                    if (elapsed >= activeShot.duration) {
                        activeShot.phase = 'result';
                        activeShot.resultShowTime = now;
                        if (activeShot.isSaved) {
                            playSound('save');
                            let targetBallX = 400;
                            if (activeShot.direction === 'left') targetBallX = 220;
                            if (activeShot.direction === 'right') targetBallX = 580;
                            createExplosion(targetBallX, goalTop + 50, '#f1c40f', 'star');
                        } else {
                            playSound('goal');
                            let targetBallX = 400;
                            if (activeShot.direction === 'left') targetBallX = 220;
                            if (activeShot.direction === 'right') targetBallX = 580;
                            createExplosion(targetBallX, goalTop + 50, '#e74c3c', 'square');
                        }
                    } else {
                        // Slide goalkeeper to target lane
                        keeperXRef.current += (activeShot.keeperTargetX - keeperXRef.current) * 0.16;
                    }
                } else if (activeShot.phase === 'result') {
                    const elapsed = now - activeShot.resultShowTime;
                    if (elapsed >= 1000) {
                        // Advance round
                        roundRef.current += 1;
                        setRound(roundRef.current);
                        activeShotRef.current = null;

                        // Trigger next quote
                        const nextKicker = kickerList[roundRef.current % kickerList.length] || selectedOpponent;
                        if (nextKicker) {
                            triggerAiQuote(nextKicker, `Round ${roundRef.current + 1}/${totalNotesRef.current} is starting. Intimidate the goalkeeper in 1 brief sentence.`);
                        }
                    } else {
                        keeperXRef.current += (activeShot.keeperTargetX - keeperXRef.current) * 0.16;
                    }
                }
            } else {
                // Return goalkeeper back to center lane
                keeperXRef.current += (400 - keeperXRef.current) * 0.10;
            }

            // 3. Check for game completion when all notes are evaluated and no active shot is flying
            const allEvaluated = notesRef.current.length > 0 && notesRef.current.every(n => n.evaluated);
            if (allEvaluated) {
                const activeShotLocal = activeShotRef.current;
                const canEnd = !activeShotLocal || (activeShotLocal.phase === 'result' && (now - activeShotLocal.resultShowTime >= 1000));
                if (canEnd) {
                    // Game finished!
                    if (bgmTimeoutRef.current) {
                        clearTimeout(bgmTimeoutRef.current);
                        bgmTimeoutRef.current = null;
                    }
                    if (audioSourceRef.current) {
                        try {
                            audioSourceRef.current.stop();
                        } catch (e) {}
                        audioSourceRef.current = null;
                    }
                    const isWinner = savesRef.current >= Math.floor(totalNotesRef.current * 0.6);
                    const reward = (savesRef.current * 10) + (isWinner ? 50 : 0);
                    onRewardCoins(reward);
                    setPhase('gameover');
                    playSound(isWinner ? 'win' : 'lose');
                    return; // Stop render loop animation frame recursion
                }
            }

            ctx.clearRect(0, 0, width, height);
            drawStadium();
            drawGoalkeeper();
            drawKicker();
            drawBall();
            updateAndDrawParticles();
            drawNoteTrack();

            animFrameId = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        return () => {
            cancelAnimationFrame(animFrameId);
        };
    }, [phase, kickerList, kickerImgs, userImg]);

    const aiContacts = contacts.filter(c => !c.isGroup && c.isAi);

    if (phase === 'select') {
        return (
            <div className="flex flex-col h-full bg-green-900 text-white p-6 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <h1 className="text-3xl md:text-4xl font-black mb-2 text-yellow-400 tracking-widest uppercase z-10 text-center">
                    {t.title}
                </h1>
                <p className="mb-8 font-bold text-gray-300 z-10 text-center text-xs md:text-sm">{t.subtitle}</p>

                <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8 z-10 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {aiContacts.map(opp => (
                        <div
                            key={opp.id}
                            onClick={() => handleSelectOpponent(opp)}
                            className={`
                                rounded-3xl border-4 border-black cursor-pointer transition-all hover:scale-105 active:scale-95
                                ${opp.color || 'bg-slate-200'} flex flex-col items-center justify-center p-4 relative group shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]
                            `}
                        >
                            <img src={opp.avatarUrl} className="w-20 h-20 mb-3 drop-shadow-md group-hover:animate-bounce object-contain" />
                            <h3 className="font-black text-black text-xs uppercase text-center leading-tight truncate w-full">{opp.name}</h3>
                            <span className="text-[10px] text-black/50 font-bold uppercase">{opp.species}</span>
                        </div>
                    ))}
                    {aiContacts.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white/5 rounded-3xl border-4 border-dashed border-white/20">
                            <p className="text-gray-400 font-bold italic">No AI contacts found. Summon some friends first!</p>
                        </div>
                    )}
                </div>

                {/* Local Song Import Dropzone */}
                <div className="w-full max-w-md bg-black/45 border-4 border-dashed border-white/25 hover:border-yellow-400/60 transition-all rounded-3xl p-5 text-center z-10 mb-8 flex flex-col items-center justify-center">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                            <p className="font-black text-yellow-400 text-xs tracking-wider uppercase">Analyzing Beats & Tempos...</p>
                        </div>
                    ) : customSongName ? (
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xl">🎵</span>
                            <div className="flex flex-col">
                                <span className="font-black text-yellow-400 text-xs tracking-wider uppercase">Custom Beatmap Ready</span>
                                <span className="text-[11px] text-gray-300 font-medium truncate max-w-[280px] mt-0.5">{customSongName}</span>
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">Detected Beats: {customBeatTimestampsRef.current.length}</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomSongName(null);
                                    isCustomSongRef.current = false;
                                    customAudioBufferRef.current = null;
                                    customBeatTimestampsRef.current = [];
                                    showToast("🎵 DEFAULT BGM RESTORED");
                                }}
                                className="mt-1.5 text-[10px] font-black text-rose-400 hover:text-rose-300 border-b border-rose-400/30 hover:border-rose-300 transition-colors uppercase tracking-wider bg-transparent border-0 outline-none cursor-pointer"
                            >
                                Use Default (We Will Rock You)
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-1.5 group w-full h-full">
                            <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
                            <span className="font-black text-white group-hover:text-yellow-400 text-xs tracking-widest uppercase transition-colors">Import Local Song</span>
                            <span className="text-[10px] text-gray-400 font-medium max-w-[300px] leading-relaxed">
                                Upload any MP3/WAV. We'll automatically identify beat transients and generate a custom level!
                            </span>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                <Button onClick={handleExit} variant="secondary" className="w-44 border-white text-white bg-transparent hover:bg-white hover:text-black z-10 font-black shadow-none hover:shadow-none">
                    {t.btnBack}
                </Button>
            </div>
        );
    }

    const activeKicker = kickerList[round] || selectedOpponent;

    return (
        <div className="flex flex-col h-full bg-[#1b5e20] relative overflow-hidden select-none">
            {/* Header */}
            <div className="bg-black/90 backdrop-blur-md p-4 text-white flex justify-between items-center z-20 border-b-4 border-black shadow-xl">
                <button onClick={handleExit} className="font-black text-sm text-gray-400 hover:text-white transition-colors">EXIT</button>
                <div className="flex flex-col items-center">
                    <span className="font-black text-sm md:text-base uppercase tracking-widest text-yellow-400">
                        {t.round} {round + 1}/{totalNotesState}
                    </span>
                </div>
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="font-bold text-gray-400 hover:text-white w-8 text-center"
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>
            </div>

            {/* Toast HUD notifications */}
            {toast && (
                <div className="absolute top-24 left-0 right-0 z-50 flex justify-center pointer-events-none">
                    <div className="bg-black/90 text-white px-8 py-4 rounded-2xl font-black text-lg md:text-2xl border-4 border-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-bounce">
                        {toast}
                    </div>
                </div>
            )}

            {/* Scoreboard Panel */}
            <div className="absolute top-20 left-4 z-10 bg-white/95 border-3 border-black rounded-2xl p-2.5 shadow-[3px_3px_0px_rgba(0,0,0,1)] text-black flex flex-col gap-0.5 text-xs font-bold font-mono">
                <div className="text-[9px] text-gray-500 uppercase font-black">{t.score}</div>
                <div className="flex gap-2.5 items-center">
                    <span className="text-emerald-600">Saves: {saves}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-rose-600">Conceded: {goalsConceded}</span>
                </div>
            </div>

            {/* AI Speech Bubble */}
            {(aiSpeechVisible || isAiThinking) && activeKicker && (
                <div className="absolute top-36 right-6 z-10 bg-white border-4 border-black p-3.5 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] text-black max-w-[200px] text-center animate-fadeIn">
                    <div className="font-black text-[9px] text-purple-600 uppercase tracking-wider mb-1">{activeKicker.name}</div>
                    {isAiThinking ? (
                        <p className="font-bold text-xs leading-normal text-gray-400 animate-pulse">...</p>
                    ) : (
                        <>
                            <p className="font-bold text-xs leading-normal">{aiSpeechText}</p>
                            {aiSpeechAudio && (
                                <button
                                    onClick={() => playAudioBase64(aiSpeechAudio)}
                                    className="mt-2 text-[9px] font-black bg-purple-500 hover:bg-purple-600 text-white px-2 py-0.5 rounded-full"
                                >
                                    🔊 Replay
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Main Interactive Stage */}
            <div className="flex-1 flex items-center justify-center p-2 relative">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={500}
                    className="w-full max-w-3xl aspect-[1.6] bg-[#27ae60] rounded-3xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.3)] object-contain"
                />
            </div>

            {/* Controls Panel */}
            <div className="bg-white border-t-4 border-black p-4 z-10 relative">
                {phase === 'ready' && (
                    <div className="flex flex-col gap-4 max-w-md mx-auto items-center">
                        <div className="flex gap-4 w-full justify-center">
                            <button
                                onClick={() => handleGameInput('left')}
                                className="flex-1 py-4 bg-[#00b0ff] hover:bg-[#0091ea] active:bg-[#0081cb] text-white font-black text-lg rounded-2xl border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                ⬅️ LEFT
                            </button>
                            <button
                                onClick={() => handleGameInput('center')}
                                className="flex-1 py-4 bg-[#d500f9] hover:bg-[#c51162] active:bg-[#9c00c0] text-white font-black text-lg rounded-2xl border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                ⬇️ CENTER
                            </button>
                            <button
                                onClick={() => handleGameInput('right')}
                                className="flex-1 py-4 bg-[#ff6d00] hover:bg-[#ff5722] active:bg-[#c43c00] text-white font-black text-lg rounded-2xl border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                ➡️ RIGHT
                            </button>
                        </div>
                        <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider text-center">
                            {t.instruction}
                        </div>
                    </div>
                )}

                {phase === 'gameover' && (
                    <div className="flex flex-col gap-3 max-w-sm mx-auto text-center py-2">
                        <h2 className={`font-black text-xl uppercase tracking-wider ${saves >= Math.floor(totalNotesState * 0.6) ? 'text-green-600' : 'text-red-500'}`}>
                            {saves >= Math.floor(totalNotesState * 0.6) ? t.winTitle : t.loseTitle}
                        </h2>
                        <p className="font-bold text-gray-600 text-xs md:text-sm">
                            {saves >= Math.floor(totalNotesState * 0.6)
                                ? t.winDesc.replace('{saves}', saves.toString()).replace('{total}', totalNotesState.toString()).replace('{coins}', ((saves * 10) + 50).toString())
                                : t.loseDesc.replace('{saves}', saves.toString()).replace('{total}', totalNotesState.toString())
                            }
                        </p>
                        <div className="flex gap-2 mt-2">
                            <Button
                                onClick={() => {
                                    setPhase('select');
                                    setSelectedOpponent(null);
                                    setKickerList([]);
                                    setSaves(0);
                                    setGoalsConceded(0);
                                    setRound(0);
                                }}
                                className="flex-1 py-3 text-xs font-black"
                            >
                                {t.btnPlayAgain}
                            </Button>
                            <Button
                                onClick={handleExit}
                                variant="secondary"
                                className="flex-1 py-3 text-xs font-black"
                            >
                                {t.btnBack}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
