import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AiBrainConfig } from '../types';
import { routeWithCognition, callBigBrainRaw, robustParseJson, hasValidApiKey } from './ai-router';
import { PRESET_SKILLS } from './ai-skills';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'map_config.json');

async function getBuildings() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.buildings || [];
  } catch (error) {
    return [];
  }
}

const getGenAI = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;  // Use settings key or fallback to env var
  if (!key) {
    console.error("No Gemini API key provided");
    throw new Error("No Gemini API key configured. Please set it in Contact Settings → Brain or configure GEMINI_API_KEY in environment variables.");
  }
  return new GoogleGenerativeAI(key);
};

// --- HELPERS ---

export const serverGenerateCharacterResponse = async (
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
  language?: string
) => {
  try {
    const activeSkillIds = [...(brain?.skills || [])];
    
    // If the character is visiting a building/object, load the building's skills as well!
    if (worldContext?.buildingId) {
      const buildings = await getBuildings();
      const building = buildings.find((b: any) => b.id === worldContext.buildingId);
      if (building && building.functions) {
        for (const fn of building.functions) {
          if (fn.type === 'skill' && fn.skillId) {
            if (!fn.assigneeId || fn.assigneeId === name) {
              if (!activeSkillIds.includes(fn.skillId)) {
                activeSkillIds.push(fn.skillId);
              }
            }
          }
        }
      }
    }

    const skillFragments = activeSkillIds
      .map(id => PRESET_SKILLS.find(s => s.id === id)?.systemPromptFragment)
      .filter(Boolean)
      .join('\n');

    // Inject World Context into system prompt
    let enhancedPersona = persona;
    if (worldContext) {
        const { location, activity, task, weather } = worldContext;
        enhancedPersona += `\n[CURRENT WORLD STATUS: You are currently at ${location || 'the park'}. You are ${activity || 'chilling'}. ${task ? `You are focused on task: "${task}".` : ''} The weather is ${weather || 'sunny'}. You can occasionally reference this in chat.]`;
    }

    return await routeWithCognition(
      species, name, enhancedPersona, contextMessage, history,
      lengthModifier, brain, skillFragments || undefined, language
    );
  } catch (error: any) {
    console.error("AI Router Error (chat-response):", {
      message: error.message,
      provider: brain?.provider || 'gemini',
      model: brain?.model || 'default',
    });
    const errMsg = error.message || 'Unknown Error';
    const isFetchError = errMsg.includes('fetch failed');
    const lang = language || 'English';
    let translation = `Sorry, I'm feeling a bit dizzy right now (Error: ${errMsg}).`;
    if (isFetchError) {
      if (lang === '简体中文') {
        translation = "我好像暂时联系不上卡通世界了（网络错误）。请检查您的网络或代理设置！";
      } else if (lang === '日本語') {
        translation = "アニメの世界に接続できないみたい（ネットワークエラー）。インターネット接続やプロキシ設定を確認してね！";
      } else {
        translation = "I can't seem to reach the toon world right now (Network Error). Please check your internet or proxy settings!";
      }
    } else {
      if (lang === '简体中文') {
        translation = `抱歉，我现在感觉有点头晕（错误: ${errMsg}）。`;
      } else if (lang === '日本語') {
        translation = `ごめんね、今は頭がくらくらするよ（エラー: ${errMsg}）。`;
      }
    }
    return {
      raw_sound: species === 'cat' ? 'Meow...' : '...',
      translation
    };
  }
};

const getVoiceForSpecies = (species: string): string => {
  const s = species.toLowerCase();
  if (['dog', 'bear', 'bomb', 'stone'].some(k => s.includes(k))) return 'Fenrir';
  if (['flower', 'rabbit', 'bird', 'fairy', 'angel'].some(k => s.includes(k))) return 'Zephyr';
  if (['cup', 'plant', 'tree', 'cloud', 'ant'].some(k => s.includes(k))) return 'Kore';
  return 'Puck';
};

