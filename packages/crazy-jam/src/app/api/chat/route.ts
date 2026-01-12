import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Define function declarations for the AI
const functions: FunctionDeclaration[] = [
  {
    name: 'addHabit',
    description: 'Add a new habit to the user\'s habit tracker',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'The name of the habit (e.g., "Morning Workout", "Read for 30 minutes")',
        } as const,
        time: {
          type: SchemaType.STRING,
          description: 'The scheduled time in HH:MM format (e.g., "08:00", "14:30")',
        } as const,
        why: {
          type: SchemaType.STRING,
          description: 'The benefit or reason for this habit',
        } as const,
        how: {
          type: SchemaType.STRING,
          description: 'A practical tip on how to do this habit',
        } as const,
        quote: {
          type: SchemaType.STRING,
          description: 'A motivational quote related to this habit',
        } as const,
      },
      required: ['title', 'time', 'why', 'how'],
    },
  },
  {
    name: 'removeHabit',
    description: 'Remove a habit from the user\'s habit tracker',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'The name of the habit to remove (can be partial match)',
        } as const,
      },
      required: ['title'],
    },
  },
  {
    name: 'changeTheme',
    description: 'Change the app theme/visual style',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        theme: {
          type: SchemaType.STRING,
          description: 'The theme to apply (dark, sunset, energy, calm, or default)',
        } as const,
      },
      required: ['theme'],
    },
  },
  {
    name: 'generateSchedule',
    description: 'Generate a complete habit schedule based on a goal',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        goal: {
          type: SchemaType.STRING,
          description: 'The user\'s goal (e.g., "be a better person", "get fit", "be more productive")',
        } as const,
        duration: {
          type: SchemaType.STRING,
          description: 'Time frame for the goal (e.g., "2 weeks", "1 month")',
        } as const,
        habitCount: {
          type: SchemaType.NUMBER,
          description: 'Number of habits to generate (5-7)',
        } as const,
      },
      required: ['goal'],
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { message: string; conversationHistory: Array<{ role: string; content: string }>; currentHabits: Array<{ id: string; name: string; time: string; streak: number; completed: boolean }> };
    const { message, conversationHistory, currentHabits } = body;

    // Initialize the model with function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      tools: [{ functionDeclarations: functions }],
    });

    // Build context for the AI
    const systemContext = `You are a friendly, motivational AI Vibe Coach for a minimalist habit tracking app. 

Current user habits: ${JSON.stringify(currentHabits)}

Your capabilities:
1. Add/remove habits (max 7 habits total)
2. Generate complete habit schedules based on goals
3. Change app themes (dark, sunset, energy, calm, default)
4. Provide motivation and guidance

Guidelines:
- Be conversational, warm, and encouraging
- If the user is vague, ask clarifying questions
- When adding habits, suggest good times based on the habit type
- Always provide meaningful "why" (benefits) and "how" (tips) for habits
- Keep responses concise but personal
- Use emojis sparingly but effectively

Current habit count: ${currentHabits.length}/7`;

    // Build conversation history
    const history = conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Start chat with history
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Send message with system context
    const result = await chat.sendMessage(`${systemContext}\n\nUser: ${message}`);
    const response = result.response;

    // Check if the AI wants to call functions
    const functionCalls = response.functionCalls();
    const actions = [];

    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        actions.push({
          type: call.name,
          params: call.args,
        });
      }
    }

    // Get text response
    const textResponse = response.text();

    return NextResponse.json({
      message: textResponse,
      actions,
      success: true,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        message: 'Sorry, I encountered an error. Please try again.',
        actions: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



