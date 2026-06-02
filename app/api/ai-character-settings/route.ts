import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { assigneeId, buildingName, functionName, aiRoleSetting } = await req.json();

    if (!assigneeId || !aiRoleSetting) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Directory for AI character settings
    const charsDir = path.join(process.cwd(), 'ai_characters');
    
    // Ensure directory exists
    if (!fs.existsSync(charsDir)) {
      fs.mkdirSync(charsDir, { recursive: true });
    }

    const filePath = path.join(charsDir, `${assigneeId}.md`);
    
    let content = '';
    const newEntry = `- **${functionName} (${buildingName})**\n  - *Role Setting*: ${aiRoleSetting}`;

    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if "## Assigned Roles" section exists
      if (!content.includes('## Assigned Roles')) {
        content += `\n\n## Assigned Roles\n${newEntry}`;
      } else {
        content += `\n${newEntry}`;
      }
    } else {
      content = `# ${assigneeId} (AI Character Settings)\n\n## Assigned Roles\n${newEntry}`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error saving AI character setting:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
