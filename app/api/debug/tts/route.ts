
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST() {
    const logs: string[] = [];
    const addLog = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

    try {
        addLog("Starting TTS Diagnostic...");

        // 1. Check Env
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            addLog("❌ GEMINI_API_KEY missing");
            return NextResponse.json({ success: false, logs }, { status: 500 });
        }

        // 2. Try Gemini Primary
        addLog("🔵 Attempting Primary Model: gemini-2.5-flash-preview-tts");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-preview-tts',
            generationConfig: {
                // @ts-ignore
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            } as any
        }, { apiVersion: 'v1alpha' } as any);

        const start = Date.now();
        const result = await model.generateContent("Diagnostic test.");
        const duration = Date.now() - start;

        const audioPart = result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('audio'));

        if (audioPart) {
            const len = audioPart.inlineData.data.length;
            addLog(`✅ GEMINI SUCCESS: Audio generated (${len} chars) in ${duration}ms`);
            return NextResponse.json({ success: true, logs, source: 'gemini', audioDataLength: len });
        } else {
            addLog("❌ Failure: No audio part in response");
            return NextResponse.json({ success: false, logs });
        }

    } catch (error: any) {
        addLog(`❌ EXCEPTION: ${error.message}`);
        if (error.cause) addLog(`Cause: ${JSON.stringify(error.cause)}`);
        return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 });
    }
}
