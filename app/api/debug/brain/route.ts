import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint: check what brain config is stored for a given contact id
 * GET /api/debug/brain?contactId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId');

  if (!contactId) {
    // List all contacts with their brain config
    const rows = localDb.prepare(`
      SELECT id, user_id, nickname, ai_id, target_id, ai_provider, ai_model,
             CASE WHEN ai_api_key IS NULL THEN 'NULL' WHEN ai_api_key = '' THEN 'EMPTY' ELSE 'SET(' || length(ai_api_key) || ' chars)' END as key_status
      FROM contacts
      ORDER BY created_at DESC
      LIMIT 20
    `).all();
    return NextResponse.json({ contacts: rows });
  }

  // Specific contact lookup
  const byId = localDb.prepare(`
    SELECT id, nickname, ai_id, target_id, ai_provider, ai_model,
           CASE WHEN ai_api_key IS NULL THEN 'NULL' WHEN ai_api_key = '' THEN 'EMPTY' ELSE 'SET(' || length(ai_api_key) || ' chars)' END as key_status
    FROM contacts WHERE id = ?
  `).get(contactId);

  const byAiId = localDb.prepare(`
    SELECT id, nickname, ai_id, target_id, ai_provider, ai_model,
           CASE WHEN ai_api_key IS NULL THEN 'NULL' WHEN ai_api_key = '' THEN 'EMPTY' ELSE 'SET(' || length(ai_api_key) || ' chars)' END as key_status
    FROM contacts WHERE ai_id = ?
  `).get(contactId);

  return NextResponse.json({
    searchedFor: contactId,
    byId,
    byAiId,
    hint: byId ? 'Found by id' : byAiId ? 'Found by ai_id' : 'NOT FOUND in contacts table'
  });
}
