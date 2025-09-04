import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  analyzeSentiment, 
  generateContextualPrompt, 
  extractThemes, 
  generateWeeklyInsight,
  generateDailyPrompt,
  generatePersonalizedPrompt
} from "./gemini";
import { detectMoodFromKeywords, getDailyPrompt } from "./fallbacks";
import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
import { 
  insertJournalEntrySchema, 
  insertAiPromptSchema,
  type JournalEntry 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Journal Entry Routes
  app.post("/api/journal-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertJournalEntrySchema.parse({
        ...req.body,
        userId,
      });

      // Calculate word count
      const wordCount = entryData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
      entryData.wordCount = wordCount;

      // Analyze sentiment if content is substantial
      if (wordCount > 10) {
        try {
          const sentiment = await analyzeSentiment(entryData.content);
          entryData.sentimentScore = sentiment.score.toString();
          entryData.sentimentLabel = sentiment.label;
          entryData.mood = sentiment.mood;

          // Extract themes from recent entries including this one
          const recentEntries = await storage.getUserJournalEntries(userId, 5);
          const allEntries = [
            { content: entryData.content, createdAt: new Date() }, 
            ...recentEntries.filter(entry => entry.createdAt).map(entry => ({
              content: entry.content,
              createdAt: entry.createdAt!
            }))
          ];
          const themes = await extractThemes(allEntries);
          entryData.themes = themes;
        } catch (error: any) {
          console.log("AI analysis failed, using fallbacks:", error.message);
          // Use simple keyword-based mood detection as fallback
          entryData.mood = detectMoodFromKeywords(entryData.content);
          entryData.sentimentScore = "0";
          entryData.sentimentLabel = entryData.mood;
          entryData.themes = [];
        }
      }

      const entry = await storage.createJournalEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  app.get("/api/journal-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const entries = await storage.getUserJournalEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.get("/api/journal-entries/:id", isAuthenticated, async (req: any, res) => {
    // Handle numeric params as limits, UUIDs as entry IDs
    const param = req.params.id;
    
    // If it's a number, treat as limit
    if (/^\d+$/.test(param)) {
      try {
        const userId = req.user.claims.sub;
        const limit = parseInt(param) || 100;
        const entries = await storage.getUserJournalEntries(userId, limit);
        res.json(entries);
        return;
      } catch (error) {
        console.error("Error fetching journal entries:", error);
        res.status(500).json({ message: "Failed to fetch journal entries" });
        return;
      }
    }
    
    // Otherwise treat as entry ID
    try {
      const entry = await storage.getJournalEntry(req.params.id);
      if (!entry || entry.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error fetching journal entry:", error);
      res.status(500).json({ message: "Failed to fetch journal entry" });
    }
  });

  app.patch("/api/journal-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existingEntry = await storage.getJournalEntry(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const updateData = req.body;
      
      // Recalculate word count if content changed
      if (updateData.content) {
        const wordCount = updateData.content.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        updateData.wordCount = wordCount;

        // Re-analyze sentiment for substantial changes
        if (wordCount > 10 && updateData.content !== existingEntry.content) {
          const sentiment = await analyzeSentiment(updateData.content);
          updateData.sentimentScore = sentiment.score.toString();
          updateData.sentimentLabel = sentiment.label;
          updateData.mood = sentiment.mood;
        }
      }

      const entry = await storage.updateJournalEntry(entryId, updateData);
      res.json(entry);
    } catch (error) {
      console.error("Error updating journal entry:", error);
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });

  app.delete("/api/journal-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existingEntry = await storage.getJournalEntry(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      await storage.deleteJournalEntry(entryId);
      res.json({ message: "Entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  });

  // AI Prompt Routes
  app.get("/api/ai-prompts/daily", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check for existing unused prompt
      let prompt = await storage.getUnusedPromptForUser(userId);
      
      if (!prompt) {
        try {
          // Try AI generation first - use new daily prompt system
          const recentEntries = await storage.getUserJournalEntries(userId, 5);
          
          let generatedPrompt;
          if (recentEntries.length > 0) {
            // Use personalized prompts based on user's recent entries
            const userEntries = recentEntries.map(entry => ({
              content: entry.content,
              mood: entry.mood,
              themes: entry.themes
            }));
            generatedPrompt = await generatePersonalizedPrompt(userEntries);
          } else {
            // Generate a fresh daily prompt for new users
            generatedPrompt = await generateDailyPrompt();
          }
          
          // Store the AI-generated prompt
          prompt = await storage.createAiPrompt({
            userId,
            promptText: generatedPrompt.prompt,
            context: `${generatedPrompt.category} - ${generatedPrompt.tone}`,
            isUsed: false,
          });
        } catch (aiError: any) {
          console.log("AI prompt generation failed, using curated prompt:", aiError.message);
          
          // Use curated fallback prompt
          const fallbackPrompt = getDailyPrompt();
          prompt = await storage.createAiPrompt({
            userId,
            promptText: fallbackPrompt.promptText,
            context: fallbackPrompt.context,
            isUsed: false,
          });
        }
      }

      res.json(prompt);
    } catch (error) {
      console.error("Error generating prompt:", error);
      res.status(500).json({ message: "Failed to generate prompt" });
    }
  });

  app.post("/api/ai-prompts/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const promptId = req.params.id;
      await storage.markPromptAsUsed(promptId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking prompt as used:", error);
      res.status(500).json({ message: "Failed to mark prompt as used" });
    }
  });

  // Force generate a new daily prompt
  app.post("/api/ai-prompts/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Generate a new prompt regardless of existing ones
      const recentEntries = await storage.getUserJournalEntries(userId, 5);
      
      let generatedPrompt;
      if (recentEntries.length > 0) {
        // Use personalized prompts based on user's recent entries
        const userEntries = recentEntries.map(entry => ({
          content: entry.content,
          mood: entry.mood,
          themes: entry.themes
        }));
        generatedPrompt = await generatePersonalizedPrompt(userEntries);
      } else {
        // Generate a fresh daily prompt for new users
        generatedPrompt = await generateDailyPrompt();
      }
      
      // Store the new AI-generated prompt
      const prompt = await storage.createAiPrompt({
        userId,
        promptText: generatedPrompt.prompt,
        context: `${generatedPrompt.category} - ${generatedPrompt.tone}`,
        isUsed: false,
      });

      res.json(prompt);
    } catch (error) {
      console.error("Error refreshing prompt:", error);
      res.status(500).json({ message: "Failed to refresh prompt" });
    }
  });

  // Analytics Routes
  app.get("/api/analytics/mood", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = req.query.days ? parseInt(req.query.days) : 7;
      const moodData = await storage.getUserMoodData(userId, days);
      res.json(moodData);
    } catch (error) {
      console.error("Error fetching mood data:", error);
      res.status(500).json({ message: "Failed to fetch mood data" });
    }
  });

  app.get("/api/analytics/mood/:days", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.params.days) || 1;
      const moodData = await storage.getUserMoodData(userId, days);
      
      // Add summary analysis for shorter periods
      if (days <= 3 && moodData.length > 0) {
        const avgSentiment = moodData.reduce((sum, d) => sum + d.sentiment, 0) / moodData.length;
        const moodCounts = moodData.reduce((acc: any, d) => {
          acc[d.mood] = (acc[d.mood] || 0) + 1;
          return acc;
        }, {});
        const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
          moodCounts[a] > moodCounts[b] ? a : b
        );

        res.json({
          dailyData: moodData,
          summary: {
            averageSentiment: Math.round(avgSentiment * 100) / 100,
            dominantMood,
            totalEntries: moodData.length,
            period: days === 1 ? 'today' : `past ${days} days`
          }
        });
      } else {
        res.json(moodData);
      }
    } catch (error) {
      console.error("Error fetching mood data:", error);
      res.status(500).json({ message: "Failed to fetch mood data" });
    }
  });

  app.get("/api/analytics/themes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recentEntries = await storage.getUserJournalEntries(userId, 20);
      
      if (recentEntries.length === 0) {
        res.json([]);
        return;
      }

      try {
        const validEntries = recentEntries.filter(entry => entry.createdAt).map(entry => ({
          content: entry.content,
          createdAt: entry.createdAt!
        }));
        const themes = validEntries.length > 0 ? await extractThemes(validEntries) : [];
        
        // Ensure we have at least 3 themes to show
        let finalThemes = themes;
        if (finalThemes.length < 3 && recentEntries.length > 0) {
          const fallbackThemes = ["personal reflection", "daily experiences", "emotional well-being"];
          const additionalThemes = fallbackThemes.slice(0, 3 - finalThemes.length);
          finalThemes = [...finalThemes, ...additionalThemes];
        }

        // Generate detailed theme analysis with Gemini
        const themeStats = await Promise.all(finalThemes.map(async (theme) => {
          // Use a more flexible matching approach - count all entries as potentially relevant
          // since themes are conceptual and may not appear as literal text
          const relevantEntries = recentEntries.filter(entry => 
            entry.themes?.some(t => t.toLowerCase().includes(theme.toLowerCase()) || theme.toLowerCase().includes(t.toLowerCase())) ||
            entry.content.toLowerCase().includes(theme.toLowerCase()) ||
            theme.toLowerCase().split(' ').some(word => entry.content.toLowerCase().includes(word))
          );
          
          // If no entries match, still include all entries for analysis since themes are conceptual
          const entriesForAnalysis = relevantEntries.length > 0 ? relevantEntries : recentEntries;

          // Generate detailed analysis for this theme
          const analysisPrompt = `Analyze this recurring theme: "${theme}"

Context from journal entries:
${entriesForAnalysis.map(e => `- ${e.content.slice(0, 150)}`).join('\n')}

Provide analysis in JSON:
{
  "explanation": "[Why this theme appears - insights about patterns, 2-3 sentences]",
  "suggestions": ["Actionable suggestion 1", "Actionable suggestion 2", "Actionable suggestion 3"]
}`;

          try {
            const response = await genai.models.generateContent({
              model: "gemini-2.5-flash",
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    explanation: { type: "string" },
                    suggestions: { type: "array", items: { type: "string" } }
                  },
                  required: ["explanation", "suggestions"]
                }
              },
              contents: analysisPrompt
            });

            const analysis = JSON.parse(response.text || "{}");
            
            return {
              theme,
              count: Math.max(1, relevantEntries.length), // Ensure count is at least 1
              explanation: analysis.explanation || "This theme appears regularly in your reflections.",
              suggestions: analysis.suggestions || ["Continue exploring this theme in your writing."]
            };
          } catch (analysisError) {
            return {
              theme,
              count: Math.max(1, relevantEntries.length), // Ensure count is at least 1
              explanation: `This theme appears ${relevantEntries.length} times, suggesting it's important in your current life.`,
              suggestions: [
                "Dedicate a full entry to exploring this theme deeper",
                "Notice what triggers thoughts about this topic",
                "Reflect on how your perspective has evolved"
              ]
            };
          }
        }));

        // Always show themes when we have entries, ensuring at least 3 are displayed
        res.json(themeStats);
      } catch (error: any) {
        console.log("Gemini theme analysis failed, using fallback");
        // Simple fallback with keyword analysis - ensure at least 3 themes
        const fallbackThemes = ["personal reflection", "daily experiences", "emotional well-being", "work", "relationships", "personal growth"];
        const themeStats = fallbackThemes.slice(0, 3).map(theme => ({
          theme,
          count: Math.max(1, recentEntries.filter(entry => 
            entry.content.toLowerCase().includes(theme.toLowerCase())
          ).length),
          explanation: `This theme appears in your recent writing, indicating it's on your mind.`,
          suggestions: [`Explore your feelings about ${theme} more deeply`, "Consider what changes you'd like to make", "Notice patterns in your thoughts"]
        }));
        
        res.json(themeStats);
      }
    } catch (error) {
      console.error("Error analyzing themes:", error);
      res.status(500).json({ message: "Failed to analyze themes" });
    }
  });

  // Weekly Insights Routes
  app.get("/api/insights/weekly", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
      weekStart.setHours(0, 0, 0, 0);

      // Check for existing insight
      let insight = await storage.getWeeklyInsight(userId, weekStart);
      
      // Also check if we have new entries since the last insight was created
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekEntries = await storage.getJournalEntriesByDateRange(userId, weekStart, weekEnd);
      const completedEntries = weekEntries.filter(entry => entry.isCompleted);
      
      // Regenerate if no insight exists or if we have more entries than the last insight accounted for
      if (!insight || (insight && completedEntries.length > (insight.entryCount || 0))) {
        // Generate new insight (weekEntries and completedEntries already fetched above)

        if (completedEntries.length > 0) {
          try {
            const validEntries = completedEntries.filter(entry => entry.createdAt).map(entry => ({
              content: entry.content,
              createdAt: entry.createdAt!
            }));
            const themes = await extractThemes(validEntries);
            const weeklyData = await generateWeeklyInsight(
              completedEntries.map(entry => ({
                content: entry.content,
                mood: entry.mood || 'neutral',
                createdAt: entry.createdAt!,
              }))
            );

            const averageSentiment = completedEntries.reduce((sum, entry) => 
              sum + parseFloat(entry.sentimentScore || '0'), 0
            ) / completedEntries.length;

            const moodCounts = completedEntries.reduce((acc, entry) => {
              acc[entry.mood || 'neutral'] = (acc[entry.mood || 'neutral'] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
              moodCounts[a] > moodCounts[b] ? a : b
            );

            // If updating existing insight, delete it first then create new one
            if (insight) {
              console.log(`Regenerating weekly insight for week ${weekStart.toISOString()} with ${completedEntries.length} entries`);
              await storage.deleteWeeklyInsight(insight.id);
            }
            
            insight = await storage.createWeeklyInsight({
              userId,
              weekStart,
              weekEnd,
              summary: weeklyData.insights,
              keyThemes: weeklyData.themes,
              moodTrend: dominantMood,
              averageSentiment: averageSentiment.toString(),
              entryCount: completedEntries.length,
            });
          } catch (error) {
            console.log("AI weekly insight failed, creating simple summary");
            const entryCount = completedEntries.length;
            const avgWordCount = Math.round(completedEntries.reduce((sum, e) => sum + (e.wordCount || 0), 0) / entryCount);
            
            // If updating existing insight, delete it first
            if (insight) {
              await storage.deleteWeeklyInsight(insight.id);
            }
            
            insight = await storage.createWeeklyInsight({
              userId,
              weekStart,
              weekEnd,
              summary: `You wrote ${entryCount} entries this week with an average of ${avgWordCount} words. Your journaling shows thoughtful reflection on your experiences.`,
              keyThemes: ["personal reflection", "self-awareness"],
              moodTrend: "Reflective",
              averageSentiment: "0",
              entryCount: completedEntries.length,
            });
          }
        }
      }

      res.json(insight);
    } catch (error) {
      console.error("Error generating weekly insight:", error);
      res.status(500).json({ message: "Failed to generate weekly insight" });
    }
  });

  app.get("/api/insights/weekly/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 5;
      const insights = await storage.getUserWeeklyInsights(userId, limit);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching weekly insights:", error);
      res.status(500).json({ message: "Failed to fetch weekly insights" });
    }
  });

  // Search Routes
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const allEntries = await storage.getUserJournalEntries(userId, 100);
      const searchResults = allEntries.filter(entry => 
        entry.content.toLowerCase().includes(query.toLowerCase()) ||
        entry.title?.toLowerCase().includes(query.toLowerCase()) ||
        entry.themes?.some(theme => theme.toLowerCase().includes(query.toLowerCase()))
      );

      res.json(searchResults);
    } catch (error) {
      console.error("Error searching entries:", error);
      res.status(500).json({ message: "Failed to search entries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
