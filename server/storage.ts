import { users, contentRequests, type User, type InsertUser, type ContentRequest, type InsertContentRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContentRequest(request: InsertContentRequest): Promise<ContentRequest>;
  getContentRequest(id: number): Promise<ContentRequest | undefined>;
  updateContentRequest(id: number, updates: Partial<ContentRequest>): Promise<ContentRequest>;
  getContentRequestsByUserId(userId: number): Promise<ContentRequest[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
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
}

export const storage = new DatabaseStorage();
