import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'map_config.json');

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Minimal validation to ensure buildings and streets exist
    if (!body || !Array.isArray(body.buildings) || !Array.isArray(body.streets)) {
      return NextResponse.json({ error: 'Invalid payload, must contain buildings and streets arrays' }, { status: 400 });
    }

    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ success: true, message: 'Map config saved successfully' });
  } catch (error) {
    console.error('Error saving map config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
