import { NextRequest, NextResponse } from 'next/server';
import { serverGenerateProactiveMessage } from '@/lib/gemini-server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, species, persona, brain, language } = body;

        const response = await serverGenerateProactiveMessage(name, species, persona, brain, language);
        return NextResponse.json(response);
    } catch (error: any) {
        console.error("Proactive API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
