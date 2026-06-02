import { supabase } from './supabase-server';
import { 
    serverGenerateCharacterResponse, 
    serverGenerateProactiveMessage,
    serverGenerateSocialPost, 
    serverGenerateSocialInteraction,
    serverGenerateAiSchedule,
    serverGenerateSystemConstructionTask
} from './gemini-server';
import { callBigBrainRaw } from './ai-router';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

export function parseBrainConfig(contact: any) {
  if (!contact || !contact.ai_provider) return undefined;
  return {
    provider: contact.ai_provider,
    model: contact.ai_model || undefined,
    apiBaseUrl: contact.ai_base_url || undefined,
    apiKey: contact.ai_api_key || undefined,
    skills: typeof contact.ai_skills === 'string' ? JSON.parse(contact.ai_skills) : (contact.ai_skills || []),
    cognitiveMode: contact.ai_cognitive_mode || 'standard',
    littleBrainProvider: contact.ai_little_provider || undefined,
    littleBrainModel: contact.ai_little_model || undefined,
    littleBrainApiKey: contact.ai_little_key || undefined,
    littleBrainBaseUrl: contact.ai_little_base_url || undefined,
    difficultyThreshold: contact.ai_difficulty_threshold !== undefined ? Number(contact.ai_difficulty_threshold) : 50,
    ttsProvider: contact.ai_tts_provider || undefined,
    ttsModel: contact.ai_tts_model || undefined,
    ttsBaseUrl: contact.ai_tts_base_url || undefined,
    ttsApiKey: contact.ai_tts_key || undefined,
    ttsVoice: contact.ai_tts_voice || undefined,
    behaviorPreference: contact.ai_behavior_preference || undefined,
  };
}

/**
 * Triggers an AI outreach message based on a specific event or high affinity.
 */
export async function triggerAiOutreach(userId: string, aiId: string, context: string, history: string[] = [], language?: string) {
    try {
        // 0. Check for existing pending message - don't spam
        const { data: existing } = await supabase
            .from('pending_ai_messages')
            .select('id')
            .eq('user_id', userId)
            .eq('ai_id', aiId)
            .limit(1);

        if (existing && existing.length > 0) return;

        // 1. Get AI Details
        const { data: ai } = await supabase.from('ai_characters').select('*').eq('id', aiId).single();
        if (!ai) return;

        // Fetch contact details for custom brain configuration
        const { data: contact } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .eq('ai_id', aiId)
            .single();

        const brain = contact?.ai_provider ? {
            provider: contact.ai_provider,
            model: contact.ai_model || undefined,
            apiBaseUrl: contact.ai_base_url || undefined,
            apiKey: contact.ai_api_key || undefined,
            skills: typeof contact.ai_skills === 'string' ? JSON.parse(contact.ai_skills) : (contact.ai_skills || []),
            cognitiveMode: contact.ai_cognitive_mode || 'standard',
            littleBrainProvider: contact.ai_little_provider || undefined,
            littleBrainModel: contact.ai_little_model || undefined,
            littleBrainApiKey: contact.ai_little_key || undefined,
            littleBrainBaseUrl: contact.ai_little_base_url || undefined,
            difficultyThreshold: contact.ai_difficulty_threshold !== undefined ? Number(contact.ai_difficulty_threshold) : 50,
            ttsProvider: contact.ai_tts_provider || undefined,
            ttsModel: contact.ai_tts_model || undefined,
            ttsBaseUrl: contact.ai_tts_base_url || undefined,
            ttsApiKey: contact.ai_tts_key || undefined,
            ttsVoice: contact.ai_tts_voice || undefined,
        } : undefined;

        // 2. Generate Message
        let aiResponse;
        if (history.length === 0) {
            // No recent history, use a random "share something" proactive prompt
            aiResponse = await serverGenerateProactiveMessage(ai.name, ai.species, ai.persona, brain, language);
        } else {
            // Use context-aware response
            aiResponse = await serverGenerateCharacterResponse(
                ai.species,
                ai.name,
                ai.persona,
                `[SYSTEM: Proactively message the user. Context: ${context}.]`,
                history,
                undefined,
                brain,
                undefined,
                language
            );
        }

        // 3. Save to pending_ai_messages
        await supabase.from('pending_ai_messages').insert([{
            user_id: userId,
            ai_id: aiId,
            text: aiResponse.translation
        }]);

    } catch (error) {
        console.error("AI Outreach Error:", error);
    }
}

/**
 * Checks for social proactivity (AI posting to High Notes or interacting with posts).
 */
