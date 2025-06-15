import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  contentStreak: integer("content_streak").default(0),
  lastContentDate: date("last_content_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentRequests = pgTable("content_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  industry: text("industry").notNull(),
  selectedTopics: jsonb("selected_topics").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  csvFilename: text("csv_filename"),
  csvBase64: text("csv_base64"),
  scriptContent: text("script_content"), // 30-second script for text-to-speech
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  contentRequests: many(contentRequests),
}));

export const contentRequestsRelations = relations(contentRequests, ({ one }) => ({
  user: one(users, {
    fields: [contentRequests.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  contentStreak: true,
  lastContentDate: true,
  createdAt: true,
});

export const insertContentRequestSchema = createInsertSchema(contentRequests).pick({
  userId: true,
  industry: true,
  selectedTopics: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContentRequest = z.infer<typeof insertContentRequestSchema>;
export type ContentRequest = typeof contentRequests.$inferSelect;
