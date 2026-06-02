import { ChatResponse, Contact, SpyPlayer, AiBrainConfig } from "../types";

// Helper to merge contact brain settings with global settings
export const getEffectiveBrainConfig = (
    contactBrain?: AiBrainConfig,
    globalBrain?: AiBrainConfig
): AiBrainConfig => {
    const contact = contactBrain || {} as AiBrainConfig;
    const global = globalBrain || {} as AiBrainConfig;

    // Check if contact has custom brain credentials/configuration
    const hasCustomBrain = !!(contact.apiKey || contact.apiBaseUrl || (contact.provider && contact.provider !== 'gemini' && contact.provider !== 'openai'));

    // If contact has custom brain config, keep contact's provider/model/keys (falling back to global individually if blank)
    // Otherwise, fall back to global's provider/model/keys/url entirely.
    const provider = hasCustomBrain 
        ? (contact.provider || global.provider || 'gemini')
        : (global.provider || contact.provider || 'gemini');

    const model = hasCustomBrain
        ? (contact.model || global.model || '')
        : (global.model || contact.model || '');

    const apiKey = hasCustomBrain
        ? (contact.apiKey || global.apiKey)
        : (global.apiKey || contact.apiKey);

    const apiBaseUrl = hasCustomBrain
        ? (contact.apiBaseUrl || global.apiBaseUrl)
        : (global.apiBaseUrl || contact.apiBaseUrl);

    // Skills are always contact-specific
    const skills = contact.skills || [];

    // Cognitive mode: fallback to global if not specified
    const cognitiveMode = contact.cognitiveMode || global.cognitiveMode || 'standard';
    
    // For little brain, same fallback logic: if contact doesn't have custom little brain keys/url, fallback to global little brain config
    const hasCustomLittleBrain = !!(contact.littleBrainApiKey || contact.littleBrainBaseUrl);
    const littleBrainProvider = hasCustomLittleBrain
        ? (contact.littleBrainProvider || global.littleBrainProvider)
        : (global.littleBrainProvider || contact.littleBrainProvider);
    const littleBrainModel = hasCustomLittleBrain
        ? (contact.littleBrainModel || global.littleBrainModel)
        : (global.littleBrainModel || contact.littleBrainModel);
    const littleBrainApiKey = hasCustomLittleBrain
        ? (contact.littleBrainApiKey || global.littleBrainApiKey || apiKey)
        : (global.littleBrainApiKey || contact.littleBrainApiKey || apiKey);
    const littleBrainBaseUrl = hasCustomLittleBrain
        ? (contact.littleBrainBaseUrl || global.littleBrainBaseUrl || apiBaseUrl)
        : (global.littleBrainBaseUrl || contact.littleBrainBaseUrl || apiBaseUrl);
        
    const difficultyThreshold = contact.difficultyThreshold !== undefined 
        ? contact.difficultyThreshold 
        : (global.difficultyThreshold !== undefined ? global.difficultyThreshold : 50);

    // TTS: fallback to global TTS settings if contact has no custom TTS credentials
    const hasCustomTts = !!(contact.ttsApiKey || contact.ttsBaseUrl || contact.ttsProvider);
    const ttsProvider = hasCustomTts
        ? (contact.ttsProvider || global.ttsProvider)
        : (global.ttsProvider || contact.ttsProvider);
    const ttsModel = hasCustomTts
        ? (contact.ttsModel || global.ttsModel)
        : (global.ttsModel || contact.ttsModel);
    const ttsApiKey = hasCustomTts
        ? (contact.ttsApiKey || global.ttsApiKey || apiKey)
        : (global.ttsApiKey || contact.ttsApiKey || apiKey);
    const ttsBaseUrl = hasCustomTts
        ? (contact.ttsBaseUrl || global.ttsBaseUrl || apiBaseUrl)
        : (global.ttsBaseUrl || contact.ttsBaseUrl || apiBaseUrl);
    
    // Voice timbre is always contact-specific first, fallback to global voice
    const ttsVoice = contact.ttsVoice || global.ttsVoice || 'default';
    const ttsSpeechType = contact.ttsSpeechType !== undefined ? contact.ttsSpeechType : (global.ttsSpeechType !== undefined ? global.ttsSpeechType : 2);

    return {
        provider,
        model,
        apiKey,
        apiBaseUrl,
        skills,
        cognitiveMode,
        littleBrainProvider,
        littleBrainModel,
        littleBrainApiKey,
        littleBrainBaseUrl,
        difficultyThreshold,
        ttsVoice,
        ttsProvider,
        ttsModel,
        ttsBaseUrl,
        ttsApiKey,
        ttsSpeechType,
    };
};