export async function checkSocialProactivity(userId: string, language?: string) {
    try {
        // 1. Fetch AI Characters (Contacts for this user)
        const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .eq('is_ai', true);

        if (!contacts || contacts.length === 0) return;

        // 2. Decide Action: 30% chance to Post, 70% chance to Interact
        const roll = Math.random();
        
        if (roll < 0.3) {
            // --- AI POSTING LOGIC ---
            if (Math.random() > 0.04) return; // 4% chance per heartbeat to actually post

            const poster = contacts[Math.floor(Math.random() * contacts.length)];
            const brain = poster.ai_provider ? {
                provider: poster.ai_provider,
                model: poster.ai_model,
                apiBaseUrl: poster.ai_base_url,
                apiKey: poster.ai_api_key
            } : undefined;

            const content = await serverGenerateSocialPost(poster.name, poster.species, poster.persona, brain, language);
            
            await supabase.from('posts').insert([{
                author_id: poster.ai_id || poster.target_id,
                author_name: poster.name,
                author_species: poster.species,
                author_avatar: poster.avatar_url,
                content: content,
                user_id: userId
            }]);

            console.log(`[SOCIAL] 📣 ${poster.name} (${poster.species}) published a new Note: "${content.substring(0, 30)}..."`);
        } else {
            // --- AI INTERACTION LOGIC (LIKE/DISLIKE/REPLY) ---
            if (Math.random() > 0.10) return; // 10% chance to interact

            const { data: posts } = await supabase
                .from('posts')
                .select('*')
                .limit(20)
                .order('created_at', { ascending: false });

            if (!posts || posts.length === 0) return;

            const targetPost = posts[Math.floor(Math.random() * posts.length)];
            const reactors = contacts.filter(c => (c.ai_id || c.target_id) !== targetPost.author_id);
            if (reactors.length === 0) return;
            const reactor = reactors[Math.floor(Math.random() * reactors.length)];

            const brain = reactor.ai_provider ? {
                provider: reactor.ai_provider,
                model: reactor.ai_model,
                apiBaseUrl: reactor.ai_base_url,
                apiKey: reactor.ai_api_key
            } : undefined;

            const interaction = await serverGenerateSocialInteraction(
                reactor.name, 
                reactor.species, 
                reactor.persona, 
                targetPost.content, 
                brain,
                language
            );

            const reactorId = reactor.ai_id || reactor.target_id;

            if (interaction.action === 'like') {
                const likedBy = Array.isArray(targetPost.liked_by) ? targetPost.liked_by : [];
                if (!likedBy.includes(reactorId)) {
                    await supabase.from('posts').update({
                        likes: (targetPost.likes || 0) + 1,
                        liked_by: [...likedBy, reactorId]
                    }).eq('id', targetPost.id);
                    console.log(`[SOCIAL] ❤️ ${reactor.name} liked ${targetPost.author_name}'s post.`);
                }
            } else if (interaction.action === 'dislike') {
                const dislikedBy = Array.isArray(targetPost.disliked_by) ? targetPost.disliked_by : [];
                if (!dislikedBy.includes(reactorId)) {
                    await supabase.from('posts').update({
                        dislikes: (targetPost.dislikes || 0) + 1,
                        disliked_by: [...dislikedBy, reactorId]
                    }).eq('id', targetPost.id);
                    console.log(`[SOCIAL] 👎 ${reactor.name} disliked ${targetPost.author_name}'s post.`);
                }
            } else if (interaction.action === 'reply' && interaction.comment) {
                await supabase.from('comments').insert([{
                    post_id: targetPost.id,
                    author_id: reactorId,
                    author_name: reactor.name,
                    author_avatar: reactor.avatar_url,
                    text: interaction.comment
                }]);
                console.log(`[SOCIAL] 💬 ${reactor.name} replied to ${targetPost.author_name}: "${interaction.comment.substring(0, 30)}..."`);
            }
        }

    } catch (error) {
        console.error("Social Proactivity Error:", error);
    }
}

/**
 * Checks for proactive AI outreach based on affinity and chat history.
 */
export async function checkProactiveOutreach(userId: string, language?: string) {
    try {
        // 1. Find potential AI contacts (high affinity)
        const { data: candidates } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .eq('is_ai', true)
            .gt('affinity', 15)
            .order('affinity', { ascending: false })
            .limit(5);

        if (!candidates || candidates.length === 0) return;

        // 2. Check last interaction time
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        const now = Date.now();

        const validCandidates = [];
        for (const c of candidates) {
            const aiId = c.ai_id || c.target_id;

            const { data: lastMsg } = await supabase
                .from('chat_messages')
                .select('timestamp')
                .eq('user_id', userId)
                .eq('contact_id', aiId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            const lastTalked = lastMsg ? Number(lastMsg.timestamp) : 0;
            if (now - lastTalked > TWELVE_HOURS_MS) {
                validCandidates.push(c);
            }
        }

        if (validCandidates.length === 0) return;

        // 3. Pick one randomly
        const picked = validCandidates[Math.floor(Math.random() * validCandidates.length)];

        // 4. Random 15% chance
        if (Math.random() > 0.15) return;

        // 5. Get recent history
        const { data: recentHistory } = await supabase
            .from('chat_messages')
            .select('sender_id, text')
            .eq('user_id', userId)
            .eq('contact_id', picked.ai_id || picked.target_id)
            .order('timestamp', { ascending: false })
            .limit(3);

        const historyStrings = recentHistory
            ? recentHistory.reverse().map(m => `${m.sender_id === picked.ai_id ? picked.name : 'User'}: ${m.text}`)
            : [];

        await triggerAiOutreach(
            userId,
            picked.ai_id || picked.target_id,
            "Checking in after some silence.",
            historyStrings,
            language
        );

    } catch (error) {
        console.error("Proactive Check Error:", error);
    }
}

