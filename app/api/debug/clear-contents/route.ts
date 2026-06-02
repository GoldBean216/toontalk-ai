import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/debug/clear-contents
 * Clears building_contents and building_reactions tables.
 * The browser localStorage (toon_map_buildings_*) must be cleared client-side.
 */
export async function POST(req: NextRequest) {
  try {
    const contentsResult = localDb.prepare('DELETE FROM building_contents').run();
    const reactionsResult = localDb.prepare('DELETE FROM building_reactions').run();

    return NextResponse.json({
      success: true,
      deleted: {
        contents: contentsResult.changes,
        reactions: reactionsResult.changes
      },
      note: 'DB cleared. Also clear browser localStorage key "toon_map_buildings_*" to reset the UI.'
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