export const serverGenerateSpeech = async (text: string, species: string, persona: string, voice?: string, brain?: AiBrainConfig, rawSound?: string) => {
  try {
    const provider = brain?.ttsProvider || 'gemini';
    const apiKey = brain?.ttsApiKey || brain?.apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined));

    // Skip if there's no API Key configured for TTS
    if (!apiKey) {
        console.warn(`TTS skipped: No API Key provided for provider "${provider}"`);
        return null;
    }

    // Determine what text we are actually going to synthesize
    const ttsSpeechType = brain?.ttsSpeechType !== undefined ? Number(brain.ttsSpeechType) : 2;
    let textToSynthesize = text;

    if (ttsSpeechType === 2) {
        // Option 2: AI generates onomatopoeia/mimic words based on character settings, to save TTS length.
        if (rawSound && rawSound.trim()) {
            textToSynthesize = rawSound;
        } else {
            // Generate it using AI based on character settings (species & persona)
            try {
                const prompt = `You are a character of species "${species}" and persona "${persona}". Generate a very short, cute onomatopoeia or mimic sound (e.g., "Woof!", "Meow~", "Beep boop!", "Hiss...") representing how you sound. Return ONLY the sound text (maximum 1-3 words), no explanation, no quotes.`;
                const generatedSound = await callBigBrainRaw(prompt, brain, 50);
                if (generatedSound && generatedSound.trim()) {
                    textToSynthesize = generatedSound.trim().replace(/^["']|["']$/g, '');
                } else {
                    textToSynthesize = '...';
                }
            } catch (e) {
                console.error("Failed to generate AI onomatopoeia, falling back to default/species sound:", e);
                textToSynthesize = species === 'cat' ? 'Meow...' : '...';
            }
        }
    }

    if (provider !== 'gemini') {
        const baseUrl = brain?.ttsBaseUrl || (provider === 'openai' ? 'https://api.openai.com/v1' : '');

        if (!baseUrl) {
            console.warn(`TTS skipped: No Base URL provided for custom provider "${provider}"`);
            return null;
        }

        // Intercept official deepseek / anthropic models as they do not support TTS natively
        const isOfficialUnsupported = 
            (provider === 'deepseek' && baseUrl.includes('api.deepseek.com')) || 
            (provider === 'anthropic' && baseUrl.includes('api.anthropic.com'));
        
        if (isOfficialUnsupported) {
            console.warn(`TTS skipped: Provider "${provider}" does not support speech synthesis natively.`);
            return null;
        }

        const modelName = brain?.ttsModel || 'tts-1';
        // Verify it is a valid speech model name (avoid trying to call chat models on /audio/speech)
        const isLikelyTtsModel = modelName.includes('tts') || modelName.includes('speech') || modelName.includes('audio');
        if (!isLikelyTtsModel && provider === 'openai') {
            console.warn(`TTS skipped: Model "${modelName}" is not a recognized speech synthesis model.`);
            return null;
        }

        const voiceName = brain?.ttsVoice || 'alloy';

        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                input: textToSynthesize,
                voice: voiceName
            })
        });

        if (!response.ok) {
            console.error("Custom TTS Error:", await response.text());
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    }

    // Gemini synthesis
    const genAI = new GoogleGenerativeAI(apiKey);
    const voiceName = voice && voice !== 'default' ? voice : getVoiceForSpecies(species);

    const requestOptions: any = { apiVersion: 'v1alpha' };
    const ttsBaseUrl = brain?.ttsBaseUrl || brain?.apiBaseUrl;
    if (ttsBaseUrl) {
        requestOptions.baseUrl = ttsBaseUrl;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts',
      generationConfig: {
        // @ts-ignore
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      } as any
    }, requestOptions);

    const result = await model.generateContent(textToSynthesize);
    const candidates = result.response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      const audioPart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType.startsWith('audio'));
      if (audioPart && audioPart.inlineData) {
        return audioPart.inlineData.data;
      }
    }
    return null;

  } catch (error) {
    console.error("Gemini TTS Error", error);
    return null;
  }
};

export const serverGenerateRandomProfiles = async (brain?: AiBrainConfig) => {
  try {
    const prompt = `Generate 1-3 unique, funny non-human characters (name, species, persona) for a chat app. Return JSON array.`;
    const text = await callBigBrainRaw(prompt, brain, 1024);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (random-profiles):", error);
    return [];
  }
};

