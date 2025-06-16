import { users, contentRequests, generationPurchases, type User, type InsertUser, type ContentRequest, type InsertContentRequest, type GenerationPurchase, type InsertGenerationPurchase } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStreak(id: number, streak: number, lastDate: string): Promise<User>;
  updateUserSubscription(id: number, subscription: Partial<User>): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<User>;
  incrementUserGenerations(id: number): Promise<User>;
  addGenerationsToUser(id: number, generations: number): Promise<User>;
  checkUserCanGenerate(id: number): Promise<boolean>;
  createContentRequest(request: InsertContentRequest): Promise<ContentRequest>;
  getContentRequest(id: number): Promise<ContentRequest | undefined>;
  updateContentRequest(id: number, updates: Partial<ContentRequest>): Promise<ContentRequest>;
  getContentRequestsByUserId(userId: number): Promise<ContentRequest[]>;
  createGenerationPurchase(purchase: InsertGenerationPurchase): Promise<GenerationPurchase>;
  getGenerationPurchasesByUserId(userId: number): Promise<GenerationPurchase[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStreak(id: number, streak: number, lastDate: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        contentStreak: streak,
        lastContentDate: lastDate
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createContentRequest(request: InsertContentRequest): Promise<ContentRequest> {
    const [contentRequest] = await db
      .insert(contentRequests)
      .values(request)
      .returning();
    return contentRequest;
  }

  async getContentRequest(id: number): Promise<ContentRequest | undefined> {
    const [request] = await db.select().from(contentRequests).where(eq(contentRequests.id, id));
    return request || undefined;
  }

  async updateContentRequest(id: number, updates: Partial<ContentRequest>): Promise<ContentRequest> {
    const [request] = await db
      .update(contentRequests)
      .set(updates)
      .where(eq(contentRequests.id, id))
      .returning();
    return request;
  }

  async getContentRequestsByUserId(userId: number): Promise<ContentRequest[]> {
    return await db.select().from(contentRequests).where(eq(contentRequests.userId, userId));
  }

  async updateUserSubscription(id: number, subscription: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(subscription)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async incrementUserGenerations(id: number): Promise<User> {
    const currentUser = await this.getUser(id);
    if (!currentUser) throw new Error('User not found');
    
    const [user] = await db
      .update(users)
      .set({ generationsUsed: (currentUser.generationsUsed || 0) + 1 })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async addGenerationsToUser(id: number, generations: number): Promise<User> {
    const currentUser = await this.getUser(id);
    if (!currentUser) throw new Error('User not found');
    
    const [user] = await db
      .update(users)
      .set({ 
        generationsLimit: (currentUser.generationsLimit || 0) + generations
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async checkUserCanGenerate(id: number): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return false;

    // Set tier limits based on subscription
    const getTierLimits = (tier: string) => {
      switch (tier) {
        case 'basic': return 2;
        case 'pro': return 10;
        case 'unlimited': return Infinity;
        default: return 0; // free tier
      }
    };

    const tierLimit = getTierLimits(user.subscriptionTier || 'free');
    const totalLimit = tierLimit === Infinity ? Infinity : tierLimit + (user.generationsLimit || 0);
    
    return (user.generationsUsed || 0) < totalLimit;
  }

  async createGenerationPurchase(purchase: InsertGenerationPurchase): Promise<GenerationPurchase> {
    const [generationPurchase] = await db
      .insert(generationPurchases)
      .values(purchase)
      .returning();
    return generationPurchase;
  }

  async getGenerationPurchasesByUserId(userId: number): Promise<GenerationPurchase[]> {
    return await db.select().from(generationPurchases).where(eq(generationPurchases.userId, userId)).orderBy(desc(generationPurchases.createdAt));
  }
}

export const storage = new DatabaseStorage();
