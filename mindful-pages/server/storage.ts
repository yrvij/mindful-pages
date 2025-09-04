import {
  users,
  journalEntries,
  aiPrompts,
  weeklyInsights,
  type User,
  type UpsertUser,
  type JournalEntry,
  type InsertJournalEntry,
  type AiPrompt,
  type InsertAiPrompt,
  type WeeklyInsight,
  type InsertWeeklyInsight,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Journal entry operations
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, entry: Partial<InsertJournalEntry>): Promise<JournalEntry>;
  deleteJournalEntry(id: string): Promise<void>;
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
  getUserJournalEntries(userId: string, limit?: number): Promise<JournalEntry[]>;
  getJournalEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<JournalEntry[]>;
  
  // AI prompt operations
  createAiPrompt(prompt: InsertAiPrompt): Promise<AiPrompt>;
  getUnusedPromptForUser(userId: string): Promise<AiPrompt | undefined>;
  markPromptAsUsed(promptId: string): Promise<void>;
  
  // Weekly insights operations
  createWeeklyInsight(insight: InsertWeeklyInsight): Promise<WeeklyInsight>;
  getWeeklyInsight(userId: string, weekStart: Date): Promise<WeeklyInsight | undefined>;
  getUserWeeklyInsights(userId: string, limit?: number): Promise<WeeklyInsight[]>;
  deleteWeeklyInsight(insightId: string): Promise<void>;
  
  // Analytics operations
  updateUserStats(userId: string): Promise<void>;
  getUserMoodData(userId: string, days: number): Promise<Array<{ date: string; sentiment: number; mood: string }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Journal entry operations
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [journalEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    
    // Update user stats
    await this.updateUserStats(entry.userId);
    
    return journalEntry;
  }

  async updateJournalEntry(id: string, entry: Partial<InsertJournalEntry>): Promise<JournalEntry> {
    const [journalEntry] = await db
      .update(journalEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
    
    if (journalEntry) {
      await this.updateUserStats(journalEntry.userId);
    }
    
    return journalEntry;
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
  }

  async getJournalEntry(id: string): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    return entry;
  }

  async getUserJournalEntries(userId: string, limit = 10): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          eq(journalEntries.isCompleted, true)
        )
      )
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit);
  }

  async getJournalEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          gte(journalEntries.createdAt, startDate),
          lte(journalEntries.createdAt, endDate)
        )
      )
      .orderBy(desc(journalEntries.createdAt));
  }

  // AI prompt operations
  async createAiPrompt(prompt: InsertAiPrompt): Promise<AiPrompt> {
    const [aiPrompt] = await db
      .insert(aiPrompts)
      .values(prompt)
      .returning();
    return aiPrompt;
  }

  async getUnusedPromptForUser(userId: string): Promise<AiPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(aiPrompts)
      .where(
        and(
          eq(aiPrompts.userId, userId),
          eq(aiPrompts.isUsed, false)
        )
      )
      .orderBy(desc(aiPrompts.createdAt))
      .limit(1);
    return prompt;
  }

  async markPromptAsUsed(promptId: string): Promise<void> {
    await db
      .update(aiPrompts)
      .set({ isUsed: true })
      .where(eq(aiPrompts.id, promptId));
  }

  // Weekly insights operations
  async createWeeklyInsight(insight: InsertWeeklyInsight): Promise<WeeklyInsight> {
    const [weeklyInsight] = await db
      .insert(weeklyInsights)
      .values(insight)
      .returning();
    return weeklyInsight;
  }

  async getWeeklyInsight(userId: string, weekStart: Date): Promise<WeeklyInsight | undefined> {
    const [insight] = await db
      .select()
      .from(weeklyInsights)
      .where(
        and(
          eq(weeklyInsights.userId, userId),
          eq(weeklyInsights.weekStart, weekStart)
        )
      );
    return insight;
  }

  async getUserWeeklyInsights(userId: string, limit = 5): Promise<WeeklyInsight[]> {
    return await db
      .select()
      .from(weeklyInsights)
      .where(eq(weeklyInsights.userId, userId))
      .orderBy(desc(weeklyInsights.weekStart))
      .limit(limit);
  }

  async deleteWeeklyInsight(insightId: string): Promise<void> {
    await db
      .delete(weeklyInsights)
      .where(eq(weeklyInsights.id, insightId));
  }

  // Analytics operations
  async updateUserStats(userId: string): Promise<void> {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId));

    const totalEntries = entries.filter(entry => entry.isCompleted).length;
    const wordsWritten = entries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
    
    // Calculate streak
    const completedEntries = entries
      .filter(entry => entry.isCompleted)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let streakCount = 0;
    let lastDate: Date | null = null;

    for (const entry of completedEntries) {
      const entryDate = new Date(entry.createdAt!);
      entryDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        // First entry
        streakCount = 1;
        if (this.isToday(entryDate) || this.isYesterday(entryDate)) {
          currentStreak = 1;
        }
      } else {
        const daysDiff = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          streakCount++;
          if (currentStreak === 0 && (this.isToday(entryDate) || this.isYesterday(entryDate))) {
            currentStreak = streakCount;
          }
        } else {
          // Streak broken
          longestStreak = Math.max(longestStreak, streakCount);
          streakCount = 1;
        }
      }
      
      lastDate = entryDate;
    }

    longestStreak = Math.max(longestStreak, streakCount);

    await db
      .update(users)
      .set({
        totalEntries,
        wordsWritten,
        currentStreak,
        longestStreak,
        lastEntryDate: completedEntries[0]?.createdAt || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserMoodData(userId: string, days: number): Promise<Array<{ date: string; sentiment: number; mood: string }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await db
      .select({
        createdAt: journalEntries.createdAt,
        sentimentScore: journalEntries.sentimentScore,
        mood: journalEntries.mood,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          gte(journalEntries.createdAt, startDate),
          eq(journalEntries.isCompleted, true)
        )
      )
      .orderBy(journalEntries.createdAt);

    return entries.map(entry => ({
      date: entry.createdAt!.toISOString().split('T')[0],
      sentiment: parseFloat(entry.sentimentScore || '0'),
      mood: entry.mood || 'neutral',
    }));
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  }

  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return date.getTime() === yesterday.getTime();
  }
}

export const storage = new DatabaseStorage();
