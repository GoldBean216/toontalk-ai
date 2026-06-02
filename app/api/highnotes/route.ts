import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        let posts;
        if (userId) {
            // Fetch official AI character IDs
            const { data: aiChars } = await supabase
                .from('ai_characters')
                .select('id');
            const officialAiIds = (aiChars || []).map(c => c.id);

            // Fetch user's custom AI contacts
            const { data: userContacts } = await supabase
                .from('contacts')
                .select('ai_id, target_id, is_ai')
                .eq('user_id', userId);
            
            const contactAiIds = (userContacts || [])
                .filter(c => c.is_ai || c.ai_id)
                .map(c => c.ai_id || c.target_id)
                .filter(Boolean);

            // Allowed author IDs: official AI characters, user's custom AI contacts, and user themselves
            const allowedAuthorIds = Array.from(new Set([...officialAiIds, ...contactAiIds, userId]));

            const { data: matchedPosts, error: pError } = await supabase
                .from('posts')
                .select('*')
                .in('author_id', allowedAuthorIds)
                .order('created_at', { ascending: false });

            if (pError) throw pError;
            posts = (matchedPosts || []).filter(p => !p.user_id || p.user_id === userId);
        } else {
            const { data: allPosts, error: pError } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (pError) throw pError;
            posts = allPosts || [];
        }

        // Fetch comments for each post
        const postsWithComments = await Promise.all(posts.map(async (post) => {
            const { data: comments, error: cError } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });

            return {
                id: post.id,
                authorId: post.author_id,
                content: post.content,
                authorName: post.author_name,
                authorSpecies: post.author_species,
                authorAvatar: post.author_avatar,
                likes: post.likes,
                dislikes: post.dislikes,
                likedBy: post.liked_by || [],
                dislikedBy: post.disliked_by || [],
                timestamp: new Date(post.created_at).getTime(),
                comments: (comments || []).map(c => ({
                    id: c.id,
                    postId: c.post_id,
                    authorId: c.author_id,
                    authorName: c.author_name,
                    authorAvatar: c.author_avatar,
                    text: c.text,
                    likes: c.likes,
                    likedBy: c.liked_by || [],
                    parentId: c.parent_id,
                    timestamp: new Date(c.created_at).getTime()
                }))
            };
        }));

        return NextResponse.json(postsWithComments);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { serverCheckContentSafety, serverGenerateSocialComment } from '@/lib/gemini-server';
import { AiBrainConfig } from '@/types';

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
        const { authorId, content, authorName, authorSpecies, authorAvatar, language, userId } = body;

        // 1. Safety Check
        const safetyCheck = await serverCheckContentSafety(content);
        if (!safetyCheck.safe) {
            return NextResponse.json({
                error: 'Content Violation',
                reason: safetyCheck.reason || 'Your post contains inappropriate content.'
            }, { status: 400 });
        }

        // 1.5 Save Post (Split insert and select for mock compat)
        const { data: insertedList, error: insertError } = await supabase
            .from('posts')
            .insert([{
                author_id: authorId,
                content,
                author_name: authorName,
                author_species: authorSpecies,
                author_avatar: authorAvatar,
                user_id: userId || authorId
            }]);

        if (insertError) throw insertError;

        const data = Array.isArray(insertedList) ? insertedList[0] : insertedList;
        if (!data) throw new Error("Failed to retrieve inserted post");

        // 2. AI Reactions (Guaranteed 2+ for user posts)
        const { data: reactors } = await supabase
            .from('ai_characters')
            .select('*')
            .limit(10); // Get some AI potentials

        if (reactors && reactors.length > 0) {
            const reactorCount = Math.floor(Math.random() * 2) + 2; // 2 or 3
            const shuffled = reactors.sort(() => 0.5 - Math.random()).slice(0, reactorCount);

            for (const ai of shuffled) {
                try {
                    const aiBrain = await getBrainConfigForAi(ai.id);
                    const commentText = await serverGenerateSocialComment(ai.name, ai.species, ai.persona, content, undefined, aiBrain, language);
                    // Split insert for comments too
                    await supabase.from('comments').insert([{
                        post_id: data.id,
                        author_id: ai.id,
                        author_name: ai.name,
                        author_avatar: ai.avatar_url,
                        text: commentText
                    }]);
                } catch (e) {
                    console.error("User Post AI Reaction Error:", ai.name, e);
                }
            }
        }

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
