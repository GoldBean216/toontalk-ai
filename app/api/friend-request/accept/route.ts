
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const { userId, senderId } = await req.json();
        if (!userId || !senderId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

        // Fetch sender profile to get name/avatar etc.
        const { data: sender } = await supabase.from('profiles').select('*').eq('id', senderId).single();
        const { data: receiver } = await supabase.from('profiles').select('*').eq('id', userId).single();

        if (!sender || !receiver) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        // Double check if valid
        const contactsToInsert = [
            {
                user_id: userId,
                target_id: senderId,
                nickname: sender.nickname,
                avatar_url: sender.avatar_url,
                species: 'Human',
                persona: sender.bio,
                is_ai: false
            },
            {
                user_id: senderId,
                target_id: userId,
                nickname: receiver.nickname,
                avatar_url: receiver.avatar_url,
                species: 'Human',
                persona: receiver.bio,
                is_ai: false
            }
        ];

        // Insert Mutual Contacts
        const { error } = await supabase.from('contacts').insert(contactsToInsert);
        if (error) {
            // If duplicate (already friends), ignore error or handle gracefully
            if (error.code === '23505') { // Unique constraint
                return NextResponse.json({ success: true, message: 'Already friends' });
            }
            throw error;
        }

        // Send "Accepted" notification to Sender
        await supabase.from('notifications').insert({
            user_id: senderId,
            type: 'friend_request',
            from_id: userId,
            from_name: receiver.nickname,
            from_avatar: receiver.avatar_url,
            post_id: userId, // Sender ID from perspective of notification recipient
            post_content: 'Accepted your friend request!',
            is_read: false
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Accept Friend Request Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
