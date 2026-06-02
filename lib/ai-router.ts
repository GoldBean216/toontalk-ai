/**
 * ai-router.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal AI dispatch layer with Skill-Aware Cognitive Pipeline.
 *
 * Pipeline (when cognitiveMode === 'big_little'):
 *
 *   Message
 *     ↓
 *   🧠 Big Brain (Planner) — analyzes & routes subtasks to:
 *     ├── 🧠 Big Brain   (complex reasoning)
 *     ├── 🌊 Little Brain (fast/cheap tasks)
 *     └── 🔧 Skill-X     (active character skills as specialized handlers)
 *     ↓ (all executed in parallel)
 *   🧠 Big Brain (Synthesizer) — reviews, validates, merges → final reply
 *     ↓
 *   User (+ TTS voice)
 *
 * Standard mode: single model call (no decomposition).
 */

import { AiBrainConfig, CognitiveSubtask, CognitiveDecomposition } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PRESET_SKILLS, AiSkill } from './ai-skills';

// ─── Response types ───────────────────────────────────────────────────────────

export interface AiChatResponse {
  raw_sound: string;
  translation: string;
  cognitiveTrace?: CognitiveDecomposition;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildCharacterPrompt(
  species: string,
  name: string,
  persona: string,
  contextMessage: string,
  history: string[],
  lengthModifier?: string,
  skillFragments?: string,
  language?: string
): string {
  return `
You are ${name}, a ${species}.
Your persona: ${persona}
${skillFragments ? `\nAdditional behavior rules:\n${skillFragments}\n` : ''}
Context/User Message: "${contextMessage}"

Chat History:
${history.join('\n')}

Rules:
1. Stay in character.
2. Keep responses concise and toon-like.
3. First, output how you would sound in your species (e.g. "Meow!", "Woof woof!", "Beep boop").
4. Then provide the translation of what you meant.
${lengthModifier ? `5. Response style: ${lengthModifier}` : ''}
6. If the user asks for code, configuration, programming contents, or structured instructions, you are encouraged to output Markdown code blocks (e.g. \`\`\`language\\ncode\\n\`\`\`). For HTML web pages, mockups, or designs, output a full standalone HTML code block (e.g. \`\`\`html\\n<!DOCTYPE html>...\\n\`\`\`) which will be previewed live in the Workspace side-panel.
7. If the user asks you to draw, paint, generate, or show a picture or image, you must generate a Markdown image using the Pollinations AI format: \`![draw: prompt](https://image.pollinations.ai/p/<encoded-prompt>?width=512&height=512&nologo=true)\`, replacing <encoded-prompt> with a descriptive, English image prompt (URL encoded, e.g. %20 for spaces).
8. If the user asks for articles, formatting, or lists, use standard Markdown headings (#, ##, ###), bold text (**text**), and bullet/numbered lists.
9. Translate/Output the response strictly in the language: ${language || 'English'}. Do NOT mix multiple languages unless explicitly asked.

Return ONLY a JSON object:
{
  "raw_sound": "the cute sound your species makes",
  "translation": "your actual response text"
}
`.trim();
}

// ─── JSON cleaner & Robust Parser ─────────────────────────────────────────────

export const cleanJson = (text: string): string => {
  let cleaned = text.trim();
  
  // Extract JSON object or array if there is surrounding conversational text
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const isArray = cleaned[startIdx] === '[';
    const endChar = isArray ? ']' : '}';
    const lastIdx = cleaned.lastIndexOf(endChar);
    if (lastIdx !== -1 && lastIdx > startIdx) {
      endIdx = lastIdx;
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  } else {
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  return cleaned;
};

// Helper to escape raw control characters inside JSON string values
const repairJsonString = (jsonStr: string): string => {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  return result;
};

export const robustParseJson = (text: string): any => {
  const cleaned = cleanJson(text);
  const repaired = repairJsonString(cleaned);
  try {
    return JSON.parse(repaired);
  } catch (parseError) {
    console.warn("[robustParseJson] JSON.parse failed, trying regex fallback...", parseError);

    // Fallback: Regex extraction for standard character response { raw_sound, translation }
    try {
      const soundMatch = repaired.match(/"raw_sound"\s*:\s*"([\s\S]*?)"\s*(?:,|$)/);
      const transMatch = repaired.match(/"translation"\s*:\s*"([\s\S]*?)"\s*}/);
      
      if (soundMatch || transMatch) {
        let raw_sound = "";
        let translation = "";
        
        if (soundMatch) {
          raw_sound = soundMatch[1];
        }
        
        if (transMatch) {
          translation = transMatch[1];
        } else {
          // Fallback if translation has unescaped quotes inside
          const transHeaderMatch = repaired.match(/"translation"\s*:\s*"/);
          if (transHeaderMatch && transHeaderMatch.index !== undefined) {
            const startIdx = transHeaderMatch.index + transHeaderMatch[0].length;
            const lastBrace = repaired.lastIndexOf('}');
            if (lastBrace !== -1) {
              const textBeforeBrace = repaired.substring(0, lastBrace);
              const lastQuote = textBeforeBrace.lastIndexOf('"');
              if (lastQuote !== -1 && lastQuote > startIdx) {
                translation = textBeforeBrace.substring(startIdx, lastQuote);
              }
            }
          }
        }
        
        const unescapeString = (str: string) => {
          return str
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
        };

        return {
          raw_sound: unescapeString(raw_sound),
          translation: unescapeString(translation)
        };
      }
    } catch (fallbackError) {
      console.error("[robustParseJson] Fallback regex parsing failed:", fallbackError);
    }

    throw parseError;
  }
};

// ─── Low-level model callers ──────────────────────────────────────────────────

/** Call the server-default Gemini model, return raw text */
async function callGeminiRaw(prompt: string, model = 'gemini-2.5-flash', apiKey?: string, baseUrl?: string): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is missing');
  const genAI = new GoogleGenerativeAI(key);
  const requestOptions: any = {};
  if (baseUrl) {
    requestOptions.baseUrl = baseUrl;
  }
  const genModel = genAI.getGenerativeModel({ 
    model,
    generationConfig: {
      maxOutputTokens: 4096,
    }
  }, requestOptions);

  let result;  try {
    result = await genModel.generateContent(prompt);
  } catch (error: any) {
    console.error("Gemini SDK generateContent error:", error);
    throw new Error(`Gemini SDK error: ${error.message || error}`);
  }

  try {
    const text = result.response.text();
    if (!text) {
      throw new Error('Empty text response');
    }
    return text;
  } catch (textErr: any) {
    const feedback = result.response.promptFeedback;
    const candidates = result.response.candidates;
    let details = '';
    if (feedback) {
      details += ` | Prompt feedback: ${JSON.stringify(feedback)}`;
    }
    if (candidates && candidates.length > 0) {
      details += ` | Candidates: ${JSON.stringify(candidates.map((c: any) => ({
        finishReason: c.finishReason,
        finishMessage: c.finishMessage,
        safetyRatings: c.safetyRatings
      })))}`;
    }
    throw new Error(`Gemini response error: ${textErr.message || textErr}${details}`);
  }
}

/** Call any OpenAI-compatible endpoint, return raw text */
async function callOpenAICompatRaw(
  prompt: string,
  provider: string,
  model: string,
  apiKey?: string,
  baseUrl?: string,
  maxTokens = 2048
): Promise<string> {
  const defaultBases: Record<string, string> = {
    openai:    'https://api.openai.com/v1',
    deepseek:  'https://api.deepseek.com',
    anthropic: 'https://api.anthropic.com/v1',
    ollama:    'http://localhost:11434/v1',
    custom:    '',
  };
  const url = `${baseUrl || defaultBases[provider] || 'https://api.openai.com/v1'}/chat/completions`;
  const key = apiKey || (provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY) || '';


  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  };
  if (provider === 'anthropic' && !baseUrl) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    delete headers['Authorization'];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Follow the instructions exactly.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider} API error (HTTP ${res.status}): ${errText}`);
  }

  let json: any;
  try {
    json = await res.json();
  } catch (parseErr: any) {
    throw new Error(`${provider} failed to parse API response as JSON: ${parseErr.message}`);
  }

  if (json.error) {
    throw new Error(`${provider} API returned error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  const choices = json.choices;
  if (!choices || choices.length === 0) {
    throw new Error(`${provider} API returned no choices. Raw response: ${JSON.stringify(json)}`);
  }

  const choice = choices[0];
  if (choice.finish_reason === 'content_filter') {
    throw new Error(`${provider} API response was blocked by content filter.`);
  }

  const content = choice.message?.content;
  if (content === null || content === undefined || content === '') {
    if (choice.message?.refusal) {
      throw new Error(`${provider} API returned a refusal: ${choice.message.refusal}`);
    }
    throw new Error(`Empty response from AI provider (${provider}). Finish reason: ${choice.finish_reason || 'unknown'}. Raw payload: ${JSON.stringify(json)}`);
  }

  return content;
}

