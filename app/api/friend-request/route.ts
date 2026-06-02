
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetUserId, senderId, senderName, senderAvatar } = body;

        if (!targetUserId || !senderId) {
            return NextResponse.json({ error: 'Missing targetUserId or senderId' }, { status: 400 });
        }

        // Insert Notification
        const { error } = await supabase.from('notifications').insert({
            user_id: targetUserId,
            type: 'friend_request',
            from_name: senderName || 'Unknown',
            from_avatar: senderAvatar || '',
            // We explicitly store senderId in from_id if column exists, 
            // but also in post_id as a fallback/standard field navigation
            post_id: senderId,
            post_content: 'Sent you a friend request!',
            is_read: false
        });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Friend Request API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
