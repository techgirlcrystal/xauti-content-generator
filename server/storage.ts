import { users, contentRequests, generationPurchases, tenants, type User, type InsertUser, type ContentRequest, type InsertContentRequest, type GenerationPurchase, type InsertGenerationPurchase, type Tenant, type InsertTenant } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Tenant management
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant>;
  
  // User management (tenant-aware)
  getUser(id: number, tenantId?: number): Promise<User | undefined>;
  getUserByEmail(email: string, tenantId?: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStreak(id: number, streak: number, lastDate: string): Promise<User>;
  updateUserSubscription(id: number, subscription: Partial<User>): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<User>;
  incrementUserGenerations(id: number): Promise<User>;
  addGenerationsToUser(id: number, generations: number): Promise<User>;
  checkUserCanGenerate(id: number): Promise<boolean>;
  
  // Content requests (tenant-aware)
  createContentRequest(request: InsertContentRequest): Promise<ContentRequest>;
  getContentRequest(id: number, tenantId?: number): Promise<ContentRequest | undefined>;
  updateContentRequest(id: number, updates: Partial<ContentRequest>): Promise<ContentRequest>;
  getContentRequestsByUserId(userId: number, tenantId?: number): Promise<ContentRequest[]>;
  
  // Generation purchases (tenant-aware)
  createGenerationPurchase(purchase: InsertGenerationPurchase): Promise<GenerationPurchase>;
  getGenerationPurchasesByUserId(userId: number, tenantId?: number): Promise<GenerationPurchase[]>;
}

export class DatabaseStorage implements IStorage {
  // Tenant management methods
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db
      .insert(tenants)
      .values(tenant)
      .returning();
    return newTenant;
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.domain, domain));
    return tenant || undefined;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
    return tenant || undefined;
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  // User management methods (tenant-aware)
  async getUser(id: number, tenantId?: number): Promise<User | undefined> {
    let query = db.select().from(users).where(eq(users.id, id));
    
    if (tenantId) {
      query = db.select().from(users).where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
    }
    
    const [user] = await query;
    return user || undefined;
  }

  async getUserByEmail(email: string, tenantId?: number): Promise<User | undefined> {
    let query = db.select().from(users).where(eq(users.email, email));
    
    if (tenantId) {
      query = db.select().from(users).where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
    }
    
    const [user] = await query;
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

  async getContentRequest(id: number, tenantId?: number): Promise<ContentRequest | undefined> {
    let query = db.select().from(contentRequests).where(eq(contentRequests.id, id));
    
    if (tenantId) {
      query = db.select().from(contentRequests).where(and(eq(contentRequests.id, id), eq(contentRequests.tenantId, tenantId)));
    }
    
    const [request] = await query;
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

  async getContentRequestsByUserId(userId: number, tenantId?: number): Promise<ContentRequest[]> {
    let query = db.select().from(contentRequests).where(eq(contentRequests.userId, userId));
    
    if (tenantId) {
      query = db.select().from(contentRequests).where(and(eq(contentRequests.userId, userId), eq(contentRequests.tenantId, tenantId)));
    }
    
    return await query;
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

  async getGenerationPurchasesByUserId(userId: number, tenantId?: number): Promise<GenerationPurchase[]> {
    let query = db.select().from(generationPurchases).where(eq(generationPurchases.userId, userId));
    
    if (tenantId) {
      query = db.select().from(generationPurchases).where(and(eq(generationPurchases.userId, userId), eq(generationPurchases.tenantId, tenantId)));
    }
    
    return await query.orderBy(desc(generationPurchases.createdAt));
  }
}

export const storage = new DatabaseStorage();
