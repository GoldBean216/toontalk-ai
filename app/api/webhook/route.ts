import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { serverGenerateWebhookResponse, parseAndConvertJsonToMarkdown } from '@/lib/gemini-server';
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
        type: 'mcp',
        skillId: 'mcp_brave_search',
        description: 'Collects latest news and industry updates using web search.',
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
        type: 'workflow',
        skillId: 'workflow_copywriter',
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
    const { searchParams } = new URL(req.url);
    let buildingId = searchParams.get('buildingId');
    let functionId = searchParams.get('functionId');
    let userId = searchParams.get('userId');
    const token = searchParams.get('token');
    let payload: any = null;

    try {
      const body = await req.json();
      if (body) {
        const bodyBuildingId = body.buildingId;
        const bodyFunctionId = body.functionId;
        const bodyUserId = body.userId;

        if (bodyBuildingId && bodyFunctionId) {
          buildingId = buildingId || bodyBuildingId;
          functionId = functionId || bodyFunctionId;
          userId = userId || bodyUserId;
          payload = body.payload !== undefined ? body.payload : body;
        } else {
          payload = body;
        }
      }
    } catch (e) {
      // Body not present or not valid JSON
    }

    if (!payload) {
      payload = {};
    }

    if (!buildingId || !functionId) {
      return NextResponse.json({ error: 'Missing buildingId or functionId parameter' }, { status: 400 });
    }

    const supabase = createClient();

    // Fallback to first user profile if userId is missing
    if (!userId) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      if (profiles && profiles.length > 0) {
        userId = profiles[0].id;
      } else {
        return NextResponse.json({ error: 'No user profile found in database' }, { status: 400 });
      }
    }

    // Resolve building and function config
    const buildings = await getBuildings();
    const building = buildings.find((b: any) => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ error: `Building with ID "${buildingId}" not found` }, { status: 404 });
    }

    const fn = building.functions?.find((f: any) => f.id === functionId);
    if (!fn) {
      return NextResponse.json({ error: `Function with ID "${functionId}" not found in building "${buildingId}"` }, { status: 404 });
    }

    if (fn.type !== 'webhook') {
      return NextResponse.json({ error: `Function "${functionId}" is not a webhook type` }, { status: 400 });
    }

    if (fn.webhookToken) {
      if (!token || token !== fn.webhookToken) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
    }

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

    // Case A: Assigned
    if (fn.assigneeId) {
      let contact: any = null;

      // Find contact in contacts table matching the nickname
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('nickname', fn.assigneeId)
        .single();

      if (contactData) {
        contact = contactData;
      } else {
        // Fallback: look up in ai_characters by name
        const { data: charData } = await supabase
          .from('ai_characters')
          .select('*')
          .eq('name', fn.assigneeId)
          .single();

        if (charData) {
          contact = {
            id: charData.id,
            nickname: charData.name,
            species: charData.species,
            persona: charData.persona,
            avatar_url: charData.avatar_url
          };
        }
      }

      if (!contact) {
        return NextResponse.json({ error: `Assigned AI character "${fn.assigneeId}" not found` }, { status: 404 });
      }

      // Map brain configuration
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

      const markdownPayload = parseAndConvertJsonToMarkdown(payloadStr);

      // Call Gemini model
      const aiResponse = await serverGenerateWebhookResponse(
        contact.nickname || contact.name || fn.assigneeId,
        contact.species || 'unknown',
        contact.persona || 'friendly',
        fn.name,
        fn.description,
        markdownPayload,
        parsedBrain
      );

      // Insert message or highlight
      if (aiResponse.format === 'highlight') {
        const { data: post, error: postErr } = await supabase.from('posts').insert({
          author_id: contact.id,
          content: aiResponse.content,
          author_name: contact.nickname || contact.name || fn.assigneeId,
          author_species: contact.species || 'unknown',
          author_avatar: contact.avatar_url || '',
          user_id: userId
        });
        if (postErr) throw postErr;
      } else {
        const { data: msg, error: msgErr } = await supabase.from('pending_ai_messages').insert({
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
            content: `**[${contact.nickname || contact.name || fn.assigneeId} at ${building.name} - ${fn.name}]**: ${aiResponse.content}`,
            buildingId,
            functionId,
            functionName: fn.name,
            characterName: contact.nickname || contact.name || fn.assigneeId,
            response: aiResponse
          })
        }).catch(err => console.error("Error forwarding outgoing webhook:", err));
      }

      return NextResponse.json({
        success: true,
        processedImmediately: true,
        aiResponse
      });
    }

    // Case B: Unassigned - Buffer payload in database
    const { error: dbErr } = await supabase.from('webhook_payloads').insert({
      building_id: buildingId,
      function_id: functionId,
      payload: payloadStr,
      processed: 0
    });

    if (dbErr) {
      throw dbErr;
    }

    return NextResponse.json({
      success: true,
      processedImmediately: false,
      message: 'Webhook payload buffered successfully'
    });

  } catch (error: any) {
    console.error('Error handling incoming webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
