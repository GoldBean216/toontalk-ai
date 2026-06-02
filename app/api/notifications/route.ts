import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            fromName: n.from_name,
            fromAvatar: n.from_avatar,
            postId: n.post_id,
            postContent: n.post_content,
            commentId: n.comment_id,
            commentText: n.comment_text,
            replyText: n.reply_text,
            timestamp: new Date(n.created_at).getTime(),
            isRead: n.is_read
        })));
    } catch (error: any) {
        console.error("[Notifications API GET Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, type, fromName, fromAvatar, postId, postContent, commentId, commentText, replyText } = body;

        const { data, error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                type,
                from_name: fromName,
                from_avatar: fromAvatar,
                post_id: postId,
                post_content: postContent,
                comment_id: commentId,
                comment_text: commentText,
                reply_text: replyText
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[Notifications API POST Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { notificationId, isRead } = body;

        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: isRead })
            .eq('id', notificationId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[Notifications API PATCH Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
