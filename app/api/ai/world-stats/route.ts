import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // 1. Total Content Count
    let totalRow;
    if (userId) {
      totalRow = localDb.prepare("SELECT COUNT(*) as count FROM building_contents WHERE user_id = ?").get(userId) as { count: number } | undefined;
    } else {
      totalRow = localDb.prepare("SELECT COUNT(*) as count FROM building_contents WHERE user_id IS NULL").get() as { count: number } | undefined;
    }
    const totalContents = totalRow ? totalRow.count : 0;

    // 2. Most Liked Content
    let mostLikedContentRow;
    if (userId) {
      mostLikedContentRow = localDb.prepare(`
        SELECT bc.*, 
               COALESCE((SELECT nickname FROM contacts WHERE (ai_id = bc.author_id OR id = bc.author_id) AND user_id = ? LIMIT 1), 
                        (SELECT name FROM ai_characters WHERE id = bc.author_id LIMIT 1), 
                        'Unknown') as author_name,
               COALESCE((SELECT avatar_url FROM contacts WHERE (ai_id = bc.author_id OR id = bc.author_id) AND user_id = ? LIMIT 1), 
                        (SELECT avatar_url FROM ai_characters WHERE id = bc.author_id LIMIT 1), 
                        '') as author_avatar
        FROM building_contents bc
        WHERE bc.user_id = ?
        ORDER BY bc.likes DESC, bc.created_at DESC
        LIMIT 1
      `).get(userId, userId, userId) as any;
    } else {
      mostLikedContentRow = localDb.prepare(`
        SELECT bc.*, 
               COALESCE((SELECT name FROM ai_characters WHERE id = bc.author_id LIMIT 1), 
                        'Unknown') as author_name,
               COALESCE((SELECT avatar_url FROM ai_characters WHERE id = bc.author_id LIMIT 1), 
                        '') as author_avatar
        FROM building_contents bc
        WHERE bc.user_id IS NULL
        ORDER BY bc.likes DESC, bc.created_at DESC
        LIMIT 1
      `).get() as any;
    }

    let mostLikedContent = null;
    if (mostLikedContentRow) {
      mostLikedContent = {
        id: mostLikedContentRow.id,
        buildingId: mostLikedContentRow.building_id,
        authorId: mostLikedContentRow.author_id,
        markdown: mostLikedContentRow.markdown,
        likes: mostLikedContentRow.likes || 0,
        dislikes: mostLikedContentRow.dislikes || 0,
        authorName: mostLikedContentRow.author_name,
        authorAvatar: mostLikedContentRow.author_avatar
      };
    }

    // 3. Most Popular Character
    let mostLikedCharRow;
    if (userId) {
      mostLikedCharRow = localDb.prepare(`
        SELECT author_id, SUM(likes) as total_likes,
               COALESCE((SELECT nickname FROM contacts WHERE (ai_id = author_id OR id = author_id) AND user_id = ? LIMIT 1), 
                        (SELECT name FROM ai_characters WHERE id = author_id LIMIT 1), 
                        author_name) as author_name,
               COALESCE((SELECT avatar_url FROM contacts WHERE (ai_id = author_id OR id = author_id) AND user_id = ? LIMIT 1), 
                        (SELECT avatar_url FROM ai_characters WHERE id = author_id LIMIT 1), 
                        author_avatar) as author_avatar
        FROM posts
        WHERE author_id IS NOT NULL AND author_id != '' AND (user_id = ? OR id LIKE 'default-post-%')
        GROUP BY author_id
        ORDER BY total_likes DESC
        LIMIT 1
      `).get(userId, userId, userId) as any;
    } else {
      mostLikedCharRow = localDb.prepare(`
        SELECT author_id, SUM(likes) as total_likes,
               COALESCE((SELECT name FROM ai_characters WHERE id = author_id LIMIT 1), 
                        author_name) as author_name,
               COALESCE((SELECT avatar_url FROM ai_characters WHERE id = author_id LIMIT 1), 
                        author_avatar) as author_avatar
        FROM posts
        WHERE author_id IS NOT NULL AND author_id != '' AND user_id IS NULL
        GROUP BY author_id
        ORDER BY total_likes DESC
        LIMIT 1
      `).get() as any;
    }

    let mostLikedCharacter = null;
    if (mostLikedCharRow) {
      mostLikedCharacter = {
        authorId: mostLikedCharRow.author_id,
        totalLikes: mostLikedCharRow.total_likes || 0,
        authorName: mostLikedCharRow.author_name,
        authorAvatar: mostLikedCharRow.author_avatar
      };
    }

    return NextResponse.json({
      totalContents,
      mostLikedContent,
      mostLikedCharacter
    });
  } catch (error: any) {
    console.error('[world-stats GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
