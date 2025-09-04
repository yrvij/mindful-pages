// Simple fallback functions when AI APIs are unavailable

export function detectMoodFromKeywords(content: string): string {
  const text = content.toLowerCase();
  
  // Positive keywords
  const positiveWords = ['happy', 'excited', 'good', 'great', 'amazing', 'wonderful', 'love', 'joy', 'grateful', 'blessed', 'awesome', 'fantastic', 'pleased', 'delighted', 'optimistic'];
  const negativeWords = ['sad', 'angry', 'frustrated', 'upset', 'disappointed', 'worried', 'anxious', 'stressed', 'terrible', 'awful', 'hate', 'depressed', 'annoyed', 'irritated', 'overwhelmed'];
  const neutralWords = ['okay', 'fine', 'normal', 'regular', 'usual', 'average'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });
  
  neutralWords.forEach(word => {
    if (text.includes(word)) neutralCount++;
  });
  
  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    return 'positive';
  } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
    return 'negative';
  } else if (negativeCount > 0 && positiveCount === 0) {
    return 'anxious';
  } else if (positiveCount > 0 && negativeCount === 0) {
    return 'content';
  }
  
  return 'neutral';
}

export function getCuratedPrompts(): Array<{ id: string; promptText: string; context: string }> {
  return [
    {
      id: "prompt-1",
      promptText: "What moment from today am I most grateful for, and why did it stand out to me?",
      context: "Gratitude and reflection"
    },
    {
      id: "prompt-2", 
      promptText: "What challenge did I face today, and what did I learn about myself in dealing with it?",
      context: "Growth and resilience"
    },
    {
      id: "prompt-3",
      promptText: "Describe a conversation I had today that made me think differently about something.",
      context: "Perspective and connection"
    },
    {
      id: "prompt-4",
      promptText: "What emotions am I carrying from today, and what might be causing them?",
      context: "Emotional awareness"
    },
    {
      id: "prompt-5",
      promptText: "If I could give advice to someone having a day like mine, what would I tell them?",
      context: "Self-compassion and wisdom"
    },
    {
      id: "prompt-6",
      promptText: "What small moment today brought me joy or peace, even if it was brief?",
      context: "Mindfulness and appreciation"
    },
    {
      id: "prompt-7",
      promptText: "What am I looking forward to tomorrow, and how does that make me feel right now?",
      context: "Hope and anticipation"
    },
    {
      id: "prompt-8",
      promptText: "Describe a pattern I've noticed in my thoughts or behaviors lately. Is it serving me?",
      context: "Self-awareness and growth"
    },
    {
      id: "prompt-9",
      promptText: "What would I want to remember about this day five years from now?",
      context: "Perspective and significance"
    },
    {
      id: "prompt-10",
      promptText: "How did I show kindness to myself or others today? How did it feel?",
      context: "Compassion and connection"
    }
  ];
}

export function getDailyPrompt(): { id: string; promptText: string; context: string } {
  const prompts = getCuratedPrompts();
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return prompts[dayOfYear % prompts.length];
}