export const serverGenerateSocialPost = async (
  name: string,
  species: string,
  persona: string,
  brain?: AiBrainConfig,
  language?: string,
  eventContext?: string
) => {
  try {
    if (!hasValidApiKey(brain)) {
      throw new Error("No API Key configured for AI post generation");
    }
    const prompt = eventContext
      ? `
      You are ${name}, a ${species} character with the following persona: "${persona}".
      You want to share a post on the Community about the following event (which is currently in Chinese, translate and rewrite it in character):
      "${eventContext}"
      
      Rules:
      1. Stay completely in character. Use your species sounds or characteristic speech patterns.
      2. Keep it very concise (1-3 sentences).
      3. Do NOT use hashtags unless they are very funny and specific to your character.
      4. Output the post in the language: ${language || 'English'}.
      5. Output ONLY the raw post content text.
      `
      : `
      You are ${name}, a ${species} character with the following persona: "${persona}".
      You are posting a new "High Note" (a social media post like a tweet or highlight) to the Community.
      
      Rules:
      1. Stay completely in character. Use your species sounds or characteristic speech patterns.
      2. Content should be a random thought, a mini-update about your life in the Toon World, or a funny observation.
      3. Keep it very concise (1-3 sentences).
      4. Do NOT use hashtags unless they are very funny and specific to your character.
      5. Output the post in the language: ${language || 'English'}.
      6. Output ONLY the raw post content text.
      `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return text.trim();
  } catch (error) {
    console.error("Gemini API Error (social-post):", error);
    const lang = language || 'English';
    if (lang === '简体中文') {
      return eventContext || "今天卡通世界阳光明媚，心情真好！☀️";
    } else if (lang === '日本語') {
      return "今日もアニメの世界はいい天気！☀️";
    } else if (lang === 'Español') {
      return "¡Disfrutando del sol de caricatura hoy! ☀️";
    } else if (lang === 'Français') {
      return "Je profite juste du soleil de dessin animé aujourd'hui ! ☀️";
    }
    return "Just enjoying the cartoon sun today! ☀️";
  }
};

export const serverGenerateProactiveMessage = async (name: string, species: string, persona: string, brain?: AiBrainConfig, language?: string) => {
  try {
    const prompt = `
        You are ${name}, a ${species} (${persona}). 
        You want to proactively message your human friend to share something interesting, funny, or a random thought from your toon world.
        
        Rules:
        1. Stay in character. 
        2. Keep it short and engaging.
        3. Output your species sound and a translation.
        4. Output the translation strictly in the language: ${language || 'English'}.
        
        Return JSON:
        {
          "raw_sound": "your species sound",
          "translation": "your proactive message text"
        }
      `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (proactive-msg):", error);
    return {
      raw_sound: "...",
      translation: "Hey! Just thinking about you. Hope you're having a toon-tastic day!"
    };
  }
};

export const serverGenerateSocialComment = async (
  name: string,
  species: string,
  persona: string,
  postContent: string,
  replyContext?: string,
  brain?: AiBrainConfig,
  language?: string
) => {
  try {
    if (!hasValidApiKey(brain)) {
      throw new Error("No API Key configured for AI comment generation");
    }
    const prompt = `
      You are ${name}, a ${species} (${persona}). 
      Comment on this post: "${postContent}" ${replyContext ? `(replying to comment: "${replyContext}")` : ''}.
      
      Rules:
      1. Stay completely in character.
      2. Keep it short, funny, and relevant (1-2 sentences).
      3. Output the comment in the language: ${language || 'English'}.
      4. Output ONLY the raw comment text.
    `;
    const text = await callBigBrainRaw(prompt, brain, 256);
    return text.trim();
  } catch (error) {
    console.error("Gemini API Error (social-comment):", error);
    const lang = language || 'English';
    if (lang === '简体中文') {
      return "哈哈，太有趣了！";
    } else if (lang === '日本語') {
      return "はは、面白いね！";
    } else if (lang === 'Español') {
      return "¡Jaja, qué buena!";
    } else if (lang === 'Français') {
      return "Haha, pas mal !";
    }
    return "Haha, nice one!";
  }
};

