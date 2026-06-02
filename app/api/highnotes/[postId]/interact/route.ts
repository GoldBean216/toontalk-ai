import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { triggerAiOutreach } from '@/lib/ai-outreach';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
    try {
        const { postId } = params;
        const body = await req.json();
        const { userId, action, type } = body; // action: 'add' | 'remove', type: 'like' | 'dislike'

        // 1. Get current post
        const { data: post, error: getError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (getError) throw getError;

        let likedBy = post.liked_by || [];
        let dislikedBy = post.disliked_by || [];

        if (type === 'like') {
            if (action === 'add') {
                if (!likedBy.includes(userId)) likedBy.push(userId);
                // Remove from dislike if present
                dislikedBy = dislikedBy.filter((id: string) => id !== userId);
            } else {
                likedBy = likedBy.filter((id: string) => id !== userId);
            }
        } else if (type === 'dislike') {
            if (action === 'add') {
                if (!dislikedBy.includes(userId)) dislikedBy.push(userId);
                // Remove from like if present
                likedBy = likedBy.filter((id: string) => id !== userId);
            } else {
                dislikedBy = dislikedBy.filter((id: string) => id !== userId);
            }
        }

        // 1.5 Update post (Split update and select for mock compat)
        const { error: updateError } = await supabase
            .from('posts')
            .update({
                liked_by: likedBy,
                disliked_by: dislikedBy,
                likes: likedBy.length,
                dislikes: dislikedBy.length
            })
            .eq('id', postId);

        if (updateError) throw updateError;

        // 1.6 Fetch updated post
        const { data: updatedPost, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (fetchError) throw fetchError;

        // 2. Create Notification (if adding a like and not from self)
        if (action === 'add' && type === 'like' && post.author_id !== userId) {
            await supabase.from('notifications').insert([{
                user_id: post.author_id,
                type: 'like_post',
                from_name: 'Someone',
                from_avatar: '',
                post_id: post.id,
                post_content: post.content
            }]);

            // 3. AI Outreach Logic: If the post author is an AI, trigger a DM
            const { data: isAi } = await supabase.from('ai_characters').select('id').eq('id', post.author_id).single();
            if (isAi) {
                // Random 30% chance to reach out on like to feel natural
                if (Math.random() < 0.3) {
                    triggerAiOutreach(userId, post.author_id, `The user liked your post: "${post.content}"`);
                }
            }
        }

        return NextResponse.json(updatedPost);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
