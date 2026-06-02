import { NextResponse } from 'next/server';
import { PRESET_CHARACTERS } from '@/lib/character-presets';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(PRESET_CHARACTERS);
}