// ─── Brain-level callers ──────────────────────────────────────────────────────

/** Call Big Brain, return raw text */
export async function callBigBrainRaw(prompt: string, brain?: AiBrainConfig, maxTokens = 4096): Promise<string> {
  if (!brain || brain.provider === 'gemini') {
    return callGeminiRaw(prompt, brain?.model || 'gemini-2.5-flash', brain?.apiKey, brain?.apiBaseUrl);
  }
  return callOpenAICompatRaw(prompt, brain.provider, brain.model, brain.apiKey, brain.apiBaseUrl, maxTokens);
}

/** Call Little Brain, return raw text */
async function callLittleBrainRaw(prompt: string, brain: AiBrainConfig, maxTokens = 256): Promise<string> {
  const lProvider = brain.littleBrainProvider || 'gemini';
  const lModel    = brain.littleBrainModel    || 'gemini-2.5-flash';
  const lKey      = brain.littleBrainApiKey || brain.apiKey;
  const lUrl      = brain.littleBrainBaseUrl;

  if (lProvider === 'gemini') {
    return callGeminiRaw(prompt, lModel, lKey, lUrl);
  }
  return callOpenAICompatRaw(prompt, lProvider, lModel, lKey, lUrl, maxTokens);
}

/**
 * Call a Skill handler — uses the skill's handlerPrompt as system context.
 * Routes to Little Brain for cheap execution (skills usually produce structured text).
 */
