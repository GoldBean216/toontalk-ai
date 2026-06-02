import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, skillId, price } = body;

        if (!userId || !skillId || typeof price !== 'number') {
            return NextResponse.json({ error: 'Missing userId, skillId, or price' }, { status: 400 });
        }

        // 1. Get user profile
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // 2. Check if already purchased
        const currentInventory = profile.inventory || [];
        if (currentInventory.includes(skillId)) {
            return NextResponse.json({ error: 'Skill already unlocked' }, { status: 400 });
        }

        // 3. Verify coins
        if (profile.coins < price) {
            return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
        }

        // 4. Calculate new values
        const newCoins = profile.coins - price;
        const newInventory = Array.from(new Set([...currentInventory, skillId]));

        // 5. Update user profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                coins: newCoins,
                inventory: newInventory
            })
            .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            coins: newCoins,
            inventory: newInventory,
            profile: {
                coins: newCoins,
                inventory: newInventory
            }
        });
    } catch (error: any) {
        console.error('[API Skills Purchase Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
