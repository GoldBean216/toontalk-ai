import { NextResponse } from 'next/server';
import { PRESET_SKILLS } from '@/lib/ai-skills';

export async function GET() {
  // In a real app, this would fetch from a remote URL or DB.
  // For now, we serve the local presets to simulate a market.
  return NextResponse.json(PRESET_SKILLS);
}