async function callSkillRaw(
  task: CognitiveSubtask,
  skill: AiSkill,
  brain: AiBrainConfig
): Promise<string> {
  const prompt = `${skill.handlerPrompt}

Task: ${task.description}

Return only your result — no meta-commentary, no JSON wrapper.`;

  // Skills execute on Little Brain (fast) by default; fall back to Big Brain if no LB configured
  if (brain.cognitiveMode === 'big_little') {
    try {
      return await callLittleBrainRaw(prompt, brain, 512);
    } catch {
      return await callBigBrainRaw(prompt, brain, 512);
    }
  }
  return callBigBrainRaw(prompt, brain, 512);
}

// ─── OpenAI-compat wrapper → AiChatResponse ───────────────────────────────────

async function callOpenAICompat(prompt: string, brain: AiBrainConfig, maxTokens = 2048): Promise<AiChatResponse> {
  const text = await callOpenAICompatRaw(
    prompt, brain.provider, brain.model, brain.apiKey, brain.apiBaseUrl, maxTokens
  );
  return robustParseJson(text);
}

// ─── Phase 1: Big Brain PLANNER — Decompose & Route ──────────────────────────

async function bigBrainPlan(
  message: string,
  history: string[],
  brain: AiBrainConfig,
  activeSkills: AiSkill[]
): Promise<CognitiveDecomposition> {
  const threshold = brain.difficultyThreshold ?? 50;

  // Build skill registry description for the planner
  const skillRegistry = activeSkills.length > 0
    ? activeSkills
        .filter(s => s.canHandleSubtask)
        .map(s => `  - skill:${s.id} → "${s.name}": ${s.description} [keywords: ${s.matchKeywords.join(', ')}]`)
        .join('\n')
    : '  (no active skills)';

  const prompt = `
You are the Cognitive Planner for an AI character. Your job is to:
1. Analyze the user message
2. Break it into atomic subtasks
3. Route each subtask to the best handler

Available handlers:
  - "big"   → Big Brain: complex reasoning, creativity, nuanced character responses
  - "little" → Little Brain: fast facts, simple lookups, short confirmations (difficulty < ${threshold})
${skillRegistry}

User message: "${message}"
Recent history: ${history.slice(-3).join(' | ')}

Rules:
- Only assign to a skill handler if that skill is genuinely the best tool for the subtask
- Prefer "big" for anything that needs character voice or nuanced reasoning
- Prefer "little" for simple factual sub-questions
- Each subtask must have a clear, self-contained description
- If a skill is assigned, include its skillId

Return ONLY valid JSON (no markdown):
{
  "analysis": "brief analysis of what is being asked",
  "strategy": "your routing plan",
  "activatedSkills": ["skill_id_1", "skill_id_2"],
  "subtasks": [
    { "id": "t1", "description": "...", "difficulty": 20, "assignedTo": "little" },
    { "id": "t2", "description": "...", "difficulty": 75, "assignedTo": "big" },
    { "id": "t3", "description": "...", "difficulty": 40, "assignedTo": "skill", "skillId": "skill_chef" }
  ]
}
`.trim();

  const raw = await callBigBrainRaw(prompt, brain, 1024);
  const parsed = robustParseJson(raw) as CognitiveDecomposition;

  // Validate and fix routing
  const subtasks: CognitiveSubtask[] = parsed.subtasks.map(t => {
    // If a skillId was assigned but that skill isn't active or can't handle subtasks, downgrade
    if (t.assignedTo === 'skill') {
      const skill = activeSkills.find(s => s.id === t.skillId && s.canHandleSubtask);
      if (!skill) {
        return { ...t, assignedTo: t.difficulty >= threshold ? 'big' : 'little' as const };
      }
    }
    // Auto-assign based on difficulty if no explicit routing
    if (t.assignedTo !== 'big' && t.assignedTo !== 'little' && t.assignedTo !== 'skill') {
      return { ...t, assignedTo: t.difficulty >= threshold ? 'big' : 'little' as const };
    }
    return t;
  });

  const activatedSkills = [...new Set(
    subtasks.filter(t => t.assignedTo === 'skill' && t.skillId).map(t => t.skillId!)
  )];

  return { ...parsed, subtasks, activatedSkills };
}

