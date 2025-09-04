import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalEntries: integer("total_entries").default(0),
  wordsWritten: integer("words_written").default(0),
  lastEntryDate: timestamp("last_entry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title"),
  content: text("content").notNull(),
  wordCount: integer("word_count").default(0),
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  sentimentLabel: varchar("sentiment_label"),
  aiPrompt: text("ai_prompt"),
  mood: varchar("mood"),
  themes: text("themes").array(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiPrompts = pgTable("ai_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  promptText: text("prompt_text").notNull(),
  context: text("context"),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyInsights = pgTable("weekly_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  summary: text("summary"),
  keyThemes: text("key_themes").array(),
  moodTrend: varchar("mood_trend"),
  averageSentiment: decimal("average_sentiment", { precision: 3, scale: 2 }),
  entryCount: integer("entry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  journalEntries: many(journalEntries),
  aiPrompts: many(aiPrompts),
  weeklyInsights: many(weeklyInsights),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
}));

export const aiPromptsRelations = relations(aiPrompts, ({ one }) => ({
  user: one(users, {
    fields: [aiPrompts.userId],
    references: [users.id],
  }),
}));

export const weeklyInsightsRelations = relations(weeklyInsights, ({ one }) => ({
  user: one(users, {
    fields: [weeklyInsights.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiPromptSchema = createInsertSchema(aiPrompts).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyInsightSchema = createInsertSchema(weeklyInsights).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type InsertAiPrompt = z.infer<typeof insertAiPromptSchema>;
export type WeeklyInsight = typeof weeklyInsights.$inferSelect;
export type InsertWeeklyInsight = z.infer<typeof insertWeeklyInsightSchema>;
