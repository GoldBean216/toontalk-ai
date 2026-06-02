import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { userId, targetId, aiId, isAi, nickname, avatarUrl, species, persona } = body;

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // If it's an AI, ensure it's saved to ai_characters table
    if (isAi) {
        const charId = targetId || aiId || `ai_${Date.now()}`;
        await supabase
            .from('ai_characters')
            .upsert({
                id: charId,
                name: nickname,
                species,
                persona,
                avatar_url: avatarUrl
            });
    }

    // Extract brain config from body
    const brain = body.brain;

    const { data, error } = await supabase
        .from('contacts')
        .insert({
            user_id: userId,
            target_id: isAi ? null : targetId,
            ai_id: isAi ? (targetId || aiId) : null,
            is_ai: isAi,
            nickname,
            avatar_url: avatarUrl,
            species,
            persona,
            is_group: body.isGroup ? 1 : 0,
            members: body.members ? JSON.stringify(body.members) : '[]',
            creator_id: body.creatorId || null,
            // AI Brain fields
            ai_provider: brain?.provider || 'gemini',
            ai_model: brain?.model || null,
            ai_base_url: brain?.apiBaseUrl || null,
            ai_api_key: brain?.apiKey || null,
            ai_skills: brain?.skills ? JSON.stringify(brain.skills) : '[]',
            // Cognitive mode
            ai_cognitive_mode: brain?.cognitiveMode || 'standard',
            ai_little_provider: brain?.littleBrainProvider || null,
            ai_little_model: brain?.littleBrainModel || null,
            ai_little_key: brain?.littleBrainApiKey || null,
            ai_little_base_url: brain?.littleBrainBaseUrl || null,
            ai_difficulty_threshold: brain?.difficultyThreshold ?? 50,
            // TTS Settings
            ai_tts_provider: brain?.ttsProvider || 'gemini',
            ai_tts_model: brain?.ttsModel || null,
            ai_tts_base_url: brain?.ttsBaseUrl || null,
            ai_tts_key: brain?.ttsApiKey || null,
            ai_tts_voice: brain?.ttsVoice || 'default',
            ai_tts_speech_type: brain?.ttsSpeechType ?? 2,
            // Behavior Preference
            ai_behavior_preference: brain?.behaviorPreference || 'default',
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
    const body = await req.json();
    const { id, userId, brain } = body;

    if (!id || !userId) {
        return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
    }

    if (!brain) {
        return NextResponse.json({ error: 'Missing brain config' }, { status: 400 });
    }

    // Resolve contact ID (can be official AI ID or contact UUID)
    let targetContactId = id;
    const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('id', id)
        .single();
        
    if (!contact) {
        const { data: contactByAi } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', userId)
            .eq('ai_id', id)
            .single();
        if (contactByAi) {
            targetContactId = contactByAi.id;
        }
    }

    const { data, error } = await supabase
        .from('contacts')
        .update({
            ai_provider: brain.provider || 'gemini',
            ai_model: brain.model || null,
            ai_base_url: brain.apiBaseUrl || null,
            ai_api_key: brain.apiKey || null,
            ai_skills: JSON.stringify(brain.skills || []),
            // Cognitive mode
            ai_cognitive_mode: brain.cognitiveMode || 'standard',
            ai_little_provider: brain.littleBrainProvider || null,
            ai_little_model: brain.littleBrainModel || null,
            ai_little_key: brain.littleBrainApiKey || null,
            ai_little_base_url: brain.littleBrainBaseUrl || null,
            ai_difficulty_threshold: brain.difficultyThreshold ?? 50,
            // TTS Settings
            ai_tts_provider: brain.ttsProvider || 'gemini',
            ai_tts_model: brain.ttsModel || null,
            ai_tts_base_url: brain.ttsBaseUrl || null,
            ai_tts_key: brain.ttsApiKey || null,
            ai_tts_voice: brain.ttsVoice || 'default',
            ai_tts_speech_type: brain.ttsSpeechType ?? 2,
            // Behavior Preference
            ai_behavior_preference: brain.behaviorPreference || 'default',
        })
        .eq('id', targetContactId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
        return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
    }

    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
