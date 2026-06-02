import { NextRequest, NextResponse } from 'next/server';
import { checkProactiveOutreach, checkSocialProactivity } from '@/lib/ai-outreach';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, language } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Run proactive checks
        await Promise.all([
            checkProactiveOutreach(userId, language),
            checkSocialProactivity(userId, language)
        ]);

        return NextResponse.json({ status: 'Heartbeat processed' });
    } catch (error: any) {
        console.error("Outreach Heartbeat Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
