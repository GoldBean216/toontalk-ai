import { NextRequest, NextResponse } from 'next/server';
import { PRESET_SKILLS } from '@/lib/ai-skills';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const skill = PRESET_SKILLS.find(s => s.id === id);
  
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  }

  // In a real manifest, we'd add more metadata (API schemas, settings, etc.)
  return NextResponse.json(skill);
}
