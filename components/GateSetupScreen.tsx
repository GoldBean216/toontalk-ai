import React, { useState } from 'react';
import { AiBrainConfig, AiProvider } from '../types';
import { Button } from './Button';

interface GateSetupScreenProps {
  onUnlockComplete: (config: AiBrainConfig) => void;
  language: string;
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string; icon: string; defaultModel: string; defaultBaseUrl: string }[] = [
  { value: 'gemini',    label: 'Gemini (Google)',           icon: '✨', defaultModel: 'gemini-2.5-flash', defaultBaseUrl: 'https://generativelanguage.googleapis.com' },
  { value: 'openai',    label: 'OpenAI',                    icon: '⚡', defaultModel: 'gpt-4o', defaultBaseUrl: 'https://api.openai.com/v1' },
  { value: 'deepseek',  label: 'DeepSeek',                  icon: '🐳', defaultModel: 'deepseek-chat', defaultBaseUrl: 'https://api.deepseek.com' },
  { value: 'anthropic', label: 'Anthropic Claude',          icon: '🧠', defaultModel: 'claude-3-5-sonnet-20241022', defaultBaseUrl: 'https://api.anthropic.com/v1' },
  { value: 'ollama',    label: 'Ollama (Local)',            icon: '🦙', defaultModel: 'llama3.1', defaultBaseUrl: 'http://127.0.0.1:11434' },
  { value: 'custom',    label: 'Custom (OpenAI Compatible)', icon: '⚙️', defaultModel: '', defaultBaseUrl: '' },
];

