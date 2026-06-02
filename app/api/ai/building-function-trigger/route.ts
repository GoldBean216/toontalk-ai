import { NextResponse } from 'next/server';
import { serverGenerateBuildingContent } from '@/lib/gemini-server';
import { supabase } from '@/lib/supabase-server';
import { AiBrainConfig } from '@/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Resolve manager brain config + display info.
 * managerId in buildings = contacts.id (UUID row key).
 * Tries: contacts.id → contacts.ai_id → ai_characters.id
 */
async function getBrainConfigForContact(contactId: string): Promise<{
  brain: AiBrainConfig | undefined;
  name: string;
  persona: string;
  avatarUrl: string;
  aiId: string;
}> {
  // ── Step 1: Look up contact by row id ─────────────────────────────────────
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (contact) {
    // Only build brain when api_key is actually configured (not just the default provider)
    const hasKey = !!(contact.ai_api_key && contact.ai_api_key.trim() !== '');
    console.log(`[brain-lookup] Found contact by id. nickname=${contact.nickname} ai_provider=${contact.ai_provider} hasKey=${hasKey}`);

    const brain: AiBrainConfig | undefined = hasKey
      ? {
          provider: contact.ai_provider || 'gemini',
          model: contact.ai_model || 'gemini-2.5-flash',
          apiBaseUrl: contact.ai_base_url || undefined,
          apiKey: contact.ai_api_key,
          skills: typeof contact.ai_skills === 'string'
            ? JSON.parse(contact.ai_skills)
            : (contact.ai_skills || []),
          cognitiveMode: contact.ai_cognitive_mode || 'standard',
          littleBrainProvider: contact.ai_little_provider || undefined,
          littleBrainModel: contact.ai_little_model || undefined,
          littleBrainApiKey: contact.ai_little_key || undefined,
          littleBrainBaseUrl: contact.ai_little_base_url || undefined,
          difficultyThreshold: contact.ai_difficulty_threshold ?? 50,
          ttsProvider: contact.ai_tts_provider || undefined,
          ttsModel: contact.ai_tts_model || undefined,
          ttsBaseUrl: contact.ai_tts_base_url || undefined,
          ttsApiKey: contact.ai_tts_key || undefined,
          ttsVoice: contact.ai_tts_voice || 'default',
          behaviorPreference: contact.ai_behavior_preference || 'default',
        }
      : undefined;

    const aiId = contact.ai_id || contact.target_id || contactId;
    const { data: aiChar } = await supabase
      .from('ai_characters')
      .select('name, persona, avatar_url')
      .eq('id', aiId)
      .single();

    return {
      brain,
      name: contact.nickname || aiChar?.name || 'Manager',
      persona: contact.persona || aiChar?.persona || 'I am the manager here.',
      avatarUrl: contact.avatar_url || aiChar?.avatar_url || '',
      aiId,
    };
  }

  // ── Step 2: contactId might be an ai_id — look up by ai_id ───────────────
  const { data: contactByAiId } = await supabase
    .from('contacts')
    .select('*')
    .eq('ai_id', contactId)
    .single();

  if (contactByAiId) {
    const hasKey = !!(contactByAiId.ai_api_key && contactByAiId.ai_api_key.trim() !== '');
    console.log(`[brain-lookup] Found contact by ai_id. nickname=${contactByAiId.nickname} hasKey=${hasKey}`);

    const brain: AiBrainConfig | undefined = hasKey
      ? {
          provider: contactByAiId.ai_provider || 'gemini',
          model: contactByAiId.ai_model || 'gemini-2.5-flash',
          apiBaseUrl: contactByAiId.ai_base_url || undefined,
          apiKey: contactByAiId.ai_api_key,
          skills: typeof contactByAiId.ai_skills === 'string'
            ? JSON.parse(contactByAiId.ai_skills)
            : (contactByAiId.ai_skills || []),
          cognitiveMode: contactByAiId.ai_cognitive_mode || 'standard',
          littleBrainProvider: contactByAiId.ai_little_provider || undefined,
          littleBrainModel: contactByAiId.ai_little_model || undefined,
          littleBrainApiKey: contactByAiId.ai_little_key || undefined,
          littleBrainBaseUrl: contactByAiId.ai_little_base_url || undefined,
          difficultyThreshold: contactByAiId.ai_difficulty_threshold ?? 50,
        }
      : undefined;

    return {
      brain,
      name: contactByAiId.nickname || 'Manager',
      persona: contactByAiId.persona || 'I am the manager here.',
      avatarUrl: contactByAiId.avatar_url || '',
      aiId: contactId,
    };
  }

  // ── Step 3: Fallback — look up in ai_characters by id ────────────────────
  console.log(`[brain-lookup] Contact NOT found by id or ai_id for: ${contactId}`);
  const { data: aiChar } = await supabase
    .from('ai_characters')
    .select('name, persona, avatar_url')
    .eq('id', contactId)
    .single();

  return {
    brain: undefined,
    name: aiChar?.name || 'Manager',
    persona: aiChar?.persona || 'I am the manager here.',
    avatarUrl: aiChar?.avatar_url || '',
    aiId: contactId,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buildingId, managerId, basicFunction, skillPrompt, userId, buildingName, language } = body;

    // ── Resolve manager info + brain config ──────────────────────────────────
    const { brain: dbBrain, name: managerName, persona: managerPersona, aiId: managerAiId } =
      await getBrainConfigForContact(managerId);

    // brain priority:
    // 1. body.brain (from frontend localStorage) — has the actual apiKey configured by user
    // 2. dbBrain (from SQLite contacts) — may have key if PATCH saved it correctly
    const brain: AiBrainConfig | undefined =
      (body.brain?.apiKey ? body.brain : undefined) ?? dbBrain ?? body.brain;

    console.log(`[building-function-trigger] manager=${managerName} contactId=${managerId} aiId=${managerAiId} provider=${brain?.provider ?? 'none'} hasKey=${!!(brain?.apiKey)} source=${body.brain?.apiKey ? 'localStorage' : dbBrain?.apiKey ? 'db' : 'none'}`);


    // ── Generate content ─────────────────────────────────────────────────────────────
    const result = await serverGenerateBuildingContent(
      buildingId, managerId, managerName, managerPersona, basicFunction, brain, skillPrompt, language
    );

    // ── Reject error/fallback markdown — never save these ─────────────────────────
    const ERROR_PATTERNS = [
      'no api key', 'api key', '未配置', 'api 密锁', 'configure your api',
      'contact settings', 'working hard...', 'zzz', 'gemini_api_key',
      'openai_api_key', 'deepseek_api_key', 'please set', 'please open',
    ];
    const mdLower = (result.markdown || '').toLowerCase();
    if (ERROR_PATTERNS.some(p => mdLower.includes(p)) || !result.markdown?.trim()) {
      console.warn(`[building-function-trigger] Discarding error/fallback: "${result.markdown?.slice(0, 80)}"`);
      return NextResponse.json({ skipped: true, reason: 'error_content' }, { status: 422 });
    }

    // ── Build the content object ────────────────────────────────────────────
    const contentId = `content_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const content = {
      id: contentId, buildingId, authorId: managerId,
      markdown: result.markdown, likes: 0, dislikes: 0, comments: []
    };

    // ── Persist to building_contents table ───────────────────────────────
    try {
      await supabase.from('building_contents').insert([{
        id: contentId, building_id: buildingId, author_id: managerId,
        markdown: result.markdown, likes: 0, dislikes: 0,
        user_id: userId
      }]);
      console.log(`[building-function-trigger] Persisted content ${contentId} for building ${buildingId}`);
    } catch (dbErr) {
      console.error('[building-function-trigger] Failed to persist content to DB:', dbErr);
    }

    // ── Push as a chat message to the user ─────────────────────────────────
    if (userId && managerAiId) {
      try {
        const bName = buildingName || buildingId;
        let intro: string;
        if (language === '简体中文') {
          intro = `📋 我刚在【${bName}】完成了新的产出，分享给你！`;
        } else if (language === '日本語') {
          intro = `📋 【${bName}】で新しいコンテンツを生成しました！シェアします！`;
        } else {
          intro = `📋 I just produced something new at **${bName}**! Here's what I made:`;
        }
        const chatText = `${intro}\n\n${result.markdown}`;
        await supabase.from('pending_ai_messages').insert([{
          id: crypto.randomUUID(), user_id: userId, ai_id: managerAiId, text: chatText
        }]);
        console.log(`[building-function-trigger] Pushed chat message from ${managerName} to user ${userId}`);
      } catch (msgErr) {
        console.error('[building-function-trigger] Failed to push chat message:', msgErr);
      }
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in building content generation:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}