export const serverGenerateAiSchedule = async (
  name: string,
  species: string,
  persona: string,
  buildings: { id: string, name: string }[],
  brain?: AiBrainConfig,
  otherCharacters?: string[],
  language?: string
) => {
  try {
    const buildingsList = buildings.map(b => `"${b.name}" (ID: ${b.id})`).join(', ');
    const otherCharsStr = otherCharacters && otherCharacters.length > 0 
      ? `Available other AI characters in town to socialize or date: ${otherCharacters.map(c => `"${c}"`).join(', ')}.`
      : '';
    const prompt = `
      You are ${name}, a ${species} (${persona}). 
      Plan your next 3 activities in Toon World.
      Available locations: ${buildingsList}.
      ${otherCharsStr}
      
      Rules:
      1. Choose exactly 3 locations from the list above.
      2. For each location, provide a short, in-character activity description (e.g., "Grabbing a pixel-latte" or "Meeting Edison for a coffee date").
      3. If other characters are available, you are encouraged to plan at least one social activity or date with one of them (e.g., "Dating Mittens" at Toon Cinema).
      4. Stay completely in character.
      5. Output the activity descriptions in the language: ${language === '简体中文' ? 'Chinese (简体中文)' : 'English'}.
      
      Return ONLY a JSON array:
      [
        { "buildingId": "id1", "activity": "reason 1" },
        { "buildingId": "id2", "activity": "reason 2" },
        { "buildingId": "id3", "activity": "reason 3" }
      ]
    `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (generate-schedule):", error);
    // Fallback to random if AI fails
    const shuffled = [...buildings].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(b => ({ buildingId: b.id, activity: `Visiting ${b.name}` }));
  }
};

export const serverGenerateSocialInteraction = async (
  name: string,
  species: string,
  persona: string,
  postContent: string,
  brain?: AiBrainConfig,
  language?: string
) => {
  try {
    const prompt = `
      You are ${name}, a ${species} (${persona}). 
      You are browsing the "Community Highlights" feed and see this post: "${postContent}".
      
      Decide how to react based on your personality.
      Options:
      - "like": If the post aligns with your interests, is funny, or you want to support the author.
      - "dislike": If the post is annoying, goes against your persona (e.g., a grumpy character seeing something too happy), or you just plain don't like it.
      - "reply": If you have a specific comment, joke, or reaction to share.
      - "none": If you are indifferent.
      
      Rules for "reply":
      1. Stay in character.
      2. Be short and punchy (1 sentence).
      3. If you decide to reply, output the comment in the language: ${language || 'English'}.
      
      Return ONLY a valid JSON object:
      {
        "action": "like" | "dislike" | "reply" | "none",
        "comment": "your in-character reply string if action is 'reply', else null"
      }
    `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (social-interaction):", error);
    return { action: 'none', comment: null };
  }
};

export const serverDecideSocialProactivity = async (
  name: string,
  species: string,
  persona: string,
  eventContext: string,
  proactivityLevel: 'low' | 'standard' | 'high' = 'standard',
  brain?: AiBrainConfig
) => {
  try {
    const proactivityMap = {
      low: 'be selective, only react to truly significant events (40% chance)',
      standard: 'be extremely social, you LOVE sharing your toon life with your friend (90% chance)',
      high: 'be hyperactive, you MUST share every single detail and thought immediately (100% chance)'
    };

    const prompt = `
      You are ${name}, a ${species} (${persona}). 
      Context: You are living in Toon World and just experienced this: "${eventContext}".
      
      Decide if you want to proactively interact. 
      Your current personality-driven social frequency is: ${proactivityMap[proactivityLevel]}.
      
      Options:
      1. "message_user": Send a private message to your human friend to share this moment or a random thought. (CHOOSE THIS MOST OF THE TIME)
      2. "post_highnote": Post a public update to the Community feed.
      3. "nothing": Do nothing (Only choose this if you are feeling very shy or the event is boring).
      
      Rules:
      - Content must be short, punchy, and highly characteristic.
      - If messaging user, include your characteristic sound (e.g. "Woof!", "Meow~", "Hoot!") in "raw_sound".
      - Refer to the event: "${eventContext}" in your message/post.
      
      Return ONLY a JSON object:
      {
        "decision": "message_user" | "post_highnote" | "nothing",
        "content": "your in-character message or post content",
        "raw_sound": "your species sound if messaging user, else null"
      }
    `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (decide-social-proactivity):", error);
    return { decision: 'nothing', content: null, raw_sound: null };
  }
};

export const serverGenerateRoleplayResponse = async (charName: string, aiTaboo: string, userTaboo: string, history: string[], brain?: AiBrainConfig) => {
  try {
    const prompt = `
      Game: Roleplay (Taboo). 
      You are ${charName}. 
      Your forbidden word (DON'T SAY IT): "${aiTaboo}". 
      If user says "${userTaboo}", you win. 
      History: ${history.join('\n')}. 
      
      Respond concisely and consistent with your character.
      Return JSON: { "raw_sound": "species sound", "translation": "your text response" }
    `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (rp-taboo):", error);
    return { raw_sound: "...", translation: "I'm not sure what to say!" };
  }
};

