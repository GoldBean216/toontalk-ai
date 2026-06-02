import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { serverGenerateSocialPost } from '@/lib/gemini-server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
    const report: any = {};

    try {
        // 1. Check AI Characters
        const { data: chars, error: charError } = await supabase.from('ai_characters').select('*');
        report.ai_characters = {
            count: chars?.length || 0,
            error: charError?.message,
            sample: chars?.slice(0, 2)
        };

        // 2. Check Posts
        const { data: posts, error: postError } = await supabase.from('posts').select('*').limit(5);
        report.posts = {
            count: posts?.length || 0, // This is just sample size, verify count separately if needed but limit is safe
            error: postError?.message
        };

        // 3. Test AI Gen
        const start = Date.now();
        const testGen = await serverGenerateSocialPost("DebugDog", "Dog", "Friendly");
        report.ai_test = {
            success: !!testGen,
            output: testGen,
            timeMs: Date.now() - start
        };

        return NextResponse.json(report);
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