// Helper to call internal API
const callApi = async (action: string, body: any, maxRetries: number = 0) => {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        // Resolve effective AI brain config (merge character-specific & global)
        let globalBrain: any = undefined;
        if (typeof window !== 'undefined') {
            let userId = null;
            const sessionStr = localStorage.getItem('local_mock_session');
            if (sessionStr && sessionStr !== 'logged_out') {
                try {
                    userId = JSON.parse(sessionStr)?.user?.id;
                } catch (e) {}
            }
            const key = userId ? `toontalk_global_ai_${userId}` : 'toontalk_global_ai';
            const storedGlobalAi = localStorage.getItem(key);
            if (storedGlobalAi) {
                try {
                    globalBrain = JSON.parse(storedGlobalAi);
                } catch (e) {
                    console.error("Failed to parse global AI config", e);
                }
            }
        }
        body.brain = getEffectiveBrainConfig(body.brain, globalBrain);

        try {
            const res = await fetch(`/api/ai/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return data.result;
            }

            const errorText = await res.text();
            lastError = new Error(`API call failed: ${action} (${res.status}): ${errorText}`);

            // If it's a terminal client error (except 429), don't retry
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                break;
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            lastError = e;

            // If network interrupted, we might want to retry if i < maxRetries
            const errorMsg = e.message?.toLowerCase() || "";
            const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('abort');

            if (!isNetworkError && i < maxRetries) {
                // If it's not a network error but some other JS error, maybe don't retry? 
                // Actually, usually we retry on everything except explicit client errors.
            }
        }

        if (i < maxRetries) {
            // Progressive delay: 1s, 2s, 4s...
            const delay = Math.pow(2, i) * 1000;
            console.warn(`Retrying ${action} (attempt ${i + 1}/${maxRetries})... after ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw lastError;
};



// 1.5 Generate Random Profiles
export const generateRandomProfiles = async (): Promise<Array<{ name: string, species: string, persona: string }>> => {
    return callApi('random-profiles', {}, 1);
};

// 2. Chat Logic
export const generateCharacterResponse = async (
    species: string,
    name: string,
    persona: string,
    contextMessage: string,
    history: string[],
    lengthModifier?: string,
    brain?: AiBrainConfig,
    worldContext?: {
        location?: string;
        buildingId?: string;
        activity?: string;
        task?: string;
        weather?: string;
    },
    userId?: string,
    aiId?: string,
    language?: string
): Promise<ChatResponse> => {
    return callApi('chat-response', { 
        species, 
        name, 
        persona, 
        contextMessage, 
        history, 
        lengthModifier, 
        brain,
        worldContext,
        userId,
        aiId,
        language
    }, 2);
};

// 3. Roleplay - Taboo
export const generateRoleplayResponse = async (
    charName: string,
    aiTabooWord: string,
    userTabooWord: string,
    history: string[],
    brain?: AiBrainConfig
): Promise<ChatResponse> => {
    return callApi('rp-taboo', { charName, aiTaboo: aiTabooWord, userTaboo: userTabooWord, history, brain }, 2);
};

// 4. Roleplay - Guess Answer
export const generateGuessResponse = async (
    charName: string,
    secretWord: string,
    question: string,
    brain?: AiBrainConfig
): Promise<ChatResponse> => {
    return callApi('rp-guess-answer', { charName, secretWord, question, brain }, 2);
};

// 4.5 Roleplay - Guess Ask
export const generateAiGuess = async (
    charName: string,
    wordToGuess: string,
    history: string[],
    brain?: AiBrainConfig
): Promise<ChatResponse> => {
    return callApi('rp-guess-ask', { charName, wordToGuess, history, brain }, 2);
};

// 5. Spy Description
export const generateSpyDescription = async (player: SpyPlayer, history: string[], brain?: AiBrainConfig): Promise<ChatResponse> => {
    return callApi('rp-spy-desc', { name: player.name, role: player.role, word: player.word, history, brain }, 2);
};

// 6. Spy Vote
export const generateSpyVote = async (player: SpyPlayer, alivePlayers: SpyPlayer[], history: string[], brain?: AiBrainConfig): Promise<string> => {
    const candidates = alivePlayers.filter(p => p.id !== player.id).map(c => c.name);
    return callApi('rp-spy-vote', { name: player.name, word: player.word, candidates, history, brain }, 2);
};

// 6.5 AI Schedule Generation
export const generateAiSchedule = async (
    name: string,
    species: string,
    persona: string,
    buildings: { id: string, name: string }[],
    brain?: AiBrainConfig
): Promise<{ buildingId: string, activity: string }[]> => {
    return callApi('generate-schedule', { name, species, persona, buildings, brain }, 2);
};

// 6.7 AI Social Proactivity Decision
export const decideSocialProactivity = async (
    name: string,
    species: string,
    persona: string,
    eventContext: string,
    proactivityLevel: 'low' | 'standard' | 'high' = 'standard',
    brain?: AiBrainConfig
): Promise<{ decision: 'message_user' | 'post_highnote' | 'nothing', content: string | null, raw_sound: string | null }> => {
    return callApi('decide-social-proactivity', { name, species, persona, eventContext, proactivityLevel, brain }, 1);
};

// 7. Social Post
export const generateSocialPost = async (contact: Contact, brain?: AiBrainConfig, language?: string): Promise<string> => {
    return callApi('social-post', { name: contact.name, species: contact.species, persona: contact.persona, brain, language }, 1);
};

// 8. Social Comment
export const generateSocialComment = async (contact: Contact, postContent: string, replyContext?: string, brain?: AiBrainConfig, language?: string): Promise<string> => {
    return callApi('social-comment', { name: contact.name, species: contact.species, persona: contact.persona, postContent, replyContext, brain, language }, 1);
};

// 9. TTS
export const generateSpeech = async (text: string, species: string, persona: string, maxRetries: number = 5, voice?: string, brain?: import('../types').AiBrainConfig, rawSound?: string): Promise<string | null> => {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            // Call API with 0 internal retries since we are handling it here
            const result = await callApi('tts', { text, species, persona, voice, brain, rawSound }, 0);

            // Check for empty or null data explicitly
            if (result && typeof result === 'string' && result.length > 0) {
                return result;
            }

            console.warn(`TTS attempt ${i + 1} returned empty or invalid data, retrying...`);
        } catch (e: any) {
            const errorMsg = e.message?.toLowerCase() || "";
            // Detect network issues or aborts (timeouts)
            const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('abort');

            if (isNetworkError) {
                console.error("Network disconnected or timed out. Stopping TTS retries as per safety logic.");
                return null; // Don't retry on network cut
            }

            console.error(`TTS attempt ${i + 1} failed:`, e);
            if (i === maxRetries) return null;
        }

        // Progressive delay: 1.5s
        await new Promise(r => setTimeout(r, 1500));
    }
    return null;
};

// Helper to decode audio (Client Side logic remains same)
export const decodeAndPlayAudio = async (base64Audio: string, audioContext: AudioContext) => {
    try {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);

        for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 32768.0;
        }

        const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
        buffer.copyToChannel(float32Data, 0);

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
    } catch (e) {
        console.error("Audio playback error:", e);
    }
};