import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
});

const tools = [
  {
    functionDeclarations: [
      {
        name: 'add_habit',
        description: 'Add a new habit to the user\'s habit list',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The name of the habit',
            },
            time: {
              type: 'string',
              description: 'The scheduled time in HH:MM format (24-hour)',
            },
            why: {
              type: 'string',
              description: 'The benefit or reason for this habit',
            },
            how: {
              type: 'string',
              description: 'A practical tip on how to do this habit',
            },
            quote: {
              type: 'string',
              description: 'A motivational quote for this habit',
            },
          },
          required: ['title', 'time'],
        },
      },
      {
        name: 'remove_habit',
        description: 'Remove a habit from the user\'s habit list',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The name of the habit to remove (partial match is okay)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'change_theme',
        description: 'Change the app\'s visual theme',
        parameters: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              description: 'The theme name',
              enum: ['default', 'dark', 'sunset', 'energy', 'calm'],
            },
          },
          required: ['theme'],
        },
      },
      {
        name: 'generate_schedule',
        description: 'Generate a complete habit schedule based on a goal',
        parameters: {
          type: 'object',
          properties: {
            goal: {
              type: 'string',
              description: 'The user\'s goal or desired outcome',
            },
            duration: {
              type: 'string',
              description: 'Time period for the goal (e.g., "2 weeks", "1 month")',
            },
          },
          required: ['goal'],
        },
      },
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    const { message, history, currentHabits } = await request.json();

    const systemPrompt = `You are a supportive AI Vibe Coach for a minimalist habit tracking app. You help users manage their habits through natural conversation.

Current habits: ${JSON.stringify(currentHabits)}

Guidelines:
- Be warm, encouraging, and conversational
- When users want to add habits, use the add_habit function
- When users want to remove habits, use the remove_habit function
- When users want to change the theme, use the change_theme function
- When users want a complete schedule for a goal, use the generate_schedule function
- If the user is vague, ask clarifying questions
- Keep responses concise and motivating
- Maximum 7 habits allowed`;

    const chat = model.startChat({
      tools,
      history: history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage([
      { text: systemPrompt },
      { text: message },
    ]);

    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const actions = functionCalls.map((call) => ({
        type: call.name,
        params: call.args,
      }));

      return NextResponse.json({
        message: response.text() || 'Got it! Making those changes for you.',
        actions,
      });
    }

    return NextResponse.json({
      message: response.text(),
      actions: [],
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

