import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { serverGenerateWebhookResponse, parseAndConvertJsonToMarkdown } from '@/lib/gemini-server';
import { PRESET_SKILLS } from '@/lib/ai-skills';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'map_config.json');

const DEFAULT_BUILDINGS = [
  {
    id: 'hq',
    name: '🏢 TOON CORP HQ',
    type: 'office',
    x: -350,
    y: -400,
    width: 240,
    height: 240,
    emoji: '🏢',
    description: 'Main research lab and team workstation.',
    tag: 'WORKSTATION',
    actionText: 'View Office 💻',
    functions: [
      {
        id: 'hq-news',
        name: 'News Collection',
        type: 'skill',
        skillId: 'wise_mentor',
        description: 'Collects latest news and industry updates.',
        assigneeId: 'Edison'
      }
    ]
  },
  {
    id: 'cafe',
    name: '☕ TOON CAFÉ',
    type: 'shop',
    x: 450,
    y: -350,
    width: 180,
    height: 220,
    emoji: '🥐',
    description: 'Premium roasted coffee & croissants.',
    tag: 'BREW',
    actionText: 'Enter Café ☕',
    functions: [
      {
        id: 'cafe-coupons',
        name: 'Coupon System',
        type: 'skill',
        skillId: 'storyteller',
        description: 'Distributes daily coupons and tracks queueing.',
        assigneeId: 'Mittens'
      }
    ]
  },
  {
    id: 'gym',
    name: '💪 POWER GYM',
    type: 'training',
    x: -600,
    y: 150,
    width: 180,
    height: 180,
    emoji: '🏃',
    description: 'High-intensity fitness center.',
    tag: 'FITNESS',
    actionText: 'Train Here 🏋️'
  },
  {
    id: 'plaza',
    name: '⛲ FOUNTAIN PLAZA',
    type: 'park',
    x: -150,
    y: -80,
    width: 220,
    height: 200,
    emoji: '🌳',
    description: 'A beautiful public park and fountain.',
    tag: 'RELAX',
    actionText: 'Stroll Park ⛲'
  },
  {
    id: 'cinema',
    name: '🎬 TOON CINEMA',
    type: 'entertainment',
    x: 550,
    y: 100,
    width: 180,
    height: 180,
    emoji: '🎟️',
    description: '3D movies and classic animation theatres.',
    tag: 'CINEMA',
    actionText: 'Watch Movie 🎬',
    functions: [
      {
        id: 'cinema-shows',
        name: 'Showtimes Info',
        type: 'info',
        description: 'Displays current and upcoming movie showtimes.'
      }
    ]
  },
  {
    id: 'arcade',
    name: '🎮 ARCADE ZONE',
    type: 'entertainment',
    x: 350,
    y: 400,
    width: 180,
    height: 200,
    emoji: '🕹️',
    description: 'Retro game consoles and pinball machines.',
    tag: 'GAMES',
    actionText: 'Play Games 🎮'
  },
  {
    id: 'hospital',
    name: '🏥 TOON HOSPITAL',
    type: 'hospital',
    x: -400,
    y: 360,
    width: 180,
    height: 200,
    emoji: '🏥',
    description: 'Medical care and healing center for sick toons.',
    tag: 'MEDICAL',
    actionText: 'Visit Hospital 🏥'
  }
];

