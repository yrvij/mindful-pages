import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not found in environment variables");
}

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SentimentResult {
  score: number;
  label: string;
  mood: string;
  confidence: number;
}

export interface ContextualPrompt {
  prompt: string;
  context: string;
}

export interface WeeklyInsightResult {
  insights: string;
  moodTrend: string;
  themes: string[];
  recommendations: string[];
}

export interface DailyPrompt {
  prompt: string;
  category: string;
  tone: 'reflective' | 'creative' | 'goal-oriented' | 'gratitude' | 'mindful';
}

export async function analyzeSentiment(content: string): Promise<SentimentResult> {
  try {
    console.log("Analyzing sentiment with Gemini for content:", content.slice(0, 100));
    
    const prompt = `Analyze the sentiment of this journal entry and respond with JSON in this exact format:
{
  "score": [number between -1 and 1],
  "label": "[positive, negative, or neutral]",
  "mood": "[happy, sad, anxious, content, excited, frustrated, peaceful, or neutral]",
  "confidence": [number between 0 and 1]
}

Journal entry: "${content}"`;

    console.log("Making Gemini API call for sentiment analysis...");
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt
    });

    console.log("Gemini response received:", response.text);
    
    // Clean up markdown formatting from Gemini response
    let jsonText = response.text || "{}";
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    }
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }
    
    const result = JSON.parse(jsonText);
    
    return {
      score: Math.max(-1, Math.min(1, result.score || 0)),
      label: result.label || "neutral",
      mood: result.mood || "neutral",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
    };
  } catch (error) {
    console.error("Gemini sentiment analysis failed:", error);
    throw error;
  }
}

export async function generateContextualPrompt(
  recentContent: string[],
  themes: string[],
  currentMood?: string
): Promise<ContextualPrompt> {
  try {
    const prompt = `Based on the user's recent journal entries and patterns, generate a thoughtful writing prompt that will encourage deeper reflection.

Recent entries: ${recentContent.join("; ")}
Current themes: ${themes.join(", ")}
Current mood: ${currentMood || "unknown"}

Generate a personalized journal prompt that:
1. Builds on their recent thoughts
2. Encourages emotional growth
3. Is open-ended and thought-provoking
4. Feels natural and conversational

Respond with JSON in this format:
{
  "prompt": "[your writing prompt here]",
  "context": "[brief description of why this prompt fits their current state]"
}`;

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            context: { type: "string" }
          },
          required: ["prompt", "context"]
        }
      },
      contents: prompt
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      prompt: result.prompt || "What's on your mind today?",
      context: result.context || "General reflection"
    };
  } catch (error) {
    console.error("Gemini prompt generation failed:", error);
    throw error;
  }
}

export async function extractThemes(entries: Array<{ content: string; createdAt: Date }>): Promise<string[]> {
  try {
    if (entries.length === 0) return [];

    const allContent = entries.map(e => e.content).join(". ");
    console.log("Extracting themes from content:", allContent.slice(0, 200));
    
    const prompt = `Analyze these journal entries and identify the main themes, topics, and patterns. Focus on broad life areas and general categories.

Journal entries: "${allContent}"

Extract 3-5 key themes and respond with JSON in this format:
{
  "themes": ["theme1", "theme2", "theme3"]
}

Make themes broad and general (e.g., "work", "relationships", "personal growth", "health", "family", "hobbies", "emotions", "goals" rather than overly specific descriptions).`;

    console.log("Making Gemini API call for theme extraction...");
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt
    });

    console.log("Gemini theme response:", response.text);
    
    // Clean up markdown formatting from Gemini response
    let jsonText = response.text || "{}";
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    }
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }
    
    const result = JSON.parse(jsonText);
    return result.themes || [];
  } catch (error) {
    console.error("Gemini theme extraction failed:", error);
    throw error;
  }
}

