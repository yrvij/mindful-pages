import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface SentimentAnalysis {
  score: number; // -1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive
  confidence: number; // 0 to 1
  label: string; // "positive", "negative", "neutral"
  mood: string; // "happy", "sad", "anxious", "calm", "energetic", etc.
}

export interface JournalPrompt {
  prompt: string;
  context: string;
  type: string; // "reflection", "gratitude", "goal-setting", "emotional-check"
}

export interface WeeklyInsightData {
  summary: string;
  keyThemes: string[];
  patterns: string[];
  recommendations: string[];
}

export async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a sentiment analysis expert specializing in journal entries. Analyze the emotional tone and mood of the text. Respond with JSON in this exact format:
          {
            "score": number between -1 and 1,
            "confidence": number between 0 and 1,
            "label": "positive" | "negative" | "neutral",
            "mood": "happy" | "sad" | "anxious" | "calm" | "energetic" | "reflective" | "frustrated" | "grateful" | "hopeful" | "content"
          }`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      score: Math.max(-1, Math.min(1, result.score || 0)),
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      label: result.label || "neutral",
      mood: result.mood || "neutral",
    };
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
    return {
      score: 0,
      confidence: 0,
      label: "neutral",
      mood: "neutral",
    };
  }
}

export async function generateContextualPrompt(
  recentEntries: string[],
  userThemes: string[],
  currentMood?: string
): Promise<JournalPrompt> {
  try {
    const context = `
Recent journal themes: ${userThemes.join(", ")}
Current mood: ${currentMood || "unknown"}
Recent entries context: ${recentEntries.slice(0, 3).join(" ... ")}
    `.trim();

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an empathetic AI journaling companion. Generate thoughtful, personalized prompts that encourage deep reflection and emotional growth. The prompts should be:
          1. Contextual to the user's recent experiences
          2. Open-ended to encourage free expression
          3. Supportive and non-judgmental
          4. Designed to help users discover patterns and insights
          
          Respond with JSON in this exact format:
          {
            "prompt": "A thoughtful question or writing prompt",
            "context": "Brief explanation of why this prompt might be helpful",
            "type": "reflection" | "gratitude" | "goal-setting" | "emotional-check"
          }`,
        },
        {
          role: "user",
          content: `Based on this context, generate a personalized journal prompt: ${context}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      prompt: result.prompt || "What's on your mind today? Take a moment to reflect on your current thoughts and feelings.",
      context: result.context || "A gentle invitation to express yourself freely.",
      type: result.type || "reflection",
    };
  } catch (error) {
    console.error("Prompt generation failed:", error);
    return {
      prompt: "How are you feeling right now? What thoughts or experiences would you like to explore today?",
      context: "A simple check-in to help you connect with your current state of mind.",
      type: "emotional-check",
    };
  }
}

export async function extractThemes(entries: Array<{ content: string; createdAt: Date }>): Promise<string[]> {
  try {
    const combinedText = entries
      .slice(0, 10) // Limit to recent entries
      .map(entry => entry.content)
      .join("\n\n---\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying recurring themes and patterns in personal writing. Analyze the journal entries and identify the most important recurring themes. Focus on:
          1. Emotional patterns
          2. Life areas (work, relationships, health, creativity, etc.)
          3. Activities or situations that appear frequently
          4. Personal growth topics
          
          Respond with JSON in this exact format:
          {
            "themes": ["theme1", "theme2", "theme3", "theme4", "theme5"]
          }
          
          Return 3-5 themes maximum, ordered by frequency and importance.`,
        },
        {
          role: "user",
          content: combinedText,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.themes || [];
  } catch (error) {
    console.error("Theme extraction failed:", error);
    return [];
  }
}

export async function generateWeeklyInsight(
  entries: Array<{ content: string; sentimentScore: number; mood: string; createdAt: Date }>,
  themes: string[]
): Promise<WeeklyInsightData> {
  try {
    const entriesText = entries
      .map(entry => `[${entry.createdAt.toDateString()}] Mood: ${entry.mood} | ${entry.content.slice(0, 200)}...`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a compassionate AI therapist analyzing a week's worth of journal entries. Provide insights that help the user understand their emotional patterns, growth, and areas for reflection. Be encouraging and supportive.
          
          Respond with JSON in this exact format:
          {
            "summary": "A warm, encouraging summary of the week's emotional journey",
            "keyThemes": ["theme1", "theme2", "theme3"],
            "patterns": ["pattern1", "pattern2"],
            "recommendations": ["suggestion1", "suggestion2"]
          }`,
        },
        {
          role: "user",
          content: `Analyze this week's journal entries and recurring themes:
          
          Entries:
          ${entriesText}
          
          Recurring themes: ${themes.join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      summary: result.summary || "This week showed continued growth in your self-awareness and emotional intelligence.",
      keyThemes: result.keyThemes || themes.slice(0, 3),
      patterns: result.patterns || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("Weekly insight generation failed:", error);
    return {
      summary: "This week you continued your journaling practice, which is a wonderful step in your personal growth journey.",
      keyThemes: themes.slice(0, 3),
      patterns: [],
      recommendations: ["Continue your daily writing practice", "Take time to reflect on your emotional patterns"],
    };
  }
}