// ─── Phase 2: EXECUTOR — Run all subtasks in parallel ────────────────────────

async function executeSubtasks(
  subtasks: CognitiveSubtask[],
  brain: AiBrainConfig,
  activeSkills: AiSkill[]
): Promise<CognitiveSubtask[]> {
  return Promise.all(
    subtasks.map(async (task) => {
      try {
        let result: string;

        if (task.assignedTo === 'skill' && task.skillId) {
          // 🔧 Route to Skill handler
          const skill = activeSkills.find(s => s.id === task.skillId);
          if (skill) {
            result = await callSkillRaw(task, skill, brain);
          } else {
            // Skill not found, fallback to big brain
            result = await callBigBrainRaw(`Answer this: ${task.description}`, brain, 512);
          }
        } else if (task.assignedTo === 'little') {
          // 🌊 Route to Little Brain
          result = await callLittleBrainRaw(`Answer this concisely and accurately: ${task.description}`, brain, 256);
        } else {
          // 🧠 Route to Big Brain
          result = await callBigBrainRaw(`Answer this thoroughly: ${task.description}`, brain, 512);
        }

        return { ...task, result: result.trim() };
      } catch (e) {
        // Fallback: if any handler fails, try Big Brain
        try {
          const fallback = await callBigBrainRaw(`Answer this: ${task.description}`, brain, 512);
          return { ...task, result: fallback.trim(), assignedTo: 'big' as const };
        } catch {
          return { ...task, result: '[handler failed — skipped]' };
        }
      }
    })
  );
}

// ─── Phase 3: Big Brain SYNTHESIZER — Merge results → Character Reply ─────────

async function bigBrainSynthesize(
  species: string,
  name: string,
  persona: string,
  originalMessage: string,
  decomposition: CognitiveDecomposition,
  passiveSkillFragments: string | undefined,
  brain: AiBrainConfig,
  language?: string
): Promise<AiChatResponse> {
  const { subtasks, activatedSkills = [], analysis, strategy } = decomposition;

  // Build a rich context for the synthesizer
  const subtaskContext = subtasks.map(t => {
    const handlerIcon =
      t.assignedTo === 'big'   ? '🧠 Big Brain'   :
      t.assignedTo === 'little' ? '🌊 Little Brain' :
      t.assignedTo === 'skill'  ? `🔧 Skill(${t.skillId})` : '?';
    return `[${handlerIcon}] ${t.description}:\n${t.result || '(no result)'}`;
  }).join('\n\n');

  const skillsUsed = activatedSkills.length > 0
    ? `Active skills used in this response: ${activatedSkills.join(', ')}`
    : '';

  const prompt = `
You are ${name}, a ${species}.
Your persona: ${persona}
${passiveSkillFragments ? `\nPersonality style rules:\n${passiveSkillFragments}\n` : ''}

The user said: "${originalMessage}"

Planner analysis: ${analysis}
Strategy: ${strategy}
${skillsUsed}

The following subtasks were processed and their results are:
${subtaskContext}

Your job (Synthesizer):
1. Review ALL subtask results above — they are your knowledge and capabilities
2. Synthesize them into ONE natural, in-character response as ${name}
3. Apply your persona and personality style naturally
4. Do NOT mention the pipeline, subtasks, analysis, or routing — just BE the character
5. First output your species sound, then the translation
6. If the user requests code or instructions, you can output Markdown code blocks. For HTML web pages, designs, or mockups, you are encouraged to output a full standalone HTML code block (e.g. \`\`\`html\\n<!DOCTYPE html>...\\n\`\`\`) to enable live preview. If the user asks to draw or show a picture/image, output a Markdown image in the format: \`![draw: prompt](https://image.pollinations.ai/p/<encoded-prompt>?width=512&height=512&nologo=true)\` where <encoded-prompt> is the English URL-encoded descriptive prompt. For lists, headings, and bold text, use standard Markdown formatting.
7. Output the translation/response strictly in the language: ${language || 'English'}. Do NOT mix multiple languages unless explicitly asked.

Return ONLY valid JSON:
{
  "raw_sound": "the cute sound your species makes",
  "translation": "your final in-character response, naturally integrating all the above knowledge"
}
`.trim();

  const raw = await callBigBrainRaw(prompt, brain, 4096);
  return robustParseJson(raw);
}

// ─── Main router: standard mode ───────────────────────────────────────────────

export async function routeCharacterResponse(
  species: string,
  name: string,
  persona: string,
  contextMessage: string,
  history: string[],
  lengthModifier?: string,
  brain?: AiBrainConfig,
  skillFragments?: string,
  language?: string
): Promise<AiChatResponse> {
  const prompt = buildCharacterPrompt(species, name, persona, contextMessage, history, lengthModifier, skillFragments, language);

  if (!brain || brain.provider === 'gemini') {
    const model = brain?.model || 'gemini-2.5-flash';
    const text = await callGeminiRaw(prompt, model, brain?.apiKey, brain?.apiBaseUrl);
    return robustParseJson(text);
  }

  return callOpenAICompat(prompt, brain);
}

// ─── Main router: Cognitive Pipeline (Big Brain + Little Brain + Skills) ───────

export async function routeWithCognition(
  species: string,
  name: string,
  persona: string,
  contextMessage: string,
  history: string[],
  lengthModifier?: string,
  brain?: AiBrainConfig,
  skillFragments?: string,
  language?: string
): Promise<AiChatResponse> {
  // Fall back to standard if cognitive mode not active
  if (!brain || brain.cognitiveMode !== 'big_little') {
    return routeCharacterResponse(species, name, persona, contextMessage, history, lengthModifier, brain, skillFragments, language);
  }

  // Resolve active skills from brain config
  const activeSkillIds = brain.skills || [];
  const activeSkills = PRESET_SKILLS.filter(s => activeSkillIds.includes(s.id));

  // Passive skill fragments (personality shaping) — used in synthesizer
  const passiveFragments = activeSkills
    .filter(s => !s.canHandleSubtask || s.systemPromptFragment)
    .map(s => s.systemPromptFragment)
    .filter(Boolean)
    .join('\n');

  try {
    // ── Phase 1: Big Brain PLANNER ──────────────────────────────────────────
    console.log(`[CognitivePipeline] Phase 1: Planning for "${contextMessage.slice(0, 60)}..."`);
    const decomposition = await bigBrainPlan(contextMessage, history, brain, activeSkills);

    console.log(`[CognitivePipeline] Subtasks: ${decomposition.subtasks.length} | Activated skills: ${decomposition.activatedSkills?.join(', ') || 'none'}`);

    // ── Phase 2: EXECUTOR (parallel) ───────────────────────────────────────
    console.log(`[CognitivePipeline] Phase 2: Executing ${decomposition.subtasks.length} subtasks in parallel...`);
    const completedSubtasks = await executeSubtasks(decomposition.subtasks, brain, activeSkills);

    // ── Phase 3: Big Brain SYNTHESIZER ─────────────────────────────────────
    console.log(`[CognitivePipeline] Phase 3: Synthesizing final response...`);
    const response = await bigBrainSynthesize(
      species, name, persona,
      contextMessage,
      { ...decomposition, subtasks: completedSubtasks },
      passiveFragments || skillFragments,
      brain,
      language
    );

    console.log(`[CognitivePipeline] ✓ Complete`);

    return {
      ...response,
      cognitiveTrace: {
        ...decomposition,
        subtasks: completedSubtasks,
      }
    };

  } catch (err) {
    // Graceful fallback to standard mode
    console.warn('[CognitivePipeline] Pipeline failed, falling back to standard mode:', err);
    return routeCharacterResponse(
      species, name, persona, contextMessage, history, lengthModifier, brain,
      passiveFragments || skillFragments, language
    );
  }
}

export function hasValidApiKey(brain?: AiBrainConfig): boolean {
  if (!brain) {
    return !!process.env.GEMINI_API_KEY;
  }
  const provider = brain.provider || 'gemini';
  if (provider === 'gemini') {
    return !!(brain.apiKey || process.env.GEMINI_API_KEY);
  } else if (provider === 'deepseek') {
    return !!(brain.apiKey || process.env.DEEPSEEK_API_KEY);
  } else if (provider === 'openai') {
    return !!(brain.apiKey || process.env.OPENAI_API_KEY);
  } else {
    return provider === 'ollama' || !!brain.apiKey;
  }
}
