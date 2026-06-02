import { NextResponse } from 'next/server';
import { serverGenerateBuildingReaction } from '@/lib/gemini-server';
import { supabase } from '@/lib/supabase-server';
import { AiBrainConfig } from '@/types';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function logDebug(message: string) {
  const logPath = path.join(process.cwd(), 'reaction_debug.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

/**
 * contactId in the simulation = contacts.id (UUID row key), NOT ai_id.
 * Fetch brain config and persona by querying contacts by id first.
 */
async function getContactInfo(contactId: string): Promise<{
  brain: AiBrainConfig | undefined;
  name: string;
  persona: string;
}> {
  // 1. Look up contact by row id (UUID)
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  // 2. Fallback: look up contact by ai_id (e.g. c1, c2)
  if (!contact) {
    const { data: contactByAi } = await supabase
      .from('contacts')
      .select('*')
      .eq('ai_id', contactId)
      .single();
    if (contactByAi) {
      contact = contactByAi;
    }
  }

  if (contact) {
    const hasKey = !!(contact.ai_api_key && contact.ai_api_key.trim() !== '');
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
        }
      : undefined;

    // Get display name/persona from ai_characters if available
    const aiId = contact.ai_id || contact.target_id || contactId;
    const { data: aiChar } = await supabase
      .from('ai_characters')
      .select('name, persona')
      .eq('id', aiId)
      .single();

    return {
      brain,
      name: contact.nickname || aiChar?.name || 'Visitor',
      persona: contact.persona || aiChar?.persona || 'I am visiting this building.',
    };
  }

  // Fallback 3: contactId might be an ai_id directly without a contact entry
  const { data: aiChar } = await supabase
    .from('ai_characters')
    .select('name, persona')
    .eq('id', contactId)
    .single();

  return {
    brain: undefined,
    name: aiChar?.name || 'Visitor',
    persona: aiChar?.persona || 'I am visiting this building.',
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buildingId, contactId, contentId, contentMarkdown } = body;

    logDebug(`=== POST /api/ai/building-reaction ===`);
    logDebug(`Request Body: buildingId=${buildingId}, contactId=${contactId}, contentId=${contentId}, contentMarkdownLength=${contentMarkdown?.length}`);

    // ── Deduplication: check if this AI already reacted to this content ─────
    try {
      const { data: existing } = await supabase
        .from('building_reactions')
        .select('id, reaction')
        .eq('content_id', contentId)
        .eq('reactor_id', contactId)
        .single();

      if (existing) {
        logDebug(`Deduplication: reactor ${contactId} already reacted (${existing.reaction}) to content ${contentId}. Skipping.`);
        console.log(`[building-reaction] ${contactId} already reacted (${existing.reaction}) to content ${contentId}. Skipping.`);
        return NextResponse.json({ reaction: existing.reaction, healthDelta: 0, skipped: true });
      }
    } catch (_) {
      // No prior reaction found — proceed
    }

    // ── Resolve contact info + brain config ──────────────────────────────────
    const { brain: dbBrain, name: contactName, persona: contactPersona } =
      await getContactInfo(contactId);

    const brain: AiBrainConfig | undefined =
      (body.brain?.apiKey ? body.brain : undefined) ?? dbBrain ?? body.brain;

    const apiKeyStatus = brain?.apiKey 
      ? `Present (length: ${brain.apiKey.length}, starts with: ${brain.apiKey.slice(0, 4)}...)`
      : 'None';
    logDebug(`Brain Info: contactName=${contactName}, provider=${brain?.provider || 'env'}, apiKey=${apiKeyStatus}`);

    let result;
    try {
      result = await serverGenerateBuildingReaction(
        contactId,
        contactName,
        contactPersona,
        contentMarkdown || 'Welcome to the building!',
        brain
      );
      logDebug(`Reaction result: ${JSON.stringify(result)}`);
    } catch (genErr: any) {
      logDebug(`Error during serverGenerateBuildingReaction: ${genErr.message || genErr}`);
      console.error('[building-reaction] AI Generation failed:', genErr);
      return NextResponse.json({ error: `AI reaction call failed: ${genErr.message || genErr}` }, { status: 500 });
    }

    let healthDelta = 0;
    if (result.reaction === 'like') healthDelta = 2;
    if (result.reaction === 'dislike') healthDelta = -2;

    // ── Persist the reaction (UNIQUE guard at DB level) ──────────────────────
    try {
      await supabase.from('building_reactions').insert([{
        id: crypto.randomUUID(),
        content_id: contentId,
        reactor_id: contactId,
        reaction: result.reaction
      }]);
      logDebug(`Persisted reaction '${result.reaction}' for reactor ${contactId} on ${contentId}`);
      console.log(`[building-reaction] ${contactName} reacted '${result.reaction}' to content ${contentId}`);
    } catch (insertErr: any) {
      if (insertErr?.message?.includes('UNIQUE') || insertErr?.code === 'SQLITE_CONSTRAINT') {
        logDebug(`Duplicate reaction prevented by DB constraint for ${contactId} on ${contentId}`);
        console.log(`[building-reaction] Duplicate prevented by DB constraint for ${contactId} on ${contentId}`);
        return NextResponse.json({ reaction: result.reaction, healthDelta: 0, skipped: true });
      }
      logDebug(`Failed to insert reaction: ${insertErr.message || insertErr}`);
      console.error('[building-reaction] Failed to insert reaction:', insertErr);
    }

    // ── Update likes/dislikes count in building_contents ────────────────────
    try {
      const { data: currentContent } = await supabase
        .from('building_contents')
        .select('likes, dislikes')
        .eq('id', contentId)
        .single();

      if (currentContent) {
        const newLikes = result.reaction === 'like'
          ? (currentContent.likes || 0) + 1
          : (currentContent.likes || 0);
        const newDislikes = result.reaction === 'dislike'
          ? (currentContent.dislikes || 0) + 1
          : (currentContent.dislikes || 0);

        await supabase
          .from('building_contents')
          .update({ likes: newLikes, dislikes: newDislikes })
          .eq('id', contentId);

        logDebug(`Updated building_contents counts: likes=${newLikes}, dislikes=${newDislikes}`);
        console.log(`[building-reaction] Updated content ${contentId}: likes=${newLikes}, dislikes=${newDislikes}`);
      }
    } catch (updateErr: any) {
      logDebug(`Failed to update content counts: ${updateErr.message || updateErr}`);
      console.error('[building-reaction] Failed to update content counts:', updateErr);
    }

    return NextResponse.json({ reaction: result.reaction, healthDelta });
  } catch (error: any) {
    logDebug(`Outer POST Catch Error: ${error.message || error}`);
    console.error('Error in building reaction generation:', error);
    return NextResponse.json({ error: 'Failed to generate reaction' }, { status: 500 });
  }
}
