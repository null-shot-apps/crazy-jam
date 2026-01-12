'use client';

import { useState, useEffect } from 'react';

type Mood = 'energized' | 'calm' | 'stressed' | 'neutral';

type Habit = {
  id: string;
  name: string;
  streak: number;
  lastCompleted?: string;
  alternatives?: { [key in Mood]?: string };
};

const defaultHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning Workout',
    streak: 0,
    alternatives: {
      stressed: '5-Minute Breathwork',
      calm: 'Gentle Stretching',
      energized: 'Intense Workout',
    },
  },
  {
    id: '2',
    name: 'Read for 20 minutes',
    streak: 0,
    alternatives: {
      stressed: 'Listen to calming music',
      calm: 'Read for 20 minutes',
      energized: 'Learn something new',
    },
  },
  {
    id: '3',
    name: 'Drink 8 glasses of water',
    streak: 0,
  },
];

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(defaultHabits);
  const [mood, setMood] = useState<Mood>('neutral');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [showMoodPrompt, setShowMoodPrompt] = useState(true);

  // Dynamic theme based on overall streak performance
  const avgStreak = habits.reduce((sum, h) => sum + h.streak, 0) / habits.length;
  const themeClass = avgStreak > 5 ? 'theme-warm' : avgStreak > 2 ? 'theme-balanced' : 'theme-cool';

  useEffect(() => {
    document.body.className = themeClass;
  }, [themeClass]);

  const handleMoodSelect = (selectedMood: Mood) => {
    setMood(selectedMood);
    setShowMoodPrompt(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const input = chatInput.toLowerCase();
    let response = "I didn't quite catch that. Try saying something like 'I just finished a 10-minute walk'";

    // Simple NLP-like pattern matching
    habits.forEach((habit) => {
      const habitKeywords = habit.name.toLowerCase().split(' ');
      const matchesHabit = habitKeywords.some((keyword) => input.includes(keyword));

      if (matchesHabit && (input.includes('finished') || input.includes('completed') || input.includes('did') || input.includes('done'))) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habit.id
              ? { ...h, streak: h.streak + 1, lastCompleted: new Date().toISOString() }
              : h
          )
        );
        response = `🎉 Amazing! Your ${habit.name} streak is now ${habit.streak + 1} days!`;
      }
    });

    setChatHistory((prev) => [...prev, `You: ${chatInput}`, `App: ${response}`]);
    setChatInput('');
  };

  const getSuggestedHabit = (habit: Habit) => {
    if (habit.alternatives && habit.alternatives[mood]) {
      return habit.alternatives[mood];
    }
    return habit.name;
  };

  return (
    <div className={`habit-tracker ${themeClass}`}>
      {/* Mood Prompt Modal */}
      {showMoodPrompt && (
        <div className="mood-modal">
          <div className="mood-content">
            <h2>How are you feeling today?</h2>
            <div className="mood-options">
              <button onClick={() => handleMoodSelect('energized')} className="mood-btn energized">
                ⚡ Energized
              </button>
              <button onClick={() => handleMoodSelect('calm')} className="mood-btn calm">
                🌊 Calm
              </button>
              <button onClick={() => handleMoodSelect('stressed')} className="mood-btn stressed">
                😰 Stressed
              </button>
              <button onClick={() => handleMoodSelect('neutral')} className="mood-btn neutral">
                😌 Neutral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container">
        <header className="header">
          <h1>Your Vibe, Your Habits</h1>
          <button onClick={() => setShowMoodPrompt(true)} className="mood-indicator">
            Current mood: {mood} ✨
          </button>
        </header>

        {/* Habit Cards */}
        <div className="habits-grid">
          {habits.map((habit) => {
            const suggested = getSuggestedHabit(habit);
            const isAlternative = suggested !== habit.name;

            return (
              <div key={habit.id} className="habit-card">
                <div className="habit-header">
                  <h3>{habit.name}</h3>
                  <span className="streak-badge">{habit.streak} 🔥</span>
                </div>
                {isAlternative && (
                  <div className="alternative-suggestion">
                    💡 Try instead: <strong>{suggested}</strong>
                  </div>
                )}
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(habit.streak * 10, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversational Chat Interface */}
        <div className="chat-section">
          <div className="chat-history">
            {chatHistory.length === 0 ? (
              <p className="chat-placeholder">
                💬 Tell me what you've accomplished! Try: "I just finished a 10-minute walk"
              </p>
            ) : (
              chatHistory.map((msg, idx) => (
                <p key={idx} className={msg.startsWith('You:') ? 'chat-user' : 'chat-app'}>
                  {msg}
                </p>
              ))
            )}
          </div>
          <form onSubmit={handleChatSubmit} className="chat-input-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="I just finished..."
              className="chat-input"
            />
            <button type="submit" className="chat-submit">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

