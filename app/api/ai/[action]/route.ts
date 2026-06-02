import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60; // Increase timeout for AI generation
import {
    serverGenerateCharacterResponse,
    serverGenerateSpeech,
    serverGenerateRandomProfiles,
    serverGenerateSocialPost,
    serverGenerateSocialComment,
    serverGenerateRoleplayResponse,
    serverGenerateGuessResponse,
    serverGenerateAiGuess,
    serverGenerateSpyDescription,
    serverGenerateSpyVote,
    serverGenerateTaskResponse,
    serverTestConnection,
    serverDecideSocialProactivity,
    serverGenerateAiSchedule,
    serverAnalyzeUserTask,
    serverGenerateNews
} from '@/lib/gemini-server';

import { createClient } from '@/lib/supabase-server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
    try {
        const body = await req.json();
        const action = params.action;
        let result;

        switch (action) {
            case 'task-response': {
                const { userId, contactId, prompt, chatHistory, taskContext } = body;
                // Fetch contact from DB
                const { data: contact, error } = await supabase
                    .from('contacts')
                    .select('*')
                    .eq('id', contactId)
                    .single();

                if (error || !contact) {
                    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
                }

                const parsedBrain = contact.ai_provider ? {
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
                    ttsSpeechType: contact.ai_tts_speech_type !== undefined ? Number(contact.ai_tts_speech_type) as 1 | 2 : 2,
                } : undefined;

                result = await serverGenerateTaskResponse(
                    userId,
                    contactId,
                    contact.species,
                    contact.name,
                    contact.persona,
                    prompt,
                    chatHistory,
                    taskContext,
                    parsedBrain
                );
                break;
            }

            case 'chat-response': {
                const { userId, aiId } = body;
                let contextMessage = body.contextMessage;

                if (userId && aiId && contextMessage) {
                    try {
                        const configPath = path.join(process.cwd(), 'map_config.json');
                        const configData = await fs.readFile(configPath, 'utf-8');
                        const buildings = JSON.parse(configData).buildings || [];
                        
                        const taskAnalysis = await serverAnalyzeUserTask(contextMessage, buildings, body.brain);
                        if (taskAnalysis && taskAnalysis.isTask) {
                            const targetB = buildings.find((b: any) => b.id === taskAnalysis.buildingId);
                            const buildingName = targetB ? targetB.name : 'Target Location';
                            
                            // Insert task with highest priority (priority = 1)
                            await supabase.from('ai_daily_activities').insert([{
                                id: crypto.randomUUID(),
                                user_id: userId,
                                ai_id: aiId,
                                title: taskAnalysis.title,
                                building_id: taskAnalysis.buildingId,
                                status: 'pending',
                                priority: 1
                            }]);

                            // Inject instruction to prompt the AI to acknowledge
                            contextMessage = `[SYSTEM: The user just gave you a task/instruction: "${taskAnalysis.title}" at "${buildingName}". Enlist this as a top priority. Acknowledge this task enthusiastically in character, saying you will head there right now to do it!] ${contextMessage}`;
                        }
                    } catch (e) {
                        console.error("Error analyzing user task in chat-response route:", e);
                    }
                }

                result = await serverGenerateCharacterResponse(
                    body.species, 
                    body.name, 
                    body.persona, 
                    contextMessage, 
                    body.history, 
                    body.lengthModifier, 
                    body.brain,
                    body.worldContext,
                    body.language
                );
                break;
            }
            case 'tts':
                result = await serverGenerateSpeech(body.text, body.species, body.persona, body.voice, body.brain);
                break;
            case 'random-profiles':
                result = await serverGenerateRandomProfiles(body.brain);
                break;
            case 'decide-social-proactivity':
                result = await serverDecideSocialProactivity(
                    body.name,
                    body.species,
                    body.persona,
                    body.eventContext,
                    body.proactivityLevel,
                    body.brain
                );
                break;
            case 'generate-schedule':
                result = await serverGenerateAiSchedule(
                    body.name, 
                    body.species, 
                    body.persona, 
                    body.buildings, 
                    body.brain,
                    body.otherCharacters,
                    body.language
                );
                break;
            case 'social-post':
                result = await serverGenerateSocialPost(body.name, body.species, body.persona, body.brain, body.language);
                break;
            case 'social-comment':
                result = await serverGenerateSocialComment(body.name, body.species, body.persona, body.postContent, body.replyContext, body.brain, body.language);
                break;
            case 'rp-taboo':
                result = await serverGenerateRoleplayResponse(body.charName, body.aiTaboo, body.userTaboo, body.history, body.brain);
                break;
            case 'rp-guess-answer':
                result = await serverGenerateGuessResponse(body.charName, body.secretWord, body.question, body.brain);
                break;
            case 'rp-guess-ask':
                result = await serverGenerateAiGuess(body.charName, body.wordToGuess, body.history, body.brain);
                break;
            case 'rp-spy-desc':
                result = await serverGenerateSpyDescription(body.name, body.role, body.word, body.history, body.brain);
                break;
            case 'rp-spy-vote':
                result = await serverGenerateSpyVote(body.name, body.word, body.candidates, body.history, body.brain);
                break;
            case 'test-connection': {
                const { provider, model, apiKey, apiBaseUrl } = body;
                result = await serverTestConnection(provider, model, apiKey, apiBaseUrl);
                break;
            }
            case 'generate-news': {
                result = await serverGenerateNews(body.event, body.brain, body.language);
                break;
            }
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ result });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}