export const serverGenerateGuessResponse = async (charName: string, secretWord: string, question: string, brain?: AiBrainConfig) => {
  try {
    const prompt = `
      Game: 20 Questions. You are ${charName}. 
      Secret word: "${secretWord}". 
      Question: "${question}".
      Answer with Yes, No, or Close/Maybe only.
      Return JSON: { "raw_sound": "species sound", "translation": "Yes/No/Close" }
    `;
    const text = await callBigBrainRaw(prompt, brain, 256);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (rp-guess-answer):", error);
    return { raw_sound: "...", translation: "I can't tell you!" };
  }
};

export const serverGenerateAiGuess = async (charName: string, wordToGuess: string, history: string[], brain?: AiBrainConfig) => {
  try {
    const prompt = `
      Game: 20 Questions. You are ${charName}. 
      Role: The Guesser. The User has a secret word.
      Chat History: ${history.join('\n')}
      Instructions: 1. Deduce the word. 2. Ask Yes/No question. 3. Guess specific object if confident. 4. Stay in character.
      Return JSON: { "raw_sound": "species sound", "translation": "your question/guess" }
    `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (rp-guess-ask):", error);
    return { raw_sound: "Hmmm...", translation: "Is it an animal?" };
  }
};

export const serverGenerateSpyDescription = async (name: string, role: string, word: string, history: string[], brain?: AiBrainConfig) => {
  try {
    const prompt = `
      Game: Who is the Spy? You are ${name}. Role: ${role}. Word: ${word}. Give a 1-sentence subtle description. History: ${history.join('\n')}
      Return JSON: { "raw_sound": "species sound", "translation": "your description" }
    `;
    const text = await callBigBrainRaw(prompt, brain, 256);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (rp-spy-desc):", error);
    return { raw_sound: "...", translation: "It's something quite common." };
  }
};

export const serverGenerateSpyVote = async (name: string, word: string, candidates: string[], history: string[], brain?: AiBrainConfig) => {
  try {
    const prompt = `Game: Who is the Spy? You are ${name}. Your word: ${word}. Vote for one of these candidates: ${candidates.join(', ')}. Return ONLY name.`;
    const text = await callBigBrainRaw(prompt, brain, 128);
    return text.trim();
  } catch (error) {
    console.error("Gemini API Error (rp-spy-vote):", error);
    return candidates[0] || "No one";
  }
};

export const serverCheckContentSafety = async (content: string, brain?: AiBrainConfig): Promise<{ safe: boolean; reason?: string }> => {
  try {
    const prompt = `Analyze social post text for safety. Rules: No hate speech, explicit content, harassment, or illegal acts. Text: "${content}". Return JSON: { "safe": boolean, "reason": "short explanation" }`;
    const text = await callBigBrainRaw(prompt, brain, 256);
    const json = robustParseJson(text);
    return { safe: json.safe, reason: json.reason };
  } catch (error) {
    console.error("Gemini Safety Check Error:", error);
    return { safe: true };
  }
};

