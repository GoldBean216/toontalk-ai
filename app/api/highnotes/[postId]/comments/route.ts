import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { serverGenerateSocialComment } from '@/lib/gemini-server';
import { triggerAiOutreach } from '@/lib/ai-outreach';
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

export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
    try {
        const { postId } = params;
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data.map(c => ({
            ...c,
            timestamp: new Date(c.created_at).getTime()
        })));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
    try {
        const { postId } = params;
        const body = await req.json();
        const { authorId, authorName, authorAvatar, text, parentId, language } = body;

        // 1. Save User Comment (Split insert and select for mock compat)
        const { data: insertedList, error: insertError } = await supabase
            .from('comments')
            .insert([{
                post_id: postId,
                author_id: authorId,
                author_name: authorName,
                author_avatar: authorAvatar,
                text,
                parent_id: parentId
            }]);

        if (insertError) throw insertError;

        // Fetch the newly created comment (Mock returns it in data array usually, but let's be safe)
        const userComment = Array.isArray(insertedList) ? insertedList[0] : insertedList;

        if (!userComment) throw new Error("Failed to retrieve inserted comment");

        // 1.5 Notification for Post Author
        await (async () => {
            const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single();
            if (post && post.author_id !== authorId) {
                await supabase.from('notifications').insert([{
                    user_id: post.author_id,
                    type: 'comment_post',
                    from_name: authorName,
                    from_avatar: authorAvatar,
                    post_id: postId,
                    post_content: post.content,
                    comment_id: userComment.id,
                    comment_text: text
                }]);

                // AI Outreach: If post author is AI, trigger DM with 50% chance
                const { data: isAi } = await supabase.from('ai_characters').select('id').eq('id', post.author_id).single();
                if (isAi && Math.random() < 0.5) {
                    triggerAiOutreach(authorId, post.author_id, `The user commented on your post: "${post.content}". Their comment: "${text}"`);
                }
            }
            // If replying to a comment, notify that author too
            if (parentId) {
                const { data: parentComment } = await supabase.from('comments').select('*').eq('id', parentId).single();
                if (parentComment && parentComment.author_id !== authorId) {
                    await supabase.from('notifications').insert([{
                        user_id: parentComment.author_id,
                        type: 'reply_comment',
                        from_name: authorName,
                        from_avatar: authorAvatar,
                        post_id: postId,
                        post_content: post?.content || '',
                        comment_id: userComment.id,
                        comment_text: parentComment.text,
                        reply_text: text
                    }]);
                }
            }
        })();

        // 2. Return User Comment IMMEDIATELY for fast UI
        const responseJson = {
            ...userComment,
            timestamp: new Date(userComment.created_at).getTime()
        };

        // 3. BACKGROUND AI LOGIC (Non-blocking)
        // We don't 'await' this so the response sends immediately
        (async () => {
            // A. Random Delay (3s to 15s) for a more interactive feel
            const delayMs = Math.floor(Math.random() * (15 - 3 + 1) + 3) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));

            try {
                // Fetch Post Info & Current Heat
                const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single();
                const { count: commentCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);

                if (!post) return;

                const heat = (post.likes || 0) + (commentCount || 0);

                // Get AI Characters
                const { data: aiChars } = await supabase.from('ai_characters').select('*');

                if (aiChars && aiChars.length > 0) {
                    const pendingAiComments: any[] = [];

                    // Determine who should definitely reply
                    let responder: any = null;

                    // i. If user is replying to an AI comment, that AI should reply back
                    if (parentId) {
                        const { data: parentComment } = await supabase.from('comments').select('*').eq('id', parentId).single();
                        if (parentComment) {
                            responder = aiChars.find(c => c.id === parentComment.author_id);
                        }
                    }

                    // ii. If no responder (not a nested reply) or parent was human, check post author
                    if (!responder) {
                        responder = aiChars.find(c => c.id === post.author_id);
                    }

                    // iii. If still no responder (post and parent comment are human), 
                    // there's a 70% chance a random AI jumps in to human's post
                    if (!responder && Math.random() < 0.7) {
                        responder = aiChars[Math.floor(Math.random() * aiChars.length)];
                    }

                    if (responder) {
                        const responderBrain = await getBrainConfigForAi(responder.id);
                        const replyText = await serverGenerateSocialComment(
                            responder.name,
                            responder.species,
                            responder.persona,
                            post.content,
                            text, // context: the new user comment
                            responderBrain,
                            language
                        );

                        pendingAiComments.push({
                            post_id: postId,
                            author_id: responder.id,
                            author_name: responder.name,
                            author_avatar: responder.avatar_url,
                            text: replyText,
                            parent_id: userComment.id
                        });
                    }

                    // iv. Extra Bystander Logic (More likely on popular posts)
                    const bystanders = aiChars.filter(c => responder && c.id !== responder.id);
                    const bystanderChance = heat > 10 ? 0.5 : (heat > 5 ? 0.2 : 0.05);

                    if (Math.random() < bystanderChance && bystanders.length > 0) {
                        const randomBystander = bystanders[Math.floor(Math.random() * bystanders.length)];
                        const bystanderBrain = await getBrainConfigForAi(randomBystander.id);
                        const bystanderText = await serverGenerateSocialComment(
                            randomBystander.name,
                            randomBystander.species,
                            randomBystander.persona,
                            post.content,
                            "Joining the discussion",
                            bystanderBrain,
                            language
                        );

                        pendingAiComments.push({
                            post_id: postId,
                            author_id: randomBystander.id,
                            author_name: randomBystander.name,
                            author_avatar: randomBystander.avatar_url,
                            text: bystanderText,
                            parent_id: null // Bystander comments on the post generally
                        });
                    }

                    // iii. Save AI Comments (one by one with some jitter)
                    for (const ac of pendingAiComments) {
                        await new Promise(r => setTimeout(r, Math.random() * 5000)); // 0-5s jitter
                        const { data: insertedList, error: saveError } = await supabase.from('comments').insert([ac]);

                        if (saveError) {
                            console.error("Failed to save AI comment:", saveError);
                            continue;
                        }

                        const savedAc = Array.isArray(insertedList) ? insertedList[0] : insertedList;
                        if (!savedAc) continue;

                        // Case A: Nested Reply (Notify the specific comment author)
                        if (ac.parent_id) {
                            const { data: parentComment } = await supabase.from('comments').select('*').eq('id', ac.parent_id).single();
                            if (parentComment) {
                                const isParentAi = aiChars.some(c => c.id === parentComment.author_id);
                                if (!isParentAi) {
                                    // It's a human, notify them
                                    await supabase.from('notifications').insert([{
                                        user_id: parentComment.author_id,
                                        type: 'reply_comment',
                                        from_name: ac.author_name,
                                        from_avatar: ac.author_avatar,
                                        post_id: postId,
                                        post_content: post.content,
                                        comment_id: savedAc.id,
                                        comment_text: parentComment.text,
                                        reply_text: ac.text,
                                        is_read: false
                                    }]);
                                }
                            }
                        }
                        // Case B: Top-level Comment (Notify the post author)
                        else {
                            const isPostAuthorAi = aiChars.some(c => c.id === post.author_id);
                            if (!isPostAuthorAi) {
                                // It's a human, notify them
                                await supabase.from('notifications').insert([{
                                    user_id: post.author_id,
                                    type: 'comment_post',
                                    from_name: ac.author_name,
                                    from_avatar: ac.author_avatar,
                                    post_id: postId,
                                    post_content: post.content,
                                    comment_id: savedAc.id,
                                    comment_text: ac.text,
                                    is_read: false
                                }]);
                            }
                        }
                    }
                }
            } catch (bgError) {
                console.error("Background AI Reply Error:", bgError);
            }
        })();

        return NextResponse.json(responseJson);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
