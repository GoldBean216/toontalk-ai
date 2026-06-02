import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { nameA, speciesA, personaA, nameB, speciesB, mode } = await req.json();

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        const defaultGreetings = [
            `Honk! Hello ${nameB}! 🦢`,
            `Meow, hey ${nameB}! 🐾`,
            `Woof! Good day ${nameB}! 🐕`,
            `Beep boop! Greetings ${nameB}! 🤖`,
            `Oh, hello ${nameB}! 🌟`,
            `Honk honk, ${nameB}! 👋`,
            `Squeak! Nice to meet you, ${nameB}! 🐭`
        ];
        const greeting = defaultGreetings[Math.floor(Math.random() * defaultGreetings.length)];
        return NextResponse.json({ greeting });
    }
    
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    let modeInstruction = "just bumped into each other on the street and are having a casual chat.";
    let promptSuffix = "";
    if (mode === 'greeting') {
        modeInstruction = "just bumped into each other and are saying a quick friendly hello.";
        promptSuffix = "Make it a friendly, brief cartoon hello.";
    } else if (mode === 'visit') {
        modeInstruction = "are visiting each other. Character A is visiting Character B at their place/office.";
        promptSuffix = "Make it a polite, welcoming, or curious greeting.";
    } else if (mode === 'date') {
        modeInstruction = "are currently on a cute, whimsical cartoon date! It's romantic and sweet.";
        promptSuffix = "Make it sweet, flirty, or romantic in a toon way.";
    } else if (mode === 'sports') {
        modeInstruction = "are playing sports together (like basketball, tennis, or running) in a funny cartoonish way.";
        promptSuffix = "Make it energetic, sporty, and competitive.";
    } else if (mode === 'game') {
        modeInstruction = "are playing a board game or video game together, being competitive but playful.";
        promptSuffix = "Make it competitive, using gaming/boardgame lingo.";
    } else if (mode === 'festival') {
        modeInstruction = "are celebrating a festive party or holiday event together, very cheerful and excited!";
        promptSuffix = "Make it celebratory, happy, and party-themed.";
    } else if (mode === 'daily') {
        modeInstruction = "are having a casual hangout, sharing some snacks or drinks.";
        promptSuffix = "Make it relaxed, cozy, and casual.";
    } else if (mode === 'debate') {
        modeInstruction = "are having an intellectual, dramatic, or silly debate on a random topic.";
        promptSuffix = "Make it intellectual, rhetorical, or silly-serious.";
    } else if (mode === 'quarrel') {
        modeInstruction = "are having a hilarious, harmless cartoon quarrel or argument. They are annoyed at each other!";
        promptSuffix = "Make it sassy, grumbling, or a funny insult.";
    } else if (mode === 'fight') {
        modeInstruction = "are having a funny, non-harmful cartoon skirmish or fight (cloud-dust style like in Tom & Jerry)!";
        promptSuffix = "Make it a mock-threatening battle cry or cartoonish confrontation line.";
    }

    const prompt = `
      You are writing a micro-interaction between two characters who ${modeInstruction}
      Character A: ${nameA} (${speciesA}) - Persona: ${personaA}
      Character B: ${nameB} (${speciesB})
      
      Generate a single, very short line (max 10 words) from Character A to Character B. 
      Keep it funny and in-character for ${nameA}.
      ${promptSuffix}
      Return only the string, nothing else.
    `;

    const result = await model.generateContent(prompt);
    let greeting = result.response.text().trim();
    // Remove quotes if present
    greeting = greeting.replace(/^["']|["']$/g, '');

    return NextResponse.json({ greeting });
  } catch (error: any) {
    console.error("Error generating social greet:", error);
    return NextResponse.json({ greeting: "Hey there!" });
  }
}