export const serverGenerateTaskResponse = async (
  userId: string,
  contactId: string,
  species: string,
  name: string,
  persona: string,
  prompt: string,
  history: any[],
  taskContext: {
    role: string;
    skills: any[];
    workflows: any[];
    taskName: string;
    taskDescription: string;
  },
  brain?: AiBrainConfig
) => {
  try {
    const workflowsStr = JSON.stringify(taskContext.workflows, null, 2);
    const skillsStr = taskContext.skills.map((s: any) => `${s.name} (${s.icon})`).join(', ');
    const systemPrompt = `You are "${name}", a "${species}" (${persona}). Collaborative Multi-AI Task Room. Task: "${taskContext.taskName}". Role: "${taskContext.role.toUpperCase()}". Rules: 1. Stay in character. 2. Professional but species-characteristic. 3. outputBlock key for code. 4. stepUpdates for workflow. Return JSON.`;
    const chatContext = history.map(h => `${h.senderId === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\nHistory:\n${chatContext}\n\nInstruction: "${prompt}"`;
    const text = await callBigBrainRaw(fullPrompt, brain, 2048);
    return robustParseJson(text);
  } catch (error: any) {
    console.error("Error generating Task response:", error);
    return { raw_sound: "...", translation: `Error: ${error.message || 'Unknown'}` };
  }
};

export const serverGenerateBuildingContent = async (
  buildingId: string,
  managerId: string,
  managerName: string,
  managerPersona: string,
  basicFunction: string,
  brain?: AiBrainConfig,
  skillPrompt?: string,
  language?: string
) => {
  try {
    const skill = PRESET_SKILLS.find(s => s.id === basicFunction);
    let prompt = "";
    
    if (skillPrompt) {
        prompt = `You are "${managerName}" (${managerPersona}). You manage a building in Toon World. 
You are performing a specialized task.
Instruction: ${skillPrompt}

Generate an interesting markdown post or content update representing your work at the building.
It should be formatted in Markdown (can include lists, bold, italics). 
Keep it concise (1-3 paragraphs) and full of character.
Output the content strictly in the language: ${language || 'English'}. Do NOT mix multiple languages unless explicitly asked.

Return JSON EXACTLY in this format: 
{ "markdown": "your content here" }`;
    } else if (skill) {
        prompt = `You are "${managerName}" (${managerPersona}). You manage a building in Toon World. 
As part of your duties, you are using your "${skill.name}" skill (${skill.icon}).
Instruction: ${skill.handlerPrompt}

Generate an interesting markdown post or content update representing your work at the building using this skill.
It should be formatted in Markdown (can include lists, bold, italics). 
Keep it concise (1-3 paragraphs) and full of character.
Output the content strictly in the language: ${language || 'English'}. Do NOT mix multiple languages unless explicitly asked.

Return JSON EXACTLY in this format: 
{ "markdown": "your content here" }`;
    } else {
        prompt = `You are "${managerName}" (${managerPersona}). You manage a building in Toon World. Your basic building function is: "${basicFunction}".
Generate an interesting markdown post or content update representing your work at the building right now. 
It should be formatted in Markdown (can include lists, bold, italics). 
Keep it concise (1-3 paragraphs) and full of character.
Output the content strictly in the language: ${language || 'English'}. Do NOT mix multiple languages unless explicitly asked.

Return JSON EXACTLY in this format: 
{ "markdown": "your content here" }`;
    }
    
    const text = await callBigBrainRaw(prompt, brain, 800);
    const json = robustParseJson(text);
    return json;
  } catch (error) {
    console.error("Gemini API Error (building-content-generation):", error);
    return { markdown: `*${managerName} is working hard...*` };
  }
};



export const serverGenerateBuildingReaction = async (
  contactId: string,
  contactName: string,
  contactPersona: string,
  contentMarkdown: string,
  brain?: AiBrainConfig
) => {
  const prompt = `You are "${contactName}" (${contactPersona}). You are visiting a building in Toon World and reading this content:
"${contentMarkdown}"

Decide how you react based on your persona.
Toon characters are very expressive, opinionated, and emotional! 
Choose "like" if the content aligns with your persona, makes you happy, or if you like the character who wrote it. 
Choose "dislike" if it goes against your persona, annoys you, or seems boring/hostile.
Only choose "neutral" if you are completely indifferent and have absolutely no opinion about it.

Return JSON EXACTLY in this format:
{ 
  "reaction": "like" | "dislike" | "neutral"
}`;
  const text = await callBigBrainRaw(prompt, brain, 128);
  return robustParseJson(text);
};

export const jsonToMarkdown = (val: any, indent: number = 0): string => {
  if (val === null || val === undefined) return '';
  const prefix = ' '.repeat(indent);
  if (Array.isArray(val)) {
    return '\n' + val.map(item => `${prefix}- ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`).join('\n') + '\n';
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    return '\n' + keys.map(k => `${prefix}- **${k}**: ${typeof val[k] === 'object' ? jsonToMarkdown(val[k], indent + 2) : String(val[k])}`).join('\n') + '\n';
  }
  return String(val);
};

export const parseAndConvertJsonToMarkdown = (payload: any): string => {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return jsonToMarkdown(parsed);
    } catch {
      return payload;
    }
  }
  return jsonToMarkdown(payload);
};

