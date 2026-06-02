import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/building-contents?buildingId=xxx
 * Returns the persisted generated contents for a building,
 * ordered newest-first, capped at 10.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const userId = searchParams.get('userId');

    if (!buildingId) {
      return NextResponse.json({ error: 'buildingId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('building_contents')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter in-memory to keep only building contents that are global or match the current user ID
    const filteredData = (data || []).filter((row: any) => !row.user_id || row.user_id === userId);

    // Map DB row → MapBuildingContent shape expected by the frontend (capped at 10)
    const contents = filteredData.slice(0, 10).map((row: any) => ({
      id: row.id,
      buildingId: row.building_id,
      authorId: row.author_id,
      markdown: row.markdown,
      likes: row.likes || 0,
      dislikes: row.dislikes || 0,
      comments: []
    }));

    return NextResponse.json({ contents });
  } catch (error: any) {
    console.error('[building-contents GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/ai/building-contents/react
 * Called by the USER (not AI) to like/dislike a content item.
 * Persists the user reaction and updates counts.
 */
export async function POST(req: NextRequest) {
  try {
    const { contentId, reaction, reactorId } = await req.json();
    if (!contentId || !reaction || !reactorId) {
      return NextResponse.json({ error: 'contentId, reaction, reactorId required' }, { status: 400 });
    }

    // Deduplication check
    const { data: existing } = await supabase
      .from('building_reactions')
      .select('id, reaction')
      .eq('content_id', contentId)
      .eq('reactor_id', reactorId)
      .single();

    if (existing) {
      // Return current counts without change
      const { data: cur } = await supabase
        .from('building_contents')
        .select('likes, dislikes')
        .eq('id', contentId)
        .single();
      return NextResponse.json({ 
        skipped: true, 
        previousReaction: existing.reaction,
        likes: cur?.likes || 0,
        dislikes: cur?.dislikes || 0
      });
    }

    // Insert reaction
    const { default: crypto } = await import('crypto');
    await supabase.from('building_reactions').insert([{
      id: crypto.randomUUID(),
      content_id: contentId,
      reactor_id: reactorId,
      reaction
    }]);

    // Update counts
    const { data: currentContent } = await supabase
      .from('building_contents')
      .select('likes, dislikes')
      .eq('id', contentId)
      .single();

    const newLikes = reaction === 'like'
      ? (currentContent?.likes || 0) + 1
      : (currentContent?.likes || 0);
    const newDislikes = reaction === 'dislike'
      ? (currentContent?.dislikes || 0) + 1
      : (currentContent?.dislikes || 0);

    await supabase
      .from('building_contents')
      .update({ likes: newLikes, dislikes: newDislikes })
      .eq('id', contentId);

    return NextResponse.json({ success: true, likes: newLikes, dislikes: newDislikes });
  } catch (error: any) {
    console.error('[building-contents POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
