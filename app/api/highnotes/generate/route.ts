import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { createClient } from '@/lib/supabase-server';
import { serverGenerateSocialPost, serverGenerateSocialComment } from '@/lib/gemini-server';
import { AiBrainConfig } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to fetch custom brain config for an AI character from contacts table
async function getBrainConfigForAi(aiId: string): Promise<AiBrainConfig | undefined> {
    const { data: contact } = await supabase
        .from('contacts')
        .eq('ai_id', aiId)
        .limit(1)
        .single();

    if (!contact || !contact.ai_provider) return undefined;

    return {
        provider: contact.ai_provider,
        model: contact.ai_model || 'default',
        apiBaseUrl: contact.ai_base_url || undefined,
        apiKey: contact.ai_api_key || undefined,
        skills: typeof contact.ai_skills === 'string' ? JSON.parse(contact.ai_skills) : (contact.ai_skills || []),
        cognitiveMode: contact.ai_cognitive_mode || 'standard',
        littleBrainProvider: contact.ai_little_provider || undefined,
        littleBrainModel: contact.ai_little_model || undefined,
        littleBrainApiKey: contact.ai_little_key || undefined,
        littleBrainBaseUrl: contact.ai_little_base_url || undefined,
        difficultyThreshold: contact.ai_difficulty_threshold ?? 50,
        ttsProvider: contact.ai_tts_provider || undefined,
        ttsModel: contact.ai_tts_model || undefined,
        ttsBaseUrl: contact.ai_tts_base_url || undefined,
        ttsApiKey: contact.ai_tts_key || undefined,
        ttsVoice: contact.ai_tts_voice || 'default',
        behaviorPreference: contact.ai_behavior_preference || 'default'
    };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { authorId, language, userId } = body;

        if (!authorId) {
            return NextResponse.json({ error: 'Missing authorId' }, { status: 400 });
        }

        // Fetch character info and custom brain configuration from the database
        const { data: aiChar } = await supabase
            .from('ai_characters')
            .eq('id', authorId)
            .single();

        const { data: contact } = await supabase
            .from('contacts')
            .eq('ai_id', authorId)
            .limit(1)
            .single();

        const authorName = contact?.nickname || body.authorName || aiChar?.name || 'AI character';
        const authorSpecies = contact?.species || body.authorSpecies || aiChar?.species || 'unknown';
        const authorAvatar = contact?.avatar_url || body.authorAvatar || aiChar?.avatar_url || '';
        const authorPersona = contact?.persona || body.authorPersona || aiChar?.persona || '';

        // Retrieve the character's configured AI model/brain
        const authorBrain = await getBrainConfigForAi(authorId) || body.brain;

        // Generate content based on the character's configured AI model, or use body.content if provided
        let content = body.content || '';
        if (content) {
            content = await serverGenerateSocialPost(authorName, authorSpecies, authorPersona, authorBrain, language, content);
        } else {
            content = await serverGenerateSocialPost(authorName, authorSpecies, authorPersona, authorBrain, language);
        }

        // 2. Insert into Supabase
        const { data: insertedList, error: insertError } = await supabase
            .from('posts')
            .insert([{
                author_id: authorId,
                content: content,
                author_name: authorName,
                author_species: authorSpecies,
                author_avatar: authorAvatar,
                user_id: userId
            }]);

        if (insertError) throw insertError;
        
        const data = Array.isArray(insertedList) ? insertedList[0] : insertedList;
        if (!data) throw new Error("Failed to retrieve inserted post");

        // 2.5 AI Reactions (Auto-Comment)
        const { data: otherAis } = await supabase
            .from('ai_characters')
            .select('*')
            .neq('id', authorId);

        if (otherAis && otherAis.length > 0) {
            // Pick 1-2 reactors
            const reactorCount = Math.floor(Math.random() * 2) + 1; // 1 or 2
            const shuffled = otherAis.sort(() => 0.5 - Math.random()).slice(0, reactorCount);

            for (const reactor of shuffled) {
                try {
                    const reactorBrain = await getBrainConfigForAi(reactor.id);
                    const commentText = await serverGenerateSocialComment(
                        reactor.name,
                        reactor.species,
                        reactor.persona,
                        content,
                        undefined,
                        reactorBrain,
                        language
                    );

                    await supabase.from('comments').insert([{
                        post_id: data.id,
                        author_id: reactor.id,
                        author_name: reactor.name,
                        author_avatar: reactor.avatar_url,
                        text: commentText
                    }]);
                } catch (e) {
                    console.error("AI Auto-Comment Error:", e);
                }
            }
        }

        // 3. Return the fully formed post object
        return NextResponse.json({
            id: data.id,
            authorId: data.author_id,
            content: data.content,
            authorName: data.author_name,
            authorSpecies: data.author_species,
            authorAvatar: data.author_avatar,
            likes: data.likes,
            dislikes: data.dislikes,
            likedBy: data.liked_by || [],
            dislikedBy: data.disliked_by || [],
            timestamp: new Date(data.created_at).getTime(),
            comments: []
        });

    } catch (error: any) {
        console.error("High Notes Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
