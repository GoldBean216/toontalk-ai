import { NextRequest, NextResponse } from 'next/server';
import { PRESET_CHARACTERS } from '@/lib/character-presets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const character = PRESET_CHARACTERS.find(c => c.id === id);
  
  if (!character) {
    return NextResponse.json({ error: 'Character template not found' }, { status: 404 });
  }

  return NextResponse.json(character);
}