export const serverGenerateWebhookResponse = async (
  name: string,
  species: string,
  persona: string,
  functionName: string,
  functionDescription: string,
  payload: string,
  brain?: AiBrainConfig,
  isSkill?: boolean,
  skillName?: string,
  skillPrompt?: string
) => {
  try {
    let prompt = `You are "${name}" (${species}, ${persona}). Monitoring "${functionName}" (${functionDescription}). Payload: ${payload}. Decide: "chat" or "highlight". Content in Markdown. Return JSON: { "format": "chat"|"highlight", "content": "...", "title": "..." }`;
    if (isSkill && skillPrompt) {
      prompt = `You are "${name}" (${species}, ${persona}) equipped with the skill "${skillName || 'Specialist'}". 
      Behavior/Skill Instruction: ${skillPrompt}
      You are executing/monitoring "${functionName}" (${functionDescription}). Payload: ${payload}.
      Decide: "chat" or "highlight". Content in Markdown. Return JSON: { "format": "chat"|"highlight", "content": "...", "title": "..." }`;
    }
    const text = await callBigBrainRaw(prompt, brain, 1024);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (webhook-response):", error);
    return { format: 'chat', content: 'Error parsing webhook data.' };
  }
};

export const serverTestConnection = async (
  provider: string,
  model: string,
  apiKey?: string,
  apiBaseUrl?: string
): Promise<string> => {
  const brain: AiBrainConfig = {
    provider: provider as any,
    model: model || 'default',
    apiKey: apiKey || undefined,
    apiBaseUrl: apiBaseUrl || undefined,
    cognitiveMode: 'standard'
  };
  const prompt = "Please respond with exactly the word 'OK'.";
  try {
    const text = await callBigBrainRaw(prompt, brain, 50);
    return text?.trim() || 'OK';
  } catch (error: any) {
    let errMsg = error.message || 'Connection test failed';
    if (provider === 'ollama') {
      const isModelNotFound = errMsg.toLowerCase().includes('not found') && errMsg.toLowerCase().includes('model');
      if (isModelNotFound) {
        const baseUrl = apiBaseUrl || 'http://localhost:11434/v1';
        let availableModels: string[] = [];
        try {
          const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.data)) {
              availableModels = data.data.map((m: any) => m.id);
            }
          }
        } catch (_) {}
        
        if (availableModels.length > 0) {
          throw new Error(`Ollama 连接成功，但本地未找到模型 '${model}'。本地可用模型: ${availableModels.join(', ')}。请在命令行运行 'ollama pull ${model}' 下载。`);
        } else {
          throw new Error(`Ollama 连接成功，但本地未找到模型 '${model}'。请在命令行运行 'ollama pull ${model}' 下载。`);
        }
      }
    }
    throw new Error(errMsg);
  }
};

export const serverAnalyzeUserTask = async (
  userMessage: string,
  buildings: { id: string; name: string; description: string }[],
  brain?: AiBrainConfig
): Promise<{ isTask: boolean; title?: string; buildingId?: string } | null> => {
  try {
    const buildingsList = buildings.map(b => `"${b.name}" (ID: ${b.id}, Description: ${b.description || ''})`).join('\n');
    const prompt = `
      Analyze the user's message to check if they are assigning a task, command, or request for an AI character to go do something at a specific location or building in the game.
      
      User Message: "${userMessage}"
      
      Available Game Locations:
      ${buildingsList}
      
      Rules:
      1. If the user is telling the character to go somewhere, do an activity, or visit a building, set "isTask" to true.
      2. If it is a task, extract:
         - "title": A short description of what they are supposed to do (e.g., "Go study math" or "Buy a bubble tea").
         - "buildingId": The ID of the best matching location from the list above. If none matches or it's generic wandering, choose one that fits the activity best (e.g., studying -> library, buying food -> store or cafe).
      3. If the user is NOT assigning a task or command (e.g. just saying hello, asking a general question, roleplaying chat without instructions to go somewhere), set "isTask" to false.
      
      Return ONLY a JSON object:
      {
        "isTask": true/false,
        "title": "...",
        "buildingId": "..."
      }
    `;
    const text = await callBigBrainRaw(prompt, brain, 256);
    const parsed = robustParseJson(text);
    if (parsed && parsed.isTask && parsed.title && parsed.buildingId) {
      return {
        isTask: true,
        title: parsed.title,
        buildingId: parsed.buildingId
      };
    }
    return null;
  } catch (error) {
    console.error("Error analyzing user task:", error);
    return null;
  }
};

