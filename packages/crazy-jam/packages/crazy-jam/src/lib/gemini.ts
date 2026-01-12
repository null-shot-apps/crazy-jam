import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

// Initialize the model with gemini-2.0-flash
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        message: {
          type: SchemaType.STRING,
          description: 'The AI\'s natural response to the user'
        },
        action: {
          type: SchemaType.STRING,
          description: 'The action to perform based on user intent (ADD_HABIT, REMOVE_HABIT, UPDATE_THEME, GENERATE_SCHEDULE, or NONE)'
        },
        data: {
          type: SchemaType.OBJECT,
          description: 'Details for the action, like habit title, time, or theme colors',
          properties: {
            // For ADD_HABIT
            title: { type: SchemaType.STRING },
            time: { type: SchemaType.STRING },
            why: { type: SchemaType.STRING },
            how: { type: SchemaType.STRING },
            quote: { type: SchemaType.STRING },
            // For REMOVE_HABIT
            habitToRemove: { type: SchemaType.STRING },
            // For UPDATE_THEME
            theme: { type: SchemaType.STRING },
            colors: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            },
            // For GENERATE_SCHEDULE
            habits: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  time: { type: SchemaType.STRING },
                  why: { type: SchemaType.STRING },
                  how: { type: SchemaType.STRING },
                  quote: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      },
      required: ['message', 'action']
    }
  }
});

export interface CoachResponse {
  message: string;
  action: 'ADD_HABIT' | 'REMOVE_HABIT' | 'UPDATE_THEME' | 'GENERATE_SCHEDULE' | 'NONE';
  data?: {
    title?: string;
    time?: string;
    why?: string;
    how?: string;
    quote?: string;
    habitToRemove?: string;
    theme?: string;
    colors?: string[];
    habits?: Array<{
      title: string;
      time: string;
      why: string;
      how: string;
      quote: string;
    }>;
  };
}

export async function generateCoachResponse(
  userInput: string,
  currentHabits: any[],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<CoachResponse> {
  try {
    // Build the system prompt
    const systemPrompt = `You are a Vibe Coach - a supportive, motivational AI assistant that helps users build better habits. You have a warm, encouraging personality and speak naturally.

Current habits (max 7):
${currentHabits.map((h, i) => `${i + 1}. ${h.title} at ${h.time}${h.streak ? ` (${h.streak} day streak)` : ''}`).join('\n')}

Your capabilities:
1. ADD_HABIT: Add a new habit (only if under 7 habits). Generate a title, time (HH:MM AM/PM format), why (benefit), how (practical tip), and a motivational quote.
2. REMOVE_HABIT: Remove a habit by matching the user's description to an existing habit title.
3. UPDATE_THEME: Change the app's visual theme. Available themes: "dark", "sunset", "energy", "calm", "default". Return theme name and 3 gradient colors as hex codes.
4. GENERATE_SCHEDULE: Create 5-7 habits based on a goal. Each needs title, time, why, how, and quote.
5. NONE: Just chat and provide encouragement.

Guidelines:
- Be conversational and supportive
- If the user is vague, ask clarifying questions
- Parse messy input like "yo add some gym stuff" into structured habits
- Suggest realistic times spread throughout the day
- Keep descriptions concise but meaningful
- If habits are at max (7), suggest removing one first

Respond with JSON containing:
- message: Your natural language response
- action: The action to take (ADD_HABIT, REMOVE_HABIT, UPDATE_THEME, GENERATE_SCHEDULE, or NONE)
- data: The structured data needed for the action`;

    // Build conversation history
    const chatHistory = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Start chat with history
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand! I\'m your Vibe Coach, ready to help you build amazing habits. I can add/remove habits, generate schedules, change themes, and provide motivation. What would you like to work on?' }]
        },
        ...chatHistory
      ]
    });

    // Send the user's message
    const result = await chat.sendMessage(userInput);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const parsed = JSON.parse(text) as CoachResponse;

    return parsed;
  } catch (error) {
    console.error('Error generating coach response:', error);
    return {
      message: 'Sorry, I had trouble processing that. Could you try rephrasing?',
      action: 'NONE'
    };
  }
}




