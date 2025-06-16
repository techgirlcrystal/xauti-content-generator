import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").default("password123"),
  contentStreak: integer("content_streak").default(0),
  lastContentDate: date("last_content_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  subscriptionTier: text("subscription_tier").default("free"), // free, basic, pro, unlimited
  generationsUsed: integer("generations_used").default(0),
  generationsLimit: integer("generations_limit").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, canceled, past_due
  subscriptionEndDate: timestamp("subscription_end_date"),
  tags: text("tags").array().default([]) // For HighLevel integration
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
  brandTone: text("brand_tone"), // User's brand tone/voice
  callToAction: text("call_to_action"), // Custom call-to-action
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const generationPurchases = pgTable("generation_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  generationsAdded: integer("generations_added").notNull(),
  amountPaid: integer("amount_paid").notNull(), // in cents
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentStatus: text("payment_status").default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  contentRequests: many(contentRequests),
  generationPurchases: many(generationPurchases),
}));

export const contentRequestsRelations = relations(contentRequests, ({ one }) => ({
  user: one(users, {
    fields: [contentRequests.userId],
    references: [users.id],
  }),
}));

export const generationPurchasesRelations = relations(generationPurchases, ({ one }) => ({
  user: one(users, {
    fields: [generationPurchases.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  contentStreak: true,
  lastContentDate: true,
  createdAt: true,
  generationsUsed: true,
  subscriptionEndDate: true,
});

export const insertContentRequestSchema = createInsertSchema(contentRequests).pick({
  userId: true,
  industry: true,
  selectedTopics: true,
  status: true,
});

export const insertGenerationPurchaseSchema = createInsertSchema(generationPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContentRequest = z.infer<typeof insertContentRequestSchema>;
export type ContentRequest = typeof contentRequests.$inferSelect;
export type InsertGenerationPurchase = z.infer<typeof insertGenerationPurchaseSchema>;
export type GenerationPurchase = typeof generationPurchases.$inferSelect;