export const GateSetupScreen: React.FC<GateSetupScreenProps> = ({ onUnlockComplete, language }) => {
  const isChinese = language === "简体中文";
  
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com');
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Animation Phase: 'form' | 'unlocking' | 'opening' | 'fadeout'
  const [animationPhase, setAnimationPhase] = useState<'form' | 'unlocking' | 'opening' | 'fadeout'>('form');

  const handleProviderChange = (p: AiProvider) => {
    setProvider(p);
    const matched = PROVIDER_OPTIONS.find(opt => opt.value === p);
    if (matched) {
      setModel(matched.defaultModel);
      setBaseUrl(matched.defaultBaseUrl);
    }
  };

  const playUnlockSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // 1. Chime (Key floats / magic): higher pitch arpeggio
      const chimeTimes = [0, 0.15, 0.3];
      const chimeFreqs = [587.33, 698.46, 880]; // D5, F5, A5
      chimeTimes.forEach((time, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(chimeFreqs[index], ctx.currentTime + time);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + 0.5);
      });

      // 2. Lock Click (Key turns): at 0.8s
      const clickTime = ctx.currentTime + 0.8;
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(150, clickTime);
      clickOsc.frequency.exponentialRampToValueAtTime(10, clickTime + 0.08);
      clickGain.gain.setValueAtTime(0.5, clickTime);
      clickGain.gain.linearRampToValueAtTime(0.01, clickTime + 0.08);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(clickTime);
      clickOsc.stop(clickTime + 0.1);

      // 3. Gate Creak (Doors opening): at 1.1s
      const creakTime = ctx.currentTime + 1.1;
      const creakOsc = ctx.createOscillator();
      const creakGain = ctx.createGain();
      creakOsc.type = 'sawtooth';
      creakOsc.frequency.setValueAtTime(80, creakTime);
      creakOsc.frequency.linearRampToValueAtTime(120, creakTime + 0.3);
      creakOsc.frequency.linearRampToValueAtTime(60, creakTime + 0.8);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, creakTime);

      creakGain.gain.setValueAtTime(0.08, creakTime);
      creakGain.gain.linearRampToValueAtTime(0.08, creakTime + 0.6);
      creakGain.gain.exponentialRampToValueAtTime(0.001, creakTime + 1.2);

      creakOsc.connect(filter);
      filter.connect(creakGain);
      creakGain.connect(ctx.destination);
      creakOsc.start(creakTime);
      creakOsc.stop(creakTime + 1.3);

      // 4. Portal Swoosh (Magic zoom): at 1.4s
      const swooshTime = ctx.currentTime + 1.4;
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const swooshFilter = ctx.createBiquadFilter();
      swooshFilter.type = 'bandpass';
      swooshFilter.Q.setValueAtTime(3.0, swooshTime);
      swooshFilter.frequency.setValueAtTime(300, swooshTime);
      swooshFilter.frequency.exponentialRampToValueAtTime(1800, swooshTime + 1.2);

      const swooshGain = ctx.createGain();
      swooshGain.gain.setValueAtTime(0.001, swooshTime);
      swooshGain.gain.linearRampToValueAtTime(0.12, swooshTime + 0.4);
      swooshGain.gain.exponentialRampToValueAtTime(0.001, swooshTime + 1.5);

      noiseNode.connect(swooshFilter);
      swooshFilter.connect(swooshGain);
      swooshGain.connect(ctx.destination);
      noiseNode.start(swooshTime);
      noiseNode.stop(swooshTime + 1.5);

    } catch (e) {
      console.error("Failed to play synthesis sound:", e);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations: If provider requires apiKey, verify it is present
    const needsKey = provider !== 'ollama';
    if (needsKey && !apiKey.trim()) {
      setErrorMsg(isChinese ? '请输入对应的 API Key 以开锁大门！' : 'Please input the API Key to unlock the gates!');
      return;
    }
    if (!model.trim()) {
      setErrorMsg(isChinese ? '请输入模型名称！' : 'Please input the model name!');
      return;
    }

    setErrorMsg('');
    const config: AiBrainConfig = {
      provider,
      model,
      apiKey: apiKey || undefined,
      apiBaseUrl: baseUrl || undefined,
      cognitiveMode: 'standard'
    };

    // Play unlocking timeline
    setAnimationPhase('unlocking');
    playUnlockSound();

    // After 1.2s of key animation, swing doors open
    setTimeout(() => {
      setAnimationPhase('opening');
    }, 1200);

    // After 2.4s, fade to white
    setTimeout(() => {
      setAnimationPhase('fadeout');
    }, 2400);

    // After 3.4s, trigger parent complete
    setTimeout(() => {
      onUnlockComplete(config);
    }, 3400);
  };

  return (
    <div className="fixed inset-0 bg-[#0c0f1d] overflow-hidden flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-6 font-bold select-none z-50">
      
      {/* Cartoon Background Stars */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
      
      {/* Floating Magic Orbs */}
      <div className="absolute w-72 h-72 rounded-full bg-indigo-500/10 blur-[100px] -top-20 -left-20 animate-pulse pointer-events-none"></div>
      <div className="absolute w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] -bottom-20 -right-20 animate-pulse duration-5000 pointer-events-none"></div>

      {/* The Arched Gateway Container */}
      <div className="relative w-[280px] h-[380px] sm:w-[360px] sm:h-[500px] flex items-center justify-center select-none z-10 filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.65)] shrink-0">
        
        {/* Portal Background Glow (Behind Gate, inside the arch) */}
        <div className={`absolute inset-0 rounded-t-full bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center overflow-hidden border-[6px] border-black transition-all duration-1000
          ${animationPhase === 'opening' || animationPhase === 'fadeout' ? 'opacity-100' : 'opacity-90'}
        `}>
          {/* Swirling magic circle portal */}
          <div className={`absolute w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 blur-md opacity-0 transition-all duration-1000
            ${animationPhase === 'opening' || animationPhase === 'fadeout' ? 'opacity-90 scale-125 animate-[spin_6s_linear_infinite]' : ''}
          `}></div>
          <div className="w-[800px] h-[800px] opacity-25 bg-[repeating-conic-gradient(from_0deg,transparent_0deg_15deg,rgba(255,255,255,0.08)_15deg_30deg)] animate-[spin_20s_linear_infinite]"></div>
        </div>

        {/* 3D Doors Wrapper */}
        <div 
          className="absolute inset-0 flex"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          {/* Left Door (Purple wood/metal + yellow rivets + half crossbar) */}
          <div 
            className={`w-1/2 h-full bg-[#512DA8] border-r-[3px] border-black rounded-tl-[140px] sm:rounded-tl-[180px] rounded-bl-xl relative transition-all duration-[1200ms] ease-in-out flex items-center justify-end
              ${animationPhase === 'opening' || animationPhase === 'fadeout' ? 'transform rotateY(-115deg) opacity-40 shadow-none' : 'shadow-[inset_-10px_0_20px_rgba(0,0,0,0.35)]'}
            `}
            style={{
              transformOrigin: 'left',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Planks styling */}
            <div className="absolute inset-y-0 left-0 right-0 rounded-tl-[140px] sm:rounded-tl-[180px] opacity-10 bg-[linear-gradient(90deg,transparent_45%,rgba(0,0,0,0.3)_50%,transparent_55%)] [background-size:30px_100%] pointer-events-none"></div>

            {/* Left Hinge (Top) */}
            <div className="absolute top-[12%] left-0 w-[45%] h-10 bg-yellow-400 border-y-4 border-r-4 border-black rounded-r-xl shadow-[2px_2px_0_black]"></div>
            {/* Left Hinge (Bottom) */}
            <div className="absolute bottom-[12%] left-0 w-[45%] h-10 bg-yellow-400 border-y-4 border-r-4 border-black rounded-r-xl shadow-[2px_2px_0_black]"></div>

            {/* Yellow Flashing Rivets */}
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] top-[18%] left-[25%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite]' : ''}
            `}></div>
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] top-[32%] left-[30%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite_100ms]' : ''}
            `}></div>
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] bottom-[32%] left-[30%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite_200ms]' : ''}
            `}></div>
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] bottom-[18%] left-[25%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite_300ms]' : ''}
            `}></div>

            {/* Horizontal Wooden Crossbar (Left Half) */}
            <div className="absolute top-[45%] right-0 left-4 h-14 bg-[#7D5A50] border-y-4 border-l-4 border-black z-10 flex items-center justify-end pr-2 rounded-l-md">
              <span className="text-[9px] font-black text-black/40 tracking-wider">TOON</span>
            </div>

            {/* Golden Shield Lock (Left Half) */}
            <div className="absolute top-[calc(45%-21px)] right-0 w-14 h-24 bg-yellow-400 border-y-4 border-l-4 border-black rounded-l-[1.5rem] z-20 shadow-[inset_2px_2px_0_rgba(255,255,255,0.4)] flex items-center justify-end pr-1">
              <span className="text-lg select-none filter drop-shadow-[1px_1px_0_rgba(0,0,0,0.15)] absolute top-2 left-2">🌿</span>
              {/* Left Keyhole Half */}
              <div className="w-3.5 h-7 bg-slate-900 border-y-2 border-l-2 border-black rounded-l-full absolute right-0 top-[calc(50%-14px)]"></div>
            </div>
          </div>

          {/* Right Door (Purple wood/metal + yellow rivets + half crossbar) */}
          <div 
            className={`w-1/2 h-full bg-[#512DA8] border-l-[3px] border-black rounded-tr-[140px] sm:rounded-tr-[180px] rounded-br-xl relative transition-all duration-[1200ms] ease-in-out flex items-center justify-start
              ${animationPhase === 'opening' || animationPhase === 'fadeout' ? 'transform rotateY(115deg) opacity-40 shadow-none' : 'shadow-[inset_10px_0_20px_rgba(0,0,0,0.35)]'}
            `}
            style={{
              transformOrigin: 'right',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Planks styling */}
            <div className="absolute inset-y-0 left-0 right-0 rounded-tr-[140px] sm:rounded-tr-[180px] opacity-10 bg-[linear-gradient(90deg,transparent_45%,rgba(0,0,0,0.3)_50%,transparent_55%)] [background-size:30px_100%] pointer-events-none"></div>

            {/* Right Hinge (Top) */}
            <div className="absolute top-[12%] right-0 w-[45%] h-10 bg-yellow-400 border-y-4 border-l-4 border-black rounded-l-xl shadow-[-2px_2px_0_black]"></div>
            {/* Right Hinge (Bottom) */}
            <div className="absolute bottom-[12%] right-0 w-[45%] h-10 bg-yellow-400 border-y-4 border-l-4 border-black rounded-l-xl shadow-[-2px_2px_0_black]"></div>

            {/* Yellow Flashing Rivets */}
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] top-[18%] right-[25%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite]' : ''}
            `}></div>
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] top-[32%] right-[30%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite_100ms]' : ''}
            `}></div>
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] bottom-[32%] right-[30%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite_200ms]' : ''}
            `}></div>
            <div className={`absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[1px_1px_0_black] bottom-[18%] right-[25%]
              ${animationPhase === 'unlocking' ? 'animate-[rivetFlash_0.8s_ease-in-out_infinite_300ms]' : ''}
            `}></div>

            {/* Horizontal Wooden Crossbar (Right Half) */}
            <div className="absolute top-[45%] left-0 right-4 h-14 bg-[#7D5A50] border-y-4 border-r-4 border-black z-10 flex items-center justify-start pl-2 rounded-r-md">
              <span className="text-[9px] font-black text-black/40 tracking-wider">TALK</span>
            </div>

            {/* Golden Shield Lock (Right Half) */}
            <div className="absolute top-[calc(45%-21px)] left-0 w-14 h-24 bg-yellow-400 border-y-4 border-r-4 border-black rounded-r-[1.5rem] z-20 shadow-[inset_-2px_2px_0_rgba(255,255,255,0.4)] flex items-center justify-start pl-1">
              <span className="text-lg select-none filter drop-shadow-[1px_1px_0_rgba(0,0,0,0.15)] absolute top-2 right-2">🌿</span>
              {/* Right Keyhole Half */}
              <div className="w-3.5 h-7 bg-slate-900 border-y-2 border-r-2 border-black rounded-r-full absolute left-0 top-[calc(50%-14px)]"></div>
            </div>
          </div>
        </div>

        {/* Stone Archway Overlay SVG */}
        <svg className="absolute -inset-x-[18px] -inset-y-[20px] w-[calc(100%+36px)] h-[calc(100%+34px)] pointer-events-none z-20" viewBox="0 0 460 620" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left Stone Pillar */}
          <rect x="10" y="210" width="30" height="400" fill="#A1887F" stroke="black" strokeWidth="6" rx="6" />
          <line x1="10" y1="310" x2="40" y2="310" stroke="black" strokeWidth="6" />
          <line x1="10" y1="410" x2="40" y2="410" stroke="black" strokeWidth="6" />
          <line x1="10" y1="510" x2="40" y2="510" stroke="black" strokeWidth="6" />

          {/* Right Stone Pillar */}
          <rect x="420" y="210" width="30" height="400" fill="#A1887F" stroke="black" strokeWidth="6" rx="6" />
          <line x1="420" y1="310" x2="450" y2="310" stroke="black" strokeWidth="6" />
          <line x1="420" y1="410" x2="450" y2="410" stroke="black" strokeWidth="6" />
          <line x1="420" y1="510" x2="450" y2="510" stroke="black" strokeWidth="6" />

          {/* Arched voussoirs (stones) */}
          {/* voussoir 1 (Left base to 144°) */}
          <path d="M 10 210 L 40 210 A 190 190 0 0 1 76 98 L 52 81 A 220 220 0 0 0 10 210 Z" fill="#A1887F" stroke="black" strokeWidth="6" />
          
          {/* voussoir 2 (144° to 108°) */}
          <path d="M 52 81 L 76 98 A 190 190 0 0 1 171 29 L 162 1 A 220 220 0 0 0 52 81 Z" fill="#BCAAA4" stroke="black" strokeWidth="6" />
          
          {/* voussoir 3 (Keystone - 108° to 72°) */}
          <path d="M 162 1 L 171 29 A 190 190 0 0 1 289 29 L 298 1 A 220 220 0 0 0 162 1 Z" fill="#8D6E63" stroke="black" strokeWidth="6" />
          
          {/* voussoir 4 (72° to 36°) */}
          <path d="M 298 1 L 289 29 A 190 190 0 0 1 384 98 L 408 81 A 220 220 0 0 0 298 1 Z" fill="#BCAAA4" stroke="black" strokeWidth="6" />
          
          {/* voussoir 5 (36° to Right base) */}
          <path d="M 408 81 L 384 98 A 190 190 0 0 1 420 210 L 450 210 A 220 220 0 0 0 408 81 Z" fill="#A1887F" stroke="black" strokeWidth="6" />

          {/* Leaf emblem inside Keystone (Voussoir 3) */}
          <path d="M 230 12 L 230 22 M 230 14 Q 236 10 236 17 Q 230 21 230 21 M 230 14 Q 224 10 224 17 Q 230 21 230 21" stroke="#ffca28" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>

        {/* Floating Unlocking Key */}
        {animationPhase === 'unlocking' && (
          <div className="absolute w-20 h-20 text-5xl flex items-center justify-center animate-[keyInsertRotate_1.2s_ease-in-out_forwards] z-30 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] pointer-events-none">
            🔑
          </div>
        )}
      </div>

      {/* Foreground Form Setup Card */}
      {animationPhase === 'form' && (
        <div className="relative z-30 bg-white border-4 border-black p-6 rounded-[2rem] w-full max-w-md shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] text-left flex flex-col gap-4 animate-[bounceIn_0.8s_cubic-bezier(0.175,0.885,0.32,1.275)] m-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-amber-100 p-2 rounded-2xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">🔑</span>
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {isChinese ? '开启 Toon World 大门' : 'Unlock Toon World'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isChinese ? '配置全局 AI API KEY 作为大门钥匙' : 'Setup Global AI Key as Gate Access'}
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                {isChinese ? 'AI 服务商' : 'AI Provider'}
              </label>
              <select 
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
                className="w-full bg-white border-2 border-black rounded-xl p-2.5 text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 ring-indigo-500/20"
              >
                {PROVIDER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  {isChinese ? '模型名称' : 'Model Name'}
                </label>
                <input 
                  type="text" 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border-2 border-black rounded-xl p-2.5 text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none"
                  placeholder="e.g. gemini-2.5-flash"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  API Key {provider === 'ollama' 
                    ? (isChinese ? '(选填)' : '(Optional)') 
                    : (isChinese ? '(必填)' : '(Required)')}
                </label>
                <div className="relative">
                  <input 
                    type={showKey ? 'text' : 'password'} 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full border-2 border-black rounded-xl p-2.5 pr-8 text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none"
                    placeholder="sk-..."
                    required={provider !== 'ollama'}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold hover:text-indigo-600"
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Base URL (Useful for deepseek/custom) */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                {isChinese ? '自定义接口链接 (选填)' : 'Custom API URL (Optional)'}
              </label>
              <input 
                type="text" 
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full border-2 border-black rounded-xl p-2.5 text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none"
                placeholder={provider === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.openai.com/v1'}
              />
            </div>

            {errorMsg && (
              <p className="text-red-500 font-bold text-xs bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                ⚠️ {errorMsg}
              </p>
            )}

            <Button 
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-black py-3 mt-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all font-black text-sm uppercase flex items-center justify-center gap-1.5"
            >
              <span>🔑</span>
              <span>{isChinese ? '插入钥匙并解锁大门' : 'INSERT KEY & UNLOCK'}</span>
            </Button>
          </form>
        </div>
      )}

      {/* Screen White Flash transition overlay */}
      <div className={`absolute inset-0 bg-white z-[60] pointer-events-none transition-all duration-1000 ease-out
        ${animationPhase === 'fadeout' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}></div>

      {/* Bursting Leaf Particles on Unlock */}
      {(animationPhase === 'opening' || animationPhase === 'fadeout') && (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          <div className="absolute text-4xl animate-[leafFall_1.5s_linear_infinite] left-[10%] -top-10">🍃</div>
          <div className="absolute text-5xl animate-[leafFall_1.8s_linear_infinite] left-[25%] -top-10 [animation-delay:0.2s]">🌱</div>
          <div className="absolute text-3xl animate-[leafFall_1.2s_linear_infinite] left-[45%] -top-10 [animation-delay:0.5s]">🌸</div>
          <div className="absolute text-4xl animate-[leafFall_2s_linear_infinite] left-[65%] -top-10 [animation-delay:0.1s]">🍂</div>
          <div className="absolute text-5xl animate-[leafFall_1.6s_linear_infinite] left-[80%] -top-10 [animation-delay:0.4s]">🍀</div>
        </div>
      )}

      {/* Animations styling */}
      <style>{`
        perspective {
          perspective: 1200px;
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes keyInsertRotate {
          0% {
            opacity: 0;
            transform: translateY(-200px) scale(1.8) rotate(0deg);
          }
          40% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
          65% {
            transform: translateY(0) scale(1) rotate(0deg);
          }
          85% {
            transform: translateY(0) scale(1) rotate(90deg);
          }
          100% {
            opacity: 0;
            transform: translateY(0) scale(0.6) rotate(90deg);
          }
        }

        @keyframes leafFall {
          0% {
            transform: translateY(-20px) translateX(0) rotate(0deg) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) translateX(100px) rotate(360deg) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes rivetFlash {
          0%, 100% {
            background-color: #facc15;
            box-shadow: 1px 1px 0px black;
          }
          50% {
            background-color: #fef08a;
            box-shadow: 0 0 8px #facc15;
          }
        }
      `}</style>
    </div>
  );
};
