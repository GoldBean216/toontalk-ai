import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { createClient } from '@/lib/supabase-server';
import { serverGenerateSocialComment } from '@/lib/gemini-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { postId } = body;

        if (!postId) {
            return NextResponse.json({ error: 'postId is required' }, { status: 400 });
        }

        // 1. Fetch Post
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (postError || !post) {
            throw new Error(postError?.message || 'Post not found');
        }

        // 2. Fetch AI Characters (excluding post author)
        const { data: aiChars, error: aiError } = await supabase
            .from('ai_characters')
            .select('*')
            .neq('id', post.author_id);

        if (aiError || !aiChars || aiChars.length === 0) {
            return NextResponse.json({ message: 'No eligible AI characters' });
        }

        // 3. Selection
        const reactor = aiChars[Math.floor(Math.random() * aiChars.length)];

        // 3.5 Threading Logic: 50% chance to reply to an existing comment if any exist
        const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId);

        let parentId = null;
        let replyContext = '';

        if (comments && comments.length > 0 && Math.random() > 0.5) {
            const targetComment = comments[Math.floor(Math.random() * comments.length)];
            parentId = targetComment.id;
            replyContext = targetComment.text;
        }

        // 4. Generate Comment
        const commentText = await serverGenerateSocialComment(
            reactor.name,
            reactor.species,
            reactor.persona,
            post.content,
            replyContext,
            body.brain,
            body.language
        );

        // 5. Save to DB (Split insert and select for mock compat)
        const { data: insertedList, error: commentError } = await supabase
            .from('comments')
            .insert([{
                post_id: postId,
                author_id: reactor.id,
                author_name: reactor.name,
                author_avatar: reactor.avatar_url,
                text: commentText,
                parent_id: parentId
            }]);

        if (commentError) throw commentError;

        const comment = Array.isArray(insertedList) ? insertedList[0] : insertedList;
        if (!comment) throw new Error("Failed to retrieve inserted comment");

        // 6. Notifications Logic
        try {
            // A. Notify Post Author
            const { data: authorIsAi } = await supabase.from('ai_characters').select('id').eq('id', post.author_id).single();
            if (!authorIsAi) {
                await supabase.from('notifications').insert([{
                    user_id: post.author_id,
                    type: 'comment_post',
                    from_name: reactor.name,
                    from_avatar: reactor.avatar_url,
                    post_id: postId,
                    post_content: post.content,
                    comment_id: comment.id,
                    comment_text: commentText,
                    is_read: false
                }]);
            }

            // B. Notify Parent Comment Author (if any and if human)
            if (parentId) {
                const { data: parentComment } = await supabase.from('comments').select('*').eq('id', parentId).single();
                if (parentComment) {
                    const { data: parentAuthorIsAi } = await supabase.from('ai_characters').select('id').eq('id', parentComment.author_id).single();
                    if (!parentAuthorIsAi && parentComment.author_id !== post.author_id) {
                        await supabase.from('notifications').insert([{
                            user_id: parentComment.author_id,
                            type: 'reply_comment',
                            from_name: reactor.name,
                            from_avatar: reactor.avatar_url,
                            post_id: postId,
                            post_content: post.content,
                            comment_id: comment.id,
                            comment_text: parentComment.text,
                            reply_text: commentText,
                            is_read: false
                        }]);
                    }
                }
            }
        } catch (notifErr) {
            console.error("Failed to create notifications for auto-comment:", notifErr);
        }

        return NextResponse.json({
            success: true,
            comment: {
                ...comment,
                timestamp: new Date(comment.created_at).getTime()
            }
        });

    } catch (error: any) {
        console.error("AI Auto-Comment Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
