'use client';

import { useState, useEffect } from 'react';

type Mood = 'energized' | 'calm' | 'stressed' | 'neutral';

type Habit = {
  id: string;
  name: string;
  streak: number;
  time: string;
  lastCompleted?: string;
  completed: boolean;
  alternatives?: { [key in Mood]?: string };
};

const defaultHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning Workout',
    streak: 0,
    time: '08:00',
    completed: false,
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
    time: '19:00',
    completed: false,
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
    time: '12:00',
    completed: false,
  },
];

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(defaultHabits);
  const [mood, setMood] = useState<Mood | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [userName] = useState('Friend');
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number }[]>([]);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [dailyFlow, setDailyFlow] = useState(0);

  // Dynamic theme based on overall streak performance
  const avgStreak = habits.reduce((sum, h) => sum + h.streak, 0) / habits.length;
  const themeClass = avgStreak > 5 ? 'theme-warm' : avgStreak > 2 ? 'theme-balanced' : 'theme-cool';

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getVibeText = () => {
    if (mood === 'energized') return 'The vibe is electric';
    if (mood === 'calm') return 'The vibe is peaceful';
    if (mood === 'stressed') return 'The vibe is gentle';
    return 'The vibe is focused';
  };

  useEffect(() => {
    document.body.className = themeClass;
  }, [themeClass]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // Check for habit notifications every minute
  useEffect(() => {
    const checkHabitNotifications = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      habits.forEach((habit) => {
        if (habit.time === currentTime && !habit.completed && notificationPermission === 'granted') {
          new Notification('Time to vibe: ' + habit.name, {
            icon: '🔥',
            body: `It's time for your ${habit.name}`,
          });
        }
      });
    };

    const interval = setInterval(checkHabitNotifications, 60000); // Check every minute
    checkHabitNotifications(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [habits, notificationPermission]);

  // Calculate daily flow based on completed habits
  useEffect(() => {
    const completedCount = habits.filter((h) => h.completed).length;
    const newFlow = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;
    setDailyFlow(newFlow);
  }, [habits]);

  const triggerConfetti = () => {
    const newConfetti = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setConfetti(newConfetti);
    setTimeout(() => setConfetti([]), 2000);
  };

  const handleMoodSelect = (selectedMood: Mood) => {
    setMood(selectedMood);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const input = chatInput.toLowerCase();
    let response = "I didn't quite catch that. Try saying something like 'I just finished a 10-minute walk'";
    let habitCompleted = false;

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
        habitCompleted = true;
        triggerConfetti();
      }
    });

    setChatHistory((prev) => [...prev, `You: ${chatInput}`, `App: ${response}`]);
    setChatInput('');
  };

  const getSuggestedHabit = (habit: Habit) => {
    if (mood && habit.alternatives && habit.alternatives[mood]) {
      return habit.alternatives[mood];
    }
    return habit.name;
  };

  const handleEditTime = (habitId: string, currentTime: string) => {
    setEditingHabitId(habitId);
    setEditingTime(currentTime);
  };

  const handleSaveTime = (habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, time: editingTime } : h))
    );
    setEditingHabitId(null);
    setEditingTime('');
  };

  const handleHabitClick = (habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          const newCompleted = !h.completed;
          const newStreak = newCompleted ? h.streak + 1 : h.streak;
          
          if (newCompleted) {
            triggerConfetti();
          }
          
          return { ...h, completed: newCompleted, streak: newStreak, lastCompleted: new Date().toISOString() };
        }
        return h;
      })
    );
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className={`habit-tracker ${themeClass}`}>
      {/* Confetti Animation */}
      {confetti.length > 0 && (
        <div className="confetti-container">
          {confetti.map((particle) => (
            <div
              key={particle.id}
              className="confetti-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Mood Prompt Modal */}
      {mood === null && (
        <div className="mood-modal">
          <div className="mood-content glass-card">
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
        {/* Zen Header */}
        <header className="zen-header">
          <h1 className="zen-greeting">
            {getGreeting()}, {userName}. {getVibeText()}.
          </h1>
          <button onClick={() => setMood(null)} className="mood-indicator glass-card">
            {mood === 'energized' && '⚡'}
            {mood === 'calm' && '🌊'}
            {mood === 'stressed' && '😰'}
            {mood === 'neutral' && '😌'}
            <span className="mood-text">{mood || 'neutral'}</span>
          </button>
        </header>

        {/* Vibe Orb */}
        <div className="vibe-orb-container">
          <div className={`vibe-orb ${mood} ${dailyFlow > 50 ? 'pulse-fast' : ''}`}>
            <div className="orb-inner"></div>
            <div className="orb-glow"></div>
          </div>
          <p className="orb-label daily-flow-text">{Math.round(dailyFlow)}% DAILY FLOW</p>
        </div>

        {/* Habit Cards */}
        <div className="habits-grid">
          {habits.map((habit) => {
            const suggested = getSuggestedHabit(habit);
            const isAlternative = suggested !== habit.name;
            const isEditing = editingHabitId === habit.id;

            return (
              <div 
                key={habit.id} 
                className={`habit-card glass-card-sleek ${habit.completed ? 'completed' : ''}`}
                onClick={() => handleHabitClick(habit.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="habit-header">
                  <div className="habit-title-section">
                    <h3 className="habit-title">{habit.name}</h3>
                    <div className="habit-time-section">
                      {isEditing ? (
                        <>
                          <input
                            type="time"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="time-input"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveTime(habit.id);
                            }}
                            className="save-time-btn"
                          >
                            ✓
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="habit-time">{formatTime(habit.time)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTime(habit.id, habit.time);
                            }}
                            className="edit-time-btn"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="streak-badge">{habit.streak} 🔥</span>
                </div>
                {isAlternative && (
                  <div className="alternative-suggestion">
                    💡 Try instead: <strong>{suggested}</strong>
                  </div>
                )}
                <div className="progress-bar">
                  <div
                    className="progress-fill glow-pulse"
                    style={{ width: `${Math.min(habit.streak * 10, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversational Chat Interface */}
        <div className="chat-section glass-card">
          <div className="chat-history">
            {chatHistory.length === 0 ? (
              <p className="chat-placeholder">
                💬 Tell me what you've accomplished! Try: "I just finished a 10-minute walk"
              </p>
            ) : (
              chatHistory.map((msg, idx) => (
                <p key={idx} className={msg.startsWith('You:') ? 'chat-user slide-in' : 'chat-app slide-in'}>
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
              className="chat-input glass-input"
            />
            <button type="submit" className="chat-submit glow-button">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

