export async function generateWeeklyInsight(entries: Array<{ content: string; mood?: string; createdAt: Date }>): Promise<WeeklyInsightResult> {
  try {
    if (entries.length === 0) {
      return {
        insights: "No entries this week to analyze.",
        moodTrend: "No data",
        themes: [],
        recommendations: ["Start journaling to track your progress!"]
      };
    }

    const entriesText = entries.map(e => 
      `${e.createdAt.toLocaleDateString()}: ${e.content} (mood: ${e.mood || 'unknown'})`
    ).join("\n");

    const prompt = `Analyze this week's journal entries and provide insights about patterns, growth, and recommendations.

This week's entries:
${entriesText}

Provide a thoughtful analysis with:
1. Key insights about their emotional journey
2. Overall mood trend for the week
3. Main themes that emerged
4. 2-3 personalized recommendations for growth

Respond with JSON in this format:
{
  "insights": "[2-3 sentences about their week and patterns]",
  "moodTrend": "[description of their emotional trajectory]",
  "themes": ["theme1", "theme2", "theme3"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

    console.log("Making Gemini API call for weekly insight...");
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt
    });

    console.log("Gemini weekly insight response:", response.text);
    
    // Clean up markdown formatting from Gemini response
    let jsonText = response.text || "{}";
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    }
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    const result = JSON.parse(jsonText);
    
    return {
      insights: result.insights || "Your journaling journey is developing beautifully.",
      moodTrend: result.moodTrend || "Stable",
      themes: result.themes || [],
      recommendations: result.recommendations || ["Keep writing regularly to track your growth."]
    };
  } catch (error) {
    console.error("Gemini weekly insight generation failed:", error);
    throw error;
  }
}

export async function generateDailyPrompt(userHistory?: string[]): Promise<DailyPrompt> {
  try {
    const historyContext = userHistory && userHistory.length > 0 
      ? `Recent user writing themes: ${userHistory.join(', ')}`
      : '';

    const prompt = `You are a thoughtful journaling companion. Create a short, engaging daily writing prompt that:
- Is 1-2 sentences max, easy to read
- Encourages authentic self-reflection  
- Avoids generic questions like "How was your day?"
- Uses simple, conversational language
${historyContext ? `- Relates to these user themes: ${historyContext}` : ''}

Keep it short, specific, and thought-provoking. Make it feel like a gentle question from a close friend.

Respond with JSON in this exact format:
{
  "prompt": "your short prompt here",
  "category": "category name", 
  "tone": "tone name"
}`;

    console.log("Making Gemini API call for daily prompt generation...");
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt
    });

    // Clean up markdown formatting from Gemini response
    let jsonText = response.text || "{}";
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    }
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    const result = JSON.parse(jsonText);
    
    return {
      prompt: result.prompt || "What's something you've learned about yourself recently that surprised you?",
      category: result.category || "Personal Growth", 
      tone: result.tone || "reflective"
    };
  } catch (error) {
    console.error("Gemini prompt generation failed:", error);
    
    // Short, easy-to-read fallback prompts
    const fallbackPrompts: DailyPrompt[] = [
      {
        prompt: "What small decision surprised you today?",
        category: "Personal Growth",
        tone: "reflective"
      },
      {
        prompt: "What would you tell your past self right now?",
        category: "Personal Growth", 
        tone: "reflective"
      },
      {
        prompt: "When did you feel most 'you' today?",
        category: "Emotions",
        tone: "mindful"
      },
      {
        prompt: "What's sparking your curiosity lately?",
        category: "Creativity",
        tone: "creative"
      },
      {
        prompt: "Who deserves a thank you from you?",
        category: "Relationships",
        tone: "gratitude"
      }
    ];
    
    // Use current date to deterministically pick a fallback prompt
    const today = new Date();
    const dayIndex = (today.getDate() + today.getMonth()) % fallbackPrompts.length;
    return fallbackPrompts[dayIndex];
  }
}

export async function generatePersonalizedPrompt(userEntries: Array<{ content: string; mood?: string; themes?: string[] }>): Promise<DailyPrompt> {
  if (userEntries.length === 0) {
    return generateDailyPrompt();
  }

  try {
    const recentThemes = userEntries
      .flatMap(entry => entry.themes || [])
      .slice(0, 10);
    
    const recentMoods = userEntries
      .map(entry => entry.mood)
      .filter(Boolean)
      .slice(0, 5);

    const prompt = `You are a personalized journaling companion. Create a unique daily prompt based on the user's recent writing patterns and themes. The prompt should:
- Build on their recent themes but offer a fresh perspective
- Encourage deeper exploration of topics they've been thinking about
- Help them discover new insights about familiar subjects
- Be specific enough to spark genuine reflection

Recent themes: ${recentThemes.join(', ')}
Recent moods: ${recentMoods.join(', ')}

Create a personalized journaling prompt that helps the user explore these topics from a new angle.

Respond with JSON in this exact format:
{
  "prompt": "your personalized prompt here",
  "category": "category name",
  "tone": "tone name"
}`;

    console.log("Making Gemini API call for contextual prompt generation...");
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt
    });

    // Clean up markdown formatting from Gemini response
    let jsonText = response.text || "{}";
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    }
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    const result = JSON.parse(jsonText);
    
    return {
      prompt: result.prompt || "What patterns do you notice in your recent thoughts and feelings, and what might they be telling you?",
      category: result.category || "Personal Growth",
      tone: result.tone || "reflective"
    };
  } catch (error) {
    console.error("Contextual prompt generation failed:", error);
    return generateDailyPrompt();
  }
}