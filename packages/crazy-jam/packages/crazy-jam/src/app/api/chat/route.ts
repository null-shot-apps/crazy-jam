import { NextRequest, NextResponse } from 'next/server';
import { generateCoachResponse } from '../../../lib/gemini';

interface ChatRequest {
  message: string;
  habits: Array<{
    id: string;
    title: string;
    time: string;
    streak?: number;
    completed?: boolean;
    why?: string;
    how?: string;
    quote?: string;
  }>;
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { message, habits, conversationHistory } = body;

    const response = await generateCoachResponse(message, habits, conversationHistory);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'Sorry, I had trouble processing that. Could you try rephrasing?', action: 'NONE' },
      { status: 500 }
    );
  }
}



