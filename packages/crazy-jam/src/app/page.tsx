'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Mood = 'energized' | 'calm' | 'stressed' | 'neutral';

type Habit = {
  id: string;
  name: string;
  streak: number;
  time: string;
  lastCompleted?: string;
  completed: boolean;
  alternatives?: { [key in Mood]?: string };
  why?: string;
  how?: string;
  quote?: string;
};

type Theme = {
  name: string;
  gradient: string[];
  cardOpacity: number;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userName] = useState('Friend');
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number }[]>([]);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [dailyFlow, setDailyFlow] = useState(0);
  const [focusedHabitId, setFocusedHabitId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>({
    name: 'default',
    gradient: ['#E0C3FC', '#8EC5FC', '#F1F2B5'],
    cardOpacity: 0.1,
  });
  const [reminderTimers, setReminderTimers] = useState<{ [key: string]: NodeJS.Timeout }>({});

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
          // Trigger focus mode
          setFocusedHabitId(habit.id);
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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const input = chatInput.trim();
    const inputLower = input.toLowerCase();
    
    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      // Check for theme change commands
      if (inputLower.includes('dark mode') || inputLower.includes('make it dark')) {
        await handleThemeChange('dark');
      } else if (inputLower.includes('sunset') || inputLower.includes('sunset vibe')) {
        await handleThemeChange('sunset');
      } else if (inputLower.includes('high energy') || inputLower.includes('energetic')) {
        await handleThemeChange('energy');
      } else if (inputLower.includes('calm') || inputLower.includes('peaceful')) {
        await handleThemeChange('calm');
      } else if (inputLower.includes('add') && inputLower.includes('habit')) {
        await handleAddHabit(input);
      } else if (inputLower.includes('remove') && inputLower.includes('habit')) {
        await handleRemoveHabit(input);
      } else if (inputLower.includes('schedule') || inputLower.includes('make me')) {
        await handleScheduleGeneration();
      } else {
        // Check for habit completion
        let habitCompleted = false;
        habits.forEach((habit) => {
          const habitKeywords = habit.name.toLowerCase().split(' ');
          const matchesHabit = habitKeywords.some((keyword) => inputLower.includes(keyword));

          if (matchesHabit && (inputLower.includes('finished') || inputLower.includes('completed') || inputLower.includes('did') || inputLower.includes('done'))) {
            setHabits((prev) =>
              prev.map((h) =>
                h.id === habit.id
                  ? { ...h, streak: h.streak + 1, lastCompleted: new Date().toISOString(), completed: true }
                  : h
              )
            );
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: `🎉 Amazing! Your ${habit.name} streak is now ${habit.streak + 1} days!`,
              timestamp: Date.now(),
            };
            setChatHistory((prev) => [...prev, assistantMessage]);
            habitCompleted = true;
            triggerConfetti();
          }
        });

        if (!habitCompleted) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: `I can help you add/remove habits, change themes, or create a schedule. Try: "Add a habit for reading", "Make it dark mode", or "Make me a schedule to be a better person in 2 weeks"`,
            timestamp: Date.now(),
          };
          setChatHistory((prev) => [...prev, assistantMessage]);
        }
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleThemeChange = async (themeName: string) => {
    const themes: { [key: string]: Theme } = {
      dark: {
        name: 'dark',
        gradient: ['#1a1a2e', '#16213e', '#0f3460'],
        cardOpacity: 0.2,
      },
      sunset: {
        name: 'sunset',
        gradient: ['#ff6b6b', '#ee5a6f', '#c44569'],
        cardOpacity: 0.15,
      },
      energy: {
        name: 'energy',
        gradient: ['#f093fb', '#f5576c', '#feca57'],
        cardOpacity: 0.12,
      },
      calm: {
        name: 'calm',
        gradient: ['#a8edea', '#fed6e3', '#d4fc79'],
        cardOpacity: 0.1,
      },
    };

    const newTheme = themes[themeName] || themes.calm;
    setCurrentTheme(newTheme);

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: `✨ Theme changed to ${themeName}! The vibe is now ${themeName === 'dark' ? 'mysterious' : themeName === 'sunset' ? 'warm and cozy' : themeName === 'energy' ? 'electric' : 'peaceful'}.`,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, assistantMessage]);
  };

  const handleAddHabit = async (input: string) => {
    if (habits.length >= 7) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: "You've reached the maximum of 7 habits. Remove one first to add a new one.",
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
      return;
    }

    // Extract habit name from input
    const habitMatch = input.match(/add.*?habit.*?for\s+(.+)/i) || input.match(/add\s+(.+)\s+habit/i);
    const habitName = habitMatch ? habitMatch[1].trim() : 'New Habit';

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: habitName.charAt(0).toUpperCase() + habitName.slice(1),
      streak: 0,
      time: '09:00',
      completed: false,
    };

    setHabits((prev) => [...prev, newHabit]);
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: `✨ Added "${newHabit.name}" to your habits! Default time is 9:00 AM. Click Edit to change it.`,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, assistantMessage]);
    scheduleReminder(newHabit);
  };

  const handleRemoveHabit = async (input: string) => {
    // Find habit to remove
    const habitToRemove = habits.find((h) => 
      input.toLowerCase().includes(h.name.toLowerCase())
    );

    if (habitToRemove) {
      setHabits((prev) => prev.filter((h) => h.id !== habitToRemove.id));
      clearReminder(habitToRemove.id);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: `🗑️ Removed "${habitToRemove.name}" from your habits.`,
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
    } else {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: "I couldn't find that habit. Try being more specific.",
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
    }
  };

  const scheduleReminder = (habit: Habit) => {
    // Clear existing reminder for this habit
    clearReminder(habit.id);

    const scheduleNextReminder = () => {
      const now = new Date();
      const [hours, minutes] = habit.time.split(':').map(Number);
      const habitTime = new Date();
      habitTime.setHours(hours, minutes, 0, 0);

      // If habit time has passed today, schedule for tomorrow
      if (habitTime <= now) {
        habitTime.setDate(habitTime.getDate() + 1);
      }

      // Calculate reminder time (10 minutes before)
      const reminderTime = new Date(habitTime.getTime() - 10 * 60 * 1000);
      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      if (timeUntilReminder > 0) {
        const timer = setTimeout(() => {
          if (notificationPermission === 'granted') {
            const motivations = [
              `Get ready to ${habit.name.toLowerCase()}! You're building something amazing.`,
              `${habit.name} is coming up in 10 minutes. You've got this!`,
              `Time to shine! ${habit.name} starts soon.`,
              `Your future self will thank you. ${habit.name} in 10 minutes.`,
              `Let's keep that streak going! ${habit.name} is almost here.`,
            ];
            const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
            
            new Notification('Motivation of the moment', {
              body: randomMotivation,
              icon: '🔥',
            });
          }
          // Schedule next reminder for tomorrow
          scheduleNextReminder();
        }, timeUntilReminder);

        setReminderTimers((prev) => ({ ...prev, [habit.id]: timer }));
      }
    };

    scheduleNextReminder();
  };

  const clearReminder = (habitId: string) => {
    if (reminderTimers[habitId]) {
      clearTimeout(reminderTimers[habitId]);
      setReminderTimers((prev) => {
        const newTimers = { ...prev };
        delete newTimers[habitId];
        return newTimers;
      });
    }
  };

  // Schedule reminders for all habits on mount and when habits change
  useEffect(() => {
    habits.forEach((habit) => {
      scheduleReminder(habit);
    });

    return () => {
      // Clear all reminders on unmount
      Object.values(reminderTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [habits.map(h => h.id + h.time).join(',')]);

  const handleScheduleGeneration = async () => {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '🧠 Generating your personalized schedule...',
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, assistantMessage]);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate habits based on the goal
    const generatedHabits: Habit[] = [
      {
        id: Date.now().toString() + '1',
        name: 'Morning Meditation',
        streak: 0,
        time: '07:00',
        completed: false,
        why: 'Reduces stress and improves focus throughout the day',
        how: 'Start with 5 minutes of deep breathing in a quiet space',
        quote: '"Peace comes from within. Do not seek it without." - Buddha',
      },
      {
        id: Date.now().toString() + '2',
        name: 'Read 30 Minutes',
        streak: 0,
        time: '08:30',
        completed: false,
        why: 'Expands knowledge and improves cognitive function',
        how: 'Choose a book that excites you, read without distractions',
        quote: '"A reader lives a thousand lives before he dies." - George R.R. Martin',
      },
      {
        id: Date.now().toString() + '3',
        name: 'Exercise',
        streak: 0,
        time: '18:00',
        completed: false,
        why: 'Boosts energy, mood, and overall health',
        how: 'Start with 20 minutes of movement you enjoy',
        quote: '"The only bad workout is the one that didn\'t happen."',
      },
      {
        id: Date.now().toString() + '4',
        name: 'Gratitude Journal',
        streak: 0,
        time: '21:00',
        completed: false,
        why: 'Increases happiness and positive thinking',
        how: 'Write down 3 things you\'re grateful for each evening',
        quote: '"Gratitude turns what we have into enough."',
      },
      {
        id: Date.now().toString() + '5',
        name: 'Drink 8 Glasses Water',
        streak: 0,
        time: '12:00',
        completed: false,
        why: 'Improves energy, skin health, and body function',
        how: 'Keep a water bottle with you, sip throughout the day',
        quote: '"Water is the driving force of all nature." - Leonardo da Vinci',
      },
    ];

    setHabits(generatedHabits);
    
    const motivationalQuotes = [
      '"Small steps lead to big changes."',
      '"Consistency is the key to transformation."',
      '"Your future self will thank you."',
      '"Progress, not perfection."',
      '"Every day is a fresh start."',
    ];

    const scheduleMessage = `✨ Your personalized 2-week transformation schedule is ready!

${generatedHabits.map((h, i) => `${i + 1}. **${h.name}** at ${formatTime(h.time)}
   Why: ${h.why}
   How: ${h.how}
   ${h.quote}
`).join('\n')}

Remember: Focus on progress, not perfection. You've got this! 💪`;

    const resultMessage: ChatMessage = {
      role: 'assistant',
      content: scheduleMessage,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, resultMessage]);

    // Schedule reminders for all new habits
    generatedHabits.forEach((habit) => {
      scheduleReminder(habit);
    });
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

  const handleDismissFocus = () => {
    setFocusedHabitId(null);
  };

  const handleCompleteFocus = (habitId: string) => {
    handleHabitClick(habitId);
    setFocusedHabitId(null);
  };

  return (
    <div 
      className={`habit-tracker ${themeClass} ${focusedHabitId ? 'focus-mode' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${currentTheme.gradient.join(', ')})`,
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      }}
    >
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

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {focusedHabitId && (
          <motion.div
            className="focus-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {habits.map((habit) => {
              if (habit.id === focusedHabitId) {
                return (
                  <motion.div
                    key={habit.id}
                    className="focus-card glass-card-sleek"
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  >
                    <h2 className="focus-title">Time to vibe</h2>
                    <h3 className="focus-habit-name">{habit.name}</h3>
                    <p className="focus-time">{formatTime(habit.time)}</p>
                    <div className="focus-actions">
                      <button
                        onClick={handleDismissFocus}
                        className="focus-btn dismiss-btn"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleCompleteFocus(habit.id)}
                        className="focus-btn complete-btn"
                      >
                        Complete
                      </button>
                    </div>
                  </motion.div>
                );
              }
              return null;
            })}
          </motion.div>
        )}
      </AnimatePresence>

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
          <motion.div
            className={`vibe-orb ${mood} ${dailyFlow > 50 ? 'pulse-fast' : ''}`}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="orb-inner"></div>
            <div className="orb-glow"></div>
          </motion.div>
          <p className="orb-label daily-flow-text">{Math.round(dailyFlow)}% DAILY FLOW</p>
        </div>

        {/* Habit Management Buttons */}
        <div className="habit-management">
          <button
            onClick={() => {
              if (habits.length >= 7) {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: "You've reached the maximum of 7 habits. Remove one first.",
                  timestamp: Date.now(),
                };
                setChatHistory((prev) => [...prev, assistantMessage]);
                return;
              }
              const habitName = prompt('Enter habit name:');
              if (habitName) {
                const newHabit: Habit = {
                  id: Date.now().toString(),
                  name: habitName,
                  streak: 0,
                  time: '09:00',
                  completed: false,
                };
                setHabits((prev) => [...prev, newHabit]);
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: `✨ Added "${habitName}" to your habits!`,
                  timestamp: Date.now(),
                };
                setChatHistory((prev) => [...prev, assistantMessage]);
                scheduleReminder(newHabit);
              }
            }}
            className="management-btn add-btn glass-card-sleek"
            disabled={habits.length >= 7}
          >
            + Add Habit
          </button>
          <button
            onClick={() => {
              if (habits.length === 0) {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: 'No habits to remove.',
                  timestamp: Date.now(),
                };
                setChatHistory((prev) => [...prev, assistantMessage]);
                return;
              }
              const habitNames = habits.map((h, i) => `${i + 1}. ${h.name}`).join('\n');
              const habitIndex = prompt(`Select habit to remove:\n${habitNames}\n\nEnter number:`);
              if (habitIndex) {
                const index = parseInt(habitIndex) - 1;
                if (index >= 0 && index < habits.length) {
                  const removedHabit = habits[index];
                  setHabits((prev) => prev.filter((_, i) => i !== index));
                  clearReminder(removedHabit.id);
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: `🗑️ Removed "${removedHabit.name}".`,
                    timestamp: Date.now(),
                  };
                  setChatHistory((prev) => [...prev, assistantMessage]);
                }
              }
            }}
            className="management-btn remove-btn glass-card-sleek"
            disabled={habits.length === 0}
          >
            - Remove Habit
          </button>
        </div>

        {/* Habit Cards */}
        <div className="habits-grid">
          {habits.map((habit, index) => {
            const suggested = getSuggestedHabit(habit);
            const isAlternative = suggested !== habit.name;
            const isEditing = editingHabitId === habit.id;

            return (
              <motion.div 
                key={habit.id} 
                className={`habit-card glass-card-sleek ${habit.completed ? 'completed' : ''} ${focusedHabitId === habit.id ? 'focused-habit' : ''}`}
                onClick={() => handleHabitClick(habit.id)}
                style={{ cursor: 'pointer' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  damping: 20,
                  stiffness: 300,
                  delay: index * 0.1,
                }}
              >
                <div className="habit-header">
                  <div className="habit-title-section">
                    <h3 className="habit-title">{habit.name}</h3>
                    {(habit.why || habit.how) && (
                      <div className="habit-description">
                        {habit.why && <p className="habit-why"><strong>Why:</strong> {habit.why}</p>}
                        {habit.how && <p className="habit-how"><strong>How:</strong> {habit.how}</p>}
                      </div>
                    )}
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
              </motion.div>
            );
          })}
        </div>

        {/* Floating Chat Bubble */}
        <motion.button
          className="chat-bubble"
          onClick={() => setIsChatOpen(!isChatOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isChatOpen ? '✕' : '💬'}
        </motion.button>

        {/* AI Vibe Coach Chat Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              className="chat-panel glass-card"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <h3 className="chat-title">🧠 Vibe Coach</h3>
              <div className="chat-history">
                {chatHistory.length === 0 ? (
                  <p className="chat-placeholder">
                    💬 I&apos;m your AI Vibe Coach! Try:
                    <br />• &quot;Add a habit for reading&quot;
                    <br />• &quot;Make it dark mode&quot;
                    <br />• &quot;Give me a sunset vibe&quot;
                    <br />• &quot;Make me a schedule to be a better person&quot;
                  </p>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      className={msg.role === 'user' ? 'chat-user' : 'chat-assistant'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <p>{msg.content}</p>
                      <span className="chat-timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
              <form onSubmit={handleChatSubmit} className="chat-input-form">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="chat-input glass-input"
                  disabled={isProcessing}
                />
                <button type="submit" className="chat-submit glow-button" disabled={isProcessing}>
                  {isProcessing ? '...' : '→'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}










