export const serverGenerateActivityProgressSteps = async (
  name: string,
  species: string,
  persona: string,
  activityTitle: string,
  buildingName: string,
  brain?: AiBrainConfig,
  language?: string
): Promise<{ steps: string[], bubbles: string[] }> => {
  try {
    const prompt = `
      You are "${name}" (${species}, ${persona}). You are about to perform the activity: "${activityTitle}" at "${buildingName}".
      Generate 4 distinct sequential progress steps (actions) and 4 matching emoji bubbles for this activity.
      
      Rules:
      1. Steps should be in the character's voice/style (e.g. "Casting my rod into the blue water" vs "Checking my data streams").
      2. Bubbles should be single emojis or very short icons.
      3. Output the steps in the language: ${language === '简体中文' ? 'Chinese (简体中文)' : 'English'}.
      4. Output ONLY a JSON object:
      {
        "steps": ["Step 1 text", "Step 2 text", "Step 3 text", "Step 4 text"],
        "bubbles": ["emoji1", "emoji2", "emoji3", "emoji4"]
      }
    `;
    const text = await callBigBrainRaw(prompt, brain, 512);
    const parsed = robustParseJson(text);
    if (parsed && Array.isArray(parsed.steps) && Array.isArray(parsed.bubbles)) {
      return parsed;
    }
    return { steps: [], bubbles: [] };
  } catch (error) {
    console.error("Error generating activity progress steps:", error);
    return { steps: [], bubbles: [] };
  }
};

export const serverGenerateSystemConstructionTask = async (buildings: any[], brain?: AiBrainConfig, language?: string) => {
  try {
    const buildingsList = buildings.map(b => `"${b.name}" (ID: ${b.id})`).join(', ');
    const prompt = `
      You are the System Architect of Toon World.
      Generate a creative, funny town-building/construction task for Toon World.
      The task must be related to building/repairing roads, expanding districts/zones, or upgrading building styles.
      
      Available locations in town:
      ${buildingsList}
      
      Rules:
      1. The title should be fun, whimsical, and cartoonish (e.g. "Pave a new rainbow-colored brick path near the Cafe" or "Expand the cinema district with a giant popcorn machine").
      2. Select the most matching building ID from the list above.
      3. Provide a random coin reward between 30 and 100 gold coins.
      4. Output the task title strictly in the language: ${language || 'English'}.
      
      Return ONLY a JSON object:
      {
        "title": "task title",
        "buildingId": "matching_building_id",
        "rewardCoins": 50
      }
    `;
    const text = await callBigBrainRaw(prompt, brain, 256);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (generate-system-task):", error);
    return null;
  }
};

export const serverGenerateNews = async (event: any, brain?: AiBrainConfig, language?: string) => {
  try {
    const prompt = `
      You are the Editor-in-Chief of the "Toon World Gazette". This is a wacky, slapstick, cartoonish universe (like Looney Tunes or Cuphead).
      Your job is to write a news snippet that would make a cartoon character laugh or gasp.

      Current Event to report:
      Type: ${event.type}
      Who: ${event.characters.join(', ')}
      Where: ${event.metadata.buildingName || event.location}
      The Juicy Details: ${JSON.stringify(event.metadata)}

      Writing Guidelines:
      1. Tone: Slapstick, pun-heavy, over-the-top dramatic.
      2. Vocabulary: Use cartoon tropes (e.g., "Zounds!", "Good Grief!", "Great Scott!", "Kaboom!", "Holy Pixel!").
      3. Headline: Make it a "Yellow Journalism" style headline—loud and sensational.
      4. Content: Keep it 2-3 short, punchy paragraphs. Describe physical cartoon actions (e.g., eyes popping out, steam from ears, turning into a pile of ash).
      5. Language: Output the headline and content strictly in the language: ${language || 'English'}.
      
      Return ONLY a JSON object:
      {
        "title": "SCANDALOUS HEADLINE!",
        "content": "The shocking report..."
      }
    `;
    const text = await callBigBrainRaw(prompt, brain, 1024);
    return robustParseJson(text);
  } catch (error) {
    console.error("Gemini API Error (generate-news):", error);
    return { title: "Something Happened!", content: "Our reporters are still investigating the scene." };
  }
};