async function getBuildings() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.buildings || DEFAULT_BUILDINGS;
  } catch (error) {
    return DEFAULT_BUILDINGS;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildingId, contactId, userId } = body;

    if (!buildingId || !contactId || !userId) {
      return NextResponse.json({ error: 'Missing buildingId, contactId, or userId' }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Fetch contact details
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // 2. Resolve building and check assigned functions
    const buildings = await getBuildings();
    const building = buildings.find((b: any) => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ success: true, consumed: false, message: 'Building not found' });
    }

    const assignedFunctions = building.functions?.filter((f: any) => 
      !f.assigneeId || f.assigneeId === contact.nickname || f.assigneeId === contact.name
    ) || [];

    if (assignedFunctions.length === 0) {
      return NextResponse.json({
        success: true,
        consumed: false,
        message: 'No functions available for this character in this building'
      });
    }

    // 3. Map brain configuration
    const parsedBrain = contact.ai_provider ? {
      provider: contact.ai_provider,
      model: contact.ai_model || undefined,
      apiBaseUrl: contact.ai_base_url || undefined,
      apiKey: contact.ai_api_key || undefined,
      skills: typeof contact.ai_skills === 'string' ? JSON.parse(contact.ai_skills) : (contact.ai_skills || []),
      cognitiveMode: contact.ai_cognitive_mode || 'standard',
      littleBrainProvider: contact.ai_little_provider || undefined,
      littleBrainModel: contact.ai_little_model || undefined,
      littleBrainApiKey: contact.ai_little_key || undefined,
      littleBrainBaseUrl: contact.ai_little_base_url || undefined,
      difficultyThreshold: contact.ai_difficulty_threshold !== undefined ? Number(contact.ai_difficulty_threshold) : 50,
      ttsProvider: contact.ai_tts_provider || undefined,
      ttsModel: contact.ai_tts_model || undefined,
      ttsBaseUrl: contact.ai_tts_base_url || undefined,
      ttsApiKey: contact.ai_tts_key || undefined,
      ttsVoice: contact.ai_tts_voice || undefined,
    } : undefined;

    let consumedAny = false;
    const executionResults: any[] = [];

    // 4. Process each assigned function
    for (const fn of assignedFunctions) {
      let responseGenerated = false;
      let aiResponse: any = null;
      let processedPayloadId: string | null = null;

      if (fn.type === 'skill') {
        const skill = PRESET_SKILLS.find(s => s.id === fn.skillId);
        aiResponse = await serverGenerateWebhookResponse(
          contact.nickname || contact.name,
          contact.species || 'unknown',
          contact.persona || 'friendly',
          fn.name,
          fn.description || (skill ? skill.description : ''),
          '',
          parsedBrain,
          true,
          skill ? skill.name : undefined,
          skill ? (skill.handlerPrompt || skill.systemPromptFragment) : undefined
        );
        responseGenerated = true;
        consumedAny = true;
      } else {
        // info Board or generic fallback
        aiResponse = await serverGenerateWebhookResponse(
          contact.nickname || contact.name,
          contact.species || 'unknown',
          contact.persona || 'friendly',
          fn.name,
          fn.description || '',
          '',
          parsedBrain,
          true
        );
        responseGenerated = true;
        consumedAny = true;
      }

      // Insert message or highlight post if response was successfully generated
      if (responseGenerated && aiResponse) {
        if (aiResponse.format === 'highlight') {
          const { error: postErr } = await supabase.from('posts').insert({
            author_id: contact.id,
            content: aiResponse.content,
            author_name: contact.nickname || contact.name,
            author_species: contact.species || 'unknown',
            author_avatar: contact.avatar_url || '',
            user_id: userId
          });
          if (postErr) throw postErr;
        } else {
          const { error: msgErr } = await supabase.from('pending_ai_messages').insert({
            user_id: userId,
            ai_id: contact.id,
            text: aiResponse.content
          });
          if (msgErr) throw msgErr;
        }

        // Outgoing webhook POST if configured
        if (fn.webhookUrl) {
          fetch(fn.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `**[${contact.nickname || contact.name} at ${building?.name || 'Building'} - ${fn.name}]**: ${aiResponse.content}`,
              buildingId,
              functionId: fn.id,
              functionName: fn.name,
              characterName: contact.nickname || contact.name,
              response: aiResponse
            })
          }).catch(err => console.error("Error forwarding outgoing webhook:", err));
        }

        executionResults.push({
          functionId: fn.id,
          functionName: fn.name,
          processedPayloadId,
          aiResponse
        });
      }
    }

    return NextResponse.json({
      success: true,
      consumed: consumedAny,
      results: executionResults
    });

  } catch (error: any) {
    console.error('Error in webhook consumption:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
