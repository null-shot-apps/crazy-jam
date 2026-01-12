# AI Vibe Coach Setup

Your habit tracker now uses **Gemini 2.0 Flash** for natural language processing!

## Setup Instructions

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click "Create API Key"
   - Copy your API key

2. **Add the API Key to Your Environment**
   - Create a file named `.env.local` in the `packages/crazy-jam` directory
   - Add this line:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   - Replace `your_api_key_here` with your actual API key

3. **Restart the Development Server**
   - The app will automatically pick up the new environment variable

## What the AI Can Do

The AI Vibe Coach can now understand natural language commands like:

### Add Habits
- "yo add some gym stuff for me i wanna get ripped"
- "Add a habit for reading"
- "I want to meditate every morning"

### Remove Habits
- "Remove my workout"
- "Delete the reading habit"

### Change Themes
- "Make it dark mode"
- "Give me a sunset vibe"
- "Make it high energy"
- "Make it calm"

### Generate Complete Schedules
- "Make me a schedule to be a better person in 2 weeks"
- "Create a fitness routine for me"
- "I want to be more productive"

The AI will:
- Parse messy, natural input
- Ask clarifying questions when needed
- Generate habits with times, descriptions, and motivational quotes
- Remember your conversation history
- Provide personalized responses

## How It Works

1. **Natural Language Processing**: Your message is sent to Gemini 2.0 Flash
2. **Function Calling**: The AI decides which actions to take (add/remove habits, change theme, etc.)
3. **Context Awareness**: The AI knows your current habits and conversation history
4. **Dynamic Updates**: The UI updates immediately based on AI actions

## Privacy Note

Your conversations and habit data are sent to Google's Gemini API for processing. No data is stored permanently on external servers - everything stays in your browser's local storage.

