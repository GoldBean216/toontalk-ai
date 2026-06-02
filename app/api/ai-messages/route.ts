import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

/**
 * Fetch pending AI messages for a user and mark them as delivered.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // 1. Fetch pending messages
        const { data: messages, error } = await supabase
            .from('pending_ai_messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // 2. Delete delivered messages
        if (messages && messages.length > 0) {
            const ids = messages.map(m => m.id);
            await supabase.from('pending_ai_messages').delete().in('id', ids);
        }

        return NextResponse.json(messages || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
