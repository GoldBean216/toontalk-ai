import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: { commentId: string } }) {
    try {
        const { commentId } = params;
        const body = await req.json();
        const { userId, action } = body; // action: 'add' | 'remove'

        // 1. Get current comment
        const { data: comment, error: getError } = await supabase
            .from('comments')
            .select('*')
            .eq('id', commentId)
            .single();

        if (getError) throw getError;

        let likedBy = comment.liked_by || [];

        if (action === 'add') {
            if (!likedBy.includes(userId)) likedBy.push(userId);
        } else {
            likedBy = likedBy.filter((id: string) => id !== userId);
        }

        const { data: updatedComment, error: updateError } = await supabase
            .from('comments')
            .update({
                liked_by: likedBy,
                likes: likedBy.length
            })
            .eq('id', commentId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json(updatedComment);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
