import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import Stripe from "stripe";
import { insertTenantSchema } from "@shared/schema";
import { promises as dns } from "dns";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Stripe client (optional - for payment processing)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Tenant middleware to detect and set tenant context
interface TenantRequest extends Request {
  tenant?: any;
  tenantStripe?: Stripe;
  tenantOpenAI?: OpenAI;
}

const tenantMiddleware = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const host = req.get('host') || '';
    console.log('Tenant middleware - Host:', host, 'Path:', req.path);
    
    // Check for tenant query parameter (for testing from admin panel)
    const tenantParam = req.query.tenant as string;
    if (tenantParam) {
      console.log('Using tenant from query parameter:', tenantParam);
      const tenant = await storage.getTenantBySubdomain(tenantParam);
      if (tenant && tenant.isActive) {
        console.log('Found tenant via query param:', tenant.name);
        req.tenant = tenant;
        
        // Initialize tenant-specific API clients
        if (tenant.stripeSecretKey) {
          req.tenantStripe = new Stripe(tenant.stripeSecretKey);
        }
        
        if (tenant.openaiApiKey) {
          req.tenantOpenAI = new OpenAI({
            apiKey: tenant.openaiApiKey,
          });
        }
      }
      return next();
    }
    
    // Always skip tenant detection for development environments and admin routes
    if (req.path.startsWith('/api/admin') || 
        host.includes('localhost') || 
        host.includes('replit.dev') ||
        host.includes('127.0.0.1') ||
        !host.includes('.')) {
      console.log('Skipping tenant detection for:', host);
      return next();
    }
    
    // First check if this is a custom domain
    let tenant = await storage.getTenantByDomain(host);
    
    if (!tenant) {
      // If not a custom domain, check if it's a subdomain
      const subdomain = host.split('.')[0];
      console.log('Checking subdomain:', subdomain);
      
      // Only look up tenant for production subdomains
      if (subdomain && host.includes('.') && !host.includes('localhost') && !host.includes('replit')) {
        tenant = await storage.getTenantBySubdomain(subdomain);
      }
    }
    
    if (tenant && tenant.isActive) {
      console.log('Found tenant:', tenant.name);
      req.tenant = tenant;
      
      // Initialize tenant-specific API clients
      if (tenant.stripeSecretKey) {
        req.tenantStripe = new Stripe(tenant.stripeSecretKey);
      }
      
      if (tenant.openaiApiKey) {
        req.tenantOpenAI = new OpenAI({
          apiKey: tenant.openaiApiKey,
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    next();
  }
};

// Default brand tone (yours)
const DEFAULT_BRAND_TONE = `Warm, encouraging, and empowering. I speak with authentic care and genuine heart for helping others succeed. My voice is supportive yet confident, using "you" to connect directly with my audience. I balance inspiration with practical action steps, always believing in people's potential while providing clear guidance. I use inclusive language that makes everyone feel welcomed and valued.`;

// Analyze brand tone from user examples
async function analyzeBrandTone(examples: string): Promise<string> {
  try {
    const prompt = `Analyze the brand tone and voice from these writing examples. Describe the tone, style, personality, and communication approach in 2-3 sentences that can be used to replicate this voice:

Examples:
${examples}

Provide a clear description of the brand tone that captures:
- Communication style (formal/casual, warm/professional, etc.)
- Personality traits
- How they connect with their audience
- Key characteristics of their voice`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || DEFAULT_BRAND_TONE;
  } catch (error) {
    console.error("Error analyzing brand tone:", error);
    return DEFAULT_BRAND_TONE;
  }
}

// Generate a 30-second script for text-to-speech
async function generateScript(industry: string, topics: string[]): Promise<string> {
  try {
    const topicsText = topics.join(", ");
    
    const prompt = `Create a compelling 30-second script for content creators in the "${industry}" industry. The script should:
    
    - Be exactly 30 seconds when read aloud (about 75-80 words)
    - Sound natural and engaging for text-to-speech
    - Reference these key topics: ${topicsText}
    - Include a clear call-to-action
    - Be inspiring and actionable
    - Use simple, conversational language
    
    Return only the script text, no additional formatting or explanations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "Your content journey starts today. Take action, stay consistent, and watch your audience grow.";
  } catch (error) {
    console.error("Error generating script:", error);
    return `Welcome to your 30-day ${industry} content journey! Today marks the beginning of consistent, engaging content that will transform your audience. Every post, every story, every connection matters. Start today, stay committed, and watch your community flourish. Your voice matters - let it be heard!`;
  }
}

// Generate a daily script for text-to-speech with custom tone and CTA
async function generateDailyScript(industry: string, topics: string[], day: number, brandTone: string = DEFAULT_BRAND_TONE, callToAction: string = ""): Promise<string> {
  try {
    // Create varied prompts based on the day to ensure unique content
    const topicIndex = (day - 1) % topics.length;
    const currentTopic = topics[topicIndex] || topics[0];
    
    let prompt = "";
    
    // Create different types of content based on day patterns
    if (day % 7 === 1) { // Mondays - Motivation
      prompt = `Create a motivational 30-second script for Day ${day} about ${industry}. Focus on ${currentTopic}. Start the week strong with inspiration and energy. Be uplifting and action-oriented.`;
    } else if (day % 7 === 2) { // Tuesdays - Tips
      prompt = `Create a practical tip script for Day ${day} about ${industry}. Focus on ${currentTopic}. Share actionable advice that listeners can implement today. Be specific and helpful.`;
    } else if (day % 7 === 3) { // Wednesdays - Stories
      prompt = `Create a story-based script for Day ${day} about ${industry}. Focus on ${currentTopic}. Share a relatable scenario or example. Make it personal and engaging.`;
    } else if (day % 7 === 4) { // Thursdays - Insights
      prompt = `Create an insightful script for Day ${day} about ${industry}. Focus on ${currentTopic}. Share a deeper perspective or revelation. Be thoughtful and meaningful.`;
    } else if (day % 7 === 5) { // Fridays - Encouragement
      prompt = `Create an encouraging script for Day ${day} about ${industry}. Focus on ${currentTopic}. Help listeners feel confident and supported. End the week on a positive note.`;
    } else if (day % 7 === 6) { // Saturdays - Reflection
      prompt = `Create a reflective script for Day ${day} about ${industry}. Focus on ${currentTopic}. Encourage thoughtful consideration and self-assessment. Be gentle and introspective.`;
    } else { // Sundays - Vision
      prompt = `Create a visionary script for Day ${day} about ${industry}. Focus on ${currentTopic}. Paint a picture of the future and possibilities. Be hopeful and forward-looking.`;
    }
    
    prompt += `

    BRAND TONE: Write in this specific voice and style: ${brandTone}
    
    ${callToAction ? `CALL TO ACTION: End with this specific call to action: ${callToAction}` : ''}
    
    REQUIREMENTS:
    - About 75-80 words for 30-second text-to-speech
    - Create completely unique content (no repetitive phrases or openings)
    - Make it sound natural when read by Eleven Labs AI voice
    - Match the brand tone exactly
    - Vary sentence structure and vocabulary
    - Return only the script text, no formatting or day numbers`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 130,
      temperature: 0.9,
    });

    return response.choices[0]?.message?.content?.trim() || `Today's focus in ${industry}: Build meaningful connections with your audience. Share your authentic story and valuable insights. Consistency beats perfection. Keep moving forward!`;
  } catch (error) {
    console.error(`Error generating daily script for day ${day}:`, error);
    return `Day ${day} in your ${industry} journey: Share your expertise with confidence. Every piece of content you create adds value to someone's life. Stay consistent and keep growing!`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply tenant middleware to all routes
  app.use(tenantMiddleware);
  
  // Admin routes for managing white label clients
  app.get("/api/admin/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.post("/api/admin/tenants", async (req, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create tenant" });
    }
  });

  app.delete("/api/admin/tenants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTenant(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to delete tenant" });
    }
  });

  // DNS checker endpoint
  app.post("/api/admin/check-dns", async (req, res) => {
    try {
      const { domain, expectedTarget } = req.body;
      
      if (!domain || !expectedTarget) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Domain and expectedTarget are required"
        });
      }
      

      
      try {
        // Check CNAME records
        const records = await dns.resolveCname(domain);
        const isCorrect = records.some((record: string) => record.includes(expectedTarget.replace('https://', '').replace('http://', '')));
        
        return res.json({
          domain,
          status: isCorrect ? 'configured' : 'misconfigured',
          records,
          expectedTarget,
          message: isCorrect 
            ? 'DNS correctly configured'
            : `CNAME should point to ${expectedTarget}`
        });
      } catch (dnsError: any) {
        // Try A record as fallback
        try {
          const aRecords = await dns.resolve4(domain);
          return res.json({
            domain,
            status: 'different_config',
            message: 'Domain resolves but not using CNAME record',
            expectedTarget,
            records: aRecords
          });
        } catch {
          return res.json({
            domain,
            status: 'not_configured',
            message: 'Domain does not resolve - DNS not configured yet',
            expectedTarget
          });
        }
      }
    } catch (error: any) {
      console.error('DNS check error:', error);
      return res.status(500).json({ 
        error: "DNS check failed", 
        message: error.message || "Unknown error occurred"
      });
    }
  });

  // Basic test endpoint
  app.post("/api/basic-test", (req, res) => {
    res.json({ success: true, message: "Basic POST endpoint working", body: req.body });
  });

  // HighLevel webhook for subscription processing
  app.all("/api/webhook-minimal", async (req, res) => {
    try {
      console.log('=== HIGHLEVEL WEBHOOK DATA ===');
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Query params:', req.query);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Raw body type:', typeof req.body);
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('Body keys:', Object.keys(req.body || {}));
      console.log('Body length:', JSON.stringify(req.body).length);
      
      // Check for common HighLevel webhook structures
      if (req.body && typeof req.body === 'object') {
        console.log('--- DETAILED BODY ANALYSIS ---');
        for (const [key, value] of Object.entries(req.body)) {
          console.log(`${key}: ${typeof value} = ${JSON.stringify(value)}`);
        }
        console.log('--- END ANALYSIS ---');
      }
      console.log('==============================');
      
      // Extract data from HighLevel webhook
      const body = req.body || {};
      
      // Try multiple field variations for email
      const email = body.email || 
                    body['contact.email'] || 
                    body.contactEmail ||
                    body.contact?.email ||
                    body.customer?.email;
                    
      // Try multiple field variations for name
      const firstName = body.firstName || 
                        body['contact.firstName'] || 
                        body.contact?.firstName ||
                        body.customer?.firstName;
                        
      const lastName = body.lastName || 
                       body['contact.lastName'] || 
                       body.contact?.lastName ||
                       body.customer?.lastName;
                       
      // Try multiple field variations for tags
      const tags = body.tags || 
                   body['contact.tags'] || 
                   body.contact?.tags ||
                   body.customer?.tags ||
                   [];

      // Try to extract subscription/renewal date from various fields
      const subscriptionEndDate = body.subscriptionEndDate ||
                                 body['contact.subscriptionEndDate'] ||
                                 body.contact?.subscriptionEndDate ||
                                 body.renewalDate ||
                                 body['contact.renewalDate'] ||
                                 body.contact?.renewalDate ||
                                 body.planEndDate ||
                                 body['contact.planEndDate'] ||
                                 body.contact?.planEndDate;
      
      console.log('Extracted data:');
      console.log('- Email:', email);
      console.log('- First Name:', firstName);
      console.log('- Last Name:', lastName);
      console.log('- Tags:', tags);
      console.log('- Subscription End Date:', subscriptionEndDate);
      
      // Handle case where email might be missing but we have trigger context
      if (email) {
        // Get or create user
        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.createUser({
            name: `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown User',
            email: email,
            password: 'password123' // Default password for webhook-created users
          });
          console.log('Created new user:', user.email);
        }
        
        // Map plan tags to subscription tiers
        const planMapping = {
          "$3 No Code Tool Automation and Content Creator Access": "basic",
          "$3 No Code Tool Automation": "basic",
          "$3 Content Creator Access": "basic",
          "$3": "basic",
          "XAUTI 27 CONTENT TOOL": "pro", 
          "XAUTI CRM BUSINESS IN A BOX": "white_label",
          "business in a box": "white_label",
          "Business in a Box": "white_label",
          "BUSINESS IN A BOX": "white_label",
          "xauti crm 99 plan": "unlimited",
          "XAUTI CRM 99 PLAN": "unlimited",
          "Xauti CRM 99 Plan": "unlimited",
          "XAUTI CRM UNOCK": "unlimited",
          "$99 Plan Purchased": "unlimited",
          "$99": "unlimited",
          "99 Plan": "unlimited",
          "Unlimited Plan": "unlimited"
        };
        
        let subscriptionTier = "free";
        let generationsLimit = 0;
        
        // Check tags for subscription plans - prioritize highest tier found
        let foundTier = "free";
        let hasWhiteLabelAccess = false;
        
        if (Array.isArray(tags)) {
          for (const tag of tags) {
            const tagLower = tag.toLowerCase();
            console.log(`Checking tag: "${tag}" (lowercase: "${tagLower}")`);
            
            // Check for white label access (business in a box)
            if (tagLower.includes('business in a box') || 
                tagLower.includes('business in the box')) {
              hasWhiteLabelAccess = true;
              console.log(`Found WHITE LABEL access tag: ${tag}`);
            }
            
            // Check for unlimited tier (xauti crm 99 plan)
            if (tagLower.includes('xauti crm 99') || 
                tagLower.includes('xauti crm 99 plan') ||
                tagLower.includes('$99') || 
                tagLower.includes('99 plan') || 
                tagLower.includes('unlimited')) {
              foundTier = "unlimited";
              console.log(`Found UNLIMITED plan tag: ${tag} -> ${foundTier}`);
            }
            // Check for pro tier
            else if (tagLower.includes('27') || 
                     tagLower.includes('xauti 27') ||
                     tagLower.includes('content tool')) {
              if (foundTier === "free" || foundTier === "basic") foundTier = "pro";
              console.log(`Found PRO plan tag: ${tag} -> ${foundTier}`);
            }
            // Check for basic tier
            else if (tagLower.includes('$3') || 
                     tagLower.includes('3 dollar') || 
                     tagLower.includes('automation')) {
              if (foundTier === "free") foundTier = "basic";
              console.log(`Found BASIC plan tag: ${tag} -> ${foundTier}`);
            }
            
            // Direct mapping check
            if (planMapping[tag as keyof typeof planMapping]) {
              const directTier = planMapping[tag as keyof typeof planMapping];
              if (directTier === "unlimited" || (directTier === "pro" && foundTier !== "unlimited") || (directTier === "basic" && foundTier === "free")) {
                foundTier = directTier;
                console.log(`Found EXACT plan tag: ${tag} -> ${foundTier}`);
              }
            }
          }
          subscriptionTier = foundTier;
          console.log(`Final subscription tier: ${subscriptionTier}`);
        }
        
        // Set generation limits
        const tierLimits = { free: 0, basic: 2, pro: 10, unlimited: 999999 };
        generationsLimit = tierLimits[subscriptionTier as keyof typeof tierLimits] || 0;
        
        // Calculate subscription end date - ensure all paid tiers get renewal dates
        let endDate = null;
        if (subscriptionTier !== "free") {
          if (subscriptionEndDate) {
            // Parse the provided renewal date
            endDate = new Date(subscriptionEndDate);
            // If invalid date, fall back to 30 days from now
            if (isNaN(endDate.getTime())) {
              endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
          } else {
            // Always set renewal date for paid subscriptions - default to 30 days from now
            endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
        }
        
        // Update user subscription
        const updatedUser = await storage.updateUserSubscription(user.id, {
          subscriptionTier,
          subscriptionStatus: subscriptionTier === "free" ? "inactive" : "active",
          subscriptionEndDate: endDate,
          tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
          generationsLimit: generationsLimit
        });
        
        console.log(`Updated user ${email}:`);
        console.log(`- Subscription tier: ${subscriptionTier} (${generationsLimit} generations)`);
        console.log(`- White label access: ${hasWhiteLabelAccess ? 'YES' : 'NO'}`);
        console.log(`- Tags processed: ${Array.isArray(tags) ? tags.join(', ') : 'none'}`);
        
        res.json({
          success: true,
          message: `User updated - Tier: ${subscriptionTier}, White Label: ${hasWhiteLabelAccess}`,
          user: {
            email: updatedUser.email,
            tier: updatedUser.subscriptionTier,
            limit: updatedUser.generationsLimit,
            whiteLabelAccess: hasWhiteLabelAccess,
            tags: Array.isArray(tags) ? tags : []
          }
        });
      } else {
        // No email found - check if this is a trigger-based webhook
        console.log('No email found in webhook data');
        console.log('Checking for trigger-based data...');
        
        // Check if we have trigger information for manual processing
        const triggerName = body.triggerName || body.trigger || body.workflowName;
        if (triggerName) {
          console.log('Found trigger:', triggerName);
          
          // For $27 plan, try to get contact from ladyhale@csamasters.com since that's the test account
          if (triggerName.includes('27') || triggerName.toLowerCase().includes('dollar')) {
            console.log('Detected $27 plan trigger - updating test account');
            try {
              const testUser = await storage.getUserByEmail('ladyhale@csamasters.com');
              if (testUser) {
                await storage.updateUserSubscription(testUser.id, {
                  subscriptionTier: 'pro',
                  subscriptionStatus: 'active',
                  subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  tags: ['XAUTI 27 CONTENT TOOL'],
                  generationsLimit: 10
                });
                console.log('Updated test user to Pro tier');
              }
            } catch (error) {
              console.error('Error updating test user:', error);
            }
          }
        }
        
        res.json({
          success: true,
          message: "Webhook received but no contact email found",
          receivedData: body,
          triggerDetected: triggerName || 'none'
        });
      }
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to process webhook",
        message: error.message 
      });
    }
  });

  // Simple GET test for HighLevel
  app.get("/api/test-get", (req, res) => {
    console.log('GET /api/test-get called');
    console.log('Query params:', req.query);
    res.status(200).send("GET endpoint working - HighLevel can reach this");
  });

  // Super simple test endpoint for immediate verification
  app.get("/api/simple-test", (req, res) => {
    console.log('Simple test endpoint hit');
    res.status(200).json({ status: "working", timestamp: new Date().toISOString() });
  });


  
  // Authentication routes with password verification and real-time access control
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user with no access until webhook provides tags
        user = await storage.createUser({ 
          name, 
          email,
          password,
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive',
          generationsLimit: 0,
          tags: []
        });
      } else {
        // Verify password for existing user
        if (user.password !== password) {
          return res.status(401).json({ 
            error: "Invalid password. Please check your credentials and try again.",
            needsAuth: true
          });
        }
      }

      // CRITICAL: Real-time tag verification and automatic tier assignment
      let subscriptionTier = "free";
      let generationsLimit = 0;
      let hasValidTags = false;

      if (user.tags && user.tags.length > 0) {
        // Check each tag and determine the highest subscription tier
        for (const tag of user.tags) {
          const tagLower = tag.toLowerCase();
          
          // Check for unlimited tier (highest priority)
          if (tagLower.includes('xauti crm business') || 
              tagLower.includes('business in a box') || 
              tagLower.includes('$99') || 
              tagLower.includes('unlimited')) {
            subscriptionTier = "unlimited";
            generationsLimit = 999999;
            hasValidTags = true;
            break; // Stop at highest tier
          }
          // Check for pro tier
          else if (tagLower.includes('27') || 
                   tagLower.includes('content tool') ||
                   tagLower.includes('xauti 27') ||
                   tagLower.includes('27 content') ||
                   tagLower.includes('$27')) {
            if (subscriptionTier === "free") {
              subscriptionTier = "pro";
              generationsLimit = 10;
              hasValidTags = true;
            }
          }
          // Check for basic tier
          else if (tagLower.includes('$3') || 
                   tagLower.includes('automation') ||
                   tagLower.includes('3 dollar')) {
            if (subscriptionTier === "free") {
              subscriptionTier = "basic";
              generationsLimit = 2;
              hasValidTags = true;
            }
          }
        }
      }

      // If no valid subscription tags found, revoke access
      if (!hasValidTags) {
        console.log(`Access denied for ${email} - no valid subscription tags found. Current tags:`, user.tags);
        
        // Immediately downgrade to free tier
        await storage.updateUserSubscription(user.id, {
          subscriptionTier: "free",
          subscriptionStatus: "inactive",
          generationsLimit: 0
        });
        
        return res.status(403).json({ 
          error: "Subscription invalid. Please sign up for a new subscription.",
          needsUpgrade: true,
          upgradeUrl: "https://xautimarketingai.com/"
        });
      }

      // Auto-update subscription tier if tags changed
      if (user.subscriptionTier !== subscriptionTier || user.generationsLimit !== generationsLimit) {
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        user = await storage.updateUserSubscription(user.id, {
          subscriptionTier,
          subscriptionStatus: "active",
          subscriptionEndDate: endDate,
          generationsLimit
        });
        console.log(`Auto-updated ${email} from database tier to ${subscriptionTier} based on current tags`);
      }

      // Calculate streak
      const today = new Date().toISOString().split('T')[0];
      const lastDate = user.lastContentDate;
      let newStreak = user.contentStreak || 0;

      if (lastDate) {
        const lastDateTime = new Date(lastDate);
        const todayTime = new Date(today);
        const diffDays = Math.floor((todayTime.getTime() - lastDateTime.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day - increment streak
          newStreak += 1;
        } else if (diffDays > 1) {
          // Gap in days - reset streak
          newStreak = 1;
        }
        // If diffDays === 0, same day - keep current streak
      } else {
        // First time - start streak
        newStreak = 1;
      }

      // Update user streak
      user = await storage.updateUserStreak(user.id, newStreak, today);

      // Check if user has valid subscription tags
      const hasValidSubscription = user.subscriptionTier && 
        user.subscriptionTier !== 'free' && 
        user.subscriptionStatus === 'active' && 
        user.tags && 
        user.tags.length > 0;

      if (!hasValidSubscription) {
        return res.status(403).json({
          success: false,
          error: "SUBSCRIPTION_REQUIRED",
          message: "Active subscription required. Please sign up for a plan to access the content generator.",
          requiresSignup: true
        });
      }

      // Ensure all subscription fields are present with defaults
      const userWithDefaults = {
        ...user,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        generationsLimit: user.generationsLimit || 0,
        generationsUsed: user.generationsUsed || 0,
        tags: user.tags || []
      };

      res.json({ 
        user: userWithDefaults,
        message: `Welcome back! You're on day ${newStreak} of your content streak.`
      });

    } catch (error: any) {
      console.log('Sign-in error:', error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  // Get current user info
  app.get("/api/auth/user/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error: any) {
      console.log('Get user error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Email, current password, and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }

      // Get user and verify current password
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.password !== currentPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update password
      await storage.updateUserPassword(user.id, newPassword);

      res.json({ 
        success: true,
        message: "Password updated successfully"
      });
    } catch (error: any) {
      console.log('Change password error:', error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // API route to handle content generation requests (30-day workflow only)
  app.post("/api/content-generate", async (req, res) => {
    let contentRequest: any = null;
    const webhookUrl = 'https://n8n.srv847085.hstgr.cloud/webhook/words-only';
    
    try {
      const { industry, selected_topics, userId } = req.body;
      
      if (!industry || !selected_topics || !userId) {
        return res.status(400).json({ error: "Industry, selected topics, and user ID are required" });
      }

      console.log(`Content generation requested for industry: ${industry}, user: ${userId}`);
      console.log(`Selected topics:`, selected_topics);
      
      // Check if user can generate content based on subscription tier
      const canGenerate = await storage.checkUserCanGenerate(userId);
      if (!canGenerate) {
        const user = await storage.getUser(userId);
        const tierInfo = {
          free: { limit: 0, name: "Free" },
          basic: { limit: 2, name: "$3 Basic" },
          pro: { limit: 10, name: "$27 Pro" },
          unlimited: { limit: "unlimited", name: "$99+ Unlimited" }
        } as const;
        
        const userTier = (user?.subscriptionTier || 'free') as keyof typeof tierInfo;
        const currentTier = tierInfo[userTier];
        
        return res.status(403).json({
          success: false,
          message: "Generation limit reached",
          error: "GENERATION_LIMIT_EXCEEDED",
          currentTier: user?.subscriptionTier || 'free',
          generationsUsed: user?.generationsUsed || 0,
          generationsLimit: user?.generationsLimit || 0,
          tierLimit: currentTier.limit,
          tierName: currentTier.name
        });
      }
      
      // Create request record in database
      contentRequest = await storage.createContentRequest({
        userId,
        industry,
        selectedTopics: selected_topics,
        status: "processing"
      });
      
      console.log(`Created content request with ID: ${contentRequest.id}`);

      // Start the n8n workflow without waiting for completion
      // Send response immediately and let workflow run in background
      const requestBody = {
        industry,
        selected_topics,
        requestId: contentRequest.id // Add request ID for tracking
      };
      console.log(`Sending to n8n:`, JSON.stringify(requestBody, null, 2));

      // Fire and forget approach - don't wait for completion
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }).then(async (n8nResponse) => {
        console.log('n8n response received with status:', n8nResponse.status);
        
        if (!n8nResponse.ok) {
          console.log(`n8n webhook failed with status: ${n8nResponse.status}`);
          await storage.updateContentRequest(contentRequest.id, {
            status: "failed",
            errorMessage: `n8n webhook failed with status: ${n8nResponse.status}`,
            completedAt: new Date()
          });
          return;
        }

        try {
          const responseText = await n8nResponse.text();
          console.log('n8n response text:', responseText);
          
          if (!responseText || responseText.trim() === '') {
            console.log('Empty response from n8n, treating as success');
            await storage.updateContentRequest(contentRequest.id, {
              status: "processing",
              completedAt: null
            });
            return;
          }
          
          const responseData = JSON.parse(responseText);
          console.log('n8n response data structure:', JSON.stringify(responseData, null, 2));
          
          // Handle CSV response and update database
          let csvBase64 = null;
          let filename = 'xauti-content.csv';
          
          if (responseData.csvBase64) {
            csvBase64 = responseData.csvBase64;
            filename = responseData.filename || filename;
          } else if (responseData.base64) {
            csvBase64 = responseData.base64;
            filename = responseData.name || filename;
          } else if (responseData.content) {
            csvBase64 = responseData.content;
            filename = responseData.filename || responseData.name || filename;
          } else if (responseData.kind === 'drive#file') {
            // Google Drive file - provide direct download instructions
            console.log('Detected Google Drive file response');
            
            const downloadUrl = responseData.webContentLink;
            filename = responseData.name || 'xauti-content.csv';
            
            // Create instructions for accessing the Google Drive file
            const instructionsContent = `YOUR 30 DAYS OF CONTENT IS READY!

File Details:
- Name: ${filename}
- Size: ${Math.round(responseData.size / 1024)} KB
- Created: ${new Date(responseData.createdTime).toLocaleDateString()}

TO DOWNLOAD YOUR CONTENT:
Click the download button below to open your CSV file directly from Google Drive.

Direct Download Link:
${downloadUrl}

WHAT'S INCLUDED:
✓ 30 days of personalized social media content
✓ Platform-specific formatting (Facebook, Instagram, LinkedIn, etc.)
✓ Hashtags and engagement prompts
✓ Posting schedule and timing recommendations

NEED HELP?
If the download doesn't work automatically:
1. Right-click the download button
2. Select "Open link in new tab"
3. Your CSV file will download immediately

File ID: ${responseData.id}
Last Modified: ${new Date(responseData.modifiedTime).toLocaleDateString()}`;
            
            csvBase64 = Buffer.from(instructionsContent, 'utf-8').toString('base64');
            
            // Store the download instructions and URL in the CSV content
            await storage.updateContentRequest(contentRequest.id, {
              status: "completed",
              csvFilename: filename,
              csvBase64: csvBase64,
              completedAt: new Date()
            });
            
            // Increment user's generation count for usage tracking
            await storage.incrementUserGenerations(contentRequest.userId);
            
            console.log(`Google Drive file stored for request ${contentRequest.id}: ${downloadUrl}`);
            return; // Exit early since we handled the storage update
          } else {
            // Fallback - create a simple CSV
            console.log('Unknown response format, creating fallback CSV');
            const csvContent = `Industry,Topics,Status,Timestamp\n"${industry}","${selected_topics.join('; ')}","Completed","${new Date().toISOString()}"`;
            csvBase64 = btoa(csvContent);
          }
          
          await storage.updateContentRequest(contentRequest.id, {
            status: "completed",
            csvFilename: filename,
            csvBase64: csvBase64,
            completedAt: new Date()
          });

          console.log(`Content generation completed for request ${contentRequest.id}`);
        } catch (error) {
          console.log('Error processing n8n response:', error);
          await storage.updateContentRequest(contentRequest.id, {
            status: "failed",
            errorMessage: `Error processing response: ${error}`,
            completedAt: new Date()
          });
        }
      }).catch(async (error) => {
        console.log('n8n request failed:', error);
        await storage.updateContentRequest(contentRequest.id, {
          status: "failed",
          errorMessage: `Webhook request failed: ${error.message}`,
          completedAt: new Date()
        });
      });

      // Return immediately with request ID for polling
      res.json({
        success: true,
        requestId: contentRequest.id,
        message: "Content generation started. Please check status.",
        status: "processing"
      });

    } catch (error: any) {
      console.log(`Content generation error: ${error}`);
      
      // Update request status to failed if we have a request record
      if (contentRequest && contentRequest.id) {
        try {
          await storage.updateContentRequest(contentRequest.id, {
            status: "failed",
            errorMessage: `Setup error: ${error?.message}`,
            completedAt: new Date()
          });
        } catch (updateError) {
          console.log('Failed to update request status:', updateError);
        }
      }
      
      res.status(500).json({ 
        error: "Setup failed", 
        details: error?.message || "Failed to initialize content generation"
      });
    }
  });

  // Status checking endpoint for polling
  app.get("/api/content-status/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const contentRequest = await storage.getContentRequest(parseInt(requestId));
      
      if (!contentRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (contentRequest.status === "completed" && contentRequest.csvBase64) {
        res.json({
          status: contentRequest.status,
          csvData: {
            csvBase64: contentRequest.csvBase64,
            filename: contentRequest.csvFilename || 'xauti-content.csv'
          },
          completedAt: contentRequest.completedAt
        });
      } else {
        res.json({
          status: contentRequest.status,
          error: contentRequest.errorMessage,
          completedAt: contentRequest.completedAt
        });
      }
    } catch (error: any) {
      console.log('Status check error:', error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });



  // Analyze brand tone from user examples
  app.post("/api/analyze-tone", async (req, res) => {
    try {
      const { examples } = req.body;
      
      if (!examples) {
        return res.status(400).json({ error: "Writing examples are required" });
      }
      
      console.log("Analyzing brand tone from user examples...");
      const analyzedTone = await analyzeBrandTone(examples);
      
      res.json({
        success: true,
        brandTone: analyzedTone
      });
      
    } catch (error) {
      console.error("Error analyzing tone:", error);
      res.status(500).json({ error: "Failed to analyze brand tone" });
    }
  });

  // Generate daily scripts for text-to-speech with custom tone and CTA (Pro+ only)
  app.post("/api/generate-scripts", async (req, res) => {
    try {
      const { requestId, brandTone, callToAction, useDefaultTone, userEmail } = req.body;
      
      if (!requestId) {
        return res.status(400).json({ error: "Request ID is required" });
      }
      
      const contentRequest = await storage.getContentRequest(requestId);
      if (!contentRequest) {
        return res.status(404).json({ error: "Content request not found" });
      }

      // Check if user has Pro+ access for script generation
      if (userEmail) {
        const user = await storage.getUserByEmail(userEmail);
        if (user) {
          const tier = user.subscriptionTier || 'free';
          if (tier === 'free' || tier === 'basic') {
            return res.status(403).json({ 
              error: "Script generation is only available for Pro ($27) and Unlimited ($99+) subscribers." 
            });
          }
        }
      }
      
      const finalBrandTone = useDefaultTone ? DEFAULT_BRAND_TONE : (brandTone || DEFAULT_BRAND_TONE);
      const finalCallToAction = callToAction || "";
      
      console.log("Generating 30-day script collection with custom tone...");
      
      const industry = contentRequest.industry;
      const topics = Array.isArray(contentRequest.selectedTopics) 
        ? contentRequest.selectedTopics 
        : [];
      
      // Generate 30 daily scripts with custom tone
      const scripts = [];
      for (let day = 1; day <= 30; day++) {
        try {
          const dailyScript = await generateDailyScript(industry, topics, day, finalBrandTone, finalCallToAction);
          scripts.push({
            day,
            script: dailyScript
          });
        } catch (error) {
          console.error(`Error generating script for day ${day}:`, error);
          scripts.push({
            day,
            script: `Day ${day}: Share your expertise in ${industry}. Connect with your audience through authentic storytelling and valuable insights. Your voice matters.`
          });
        }
      }
      
      // Create CSV content with daily scripts
      const csvHeader = "Day,Script\n";
      const csvRows = scripts.map(s => `${s.day},"${s.script.replace(/"/g, '""')}"`).join('\n');
      const csvContent = csvHeader + csvRows;
      
      const scriptBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');
      
      // Update the content request with script data and tone preferences
      await storage.updateContentRequest(requestId, {
        scriptContent: scriptBase64,
        brandTone: finalBrandTone,
        callToAction: finalCallToAction
      });
      
      res.json({
        success: true,
        scriptData: {
          csvBase64: scriptBase64,
          filename: `scripts_${industry.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        }
      });
      
    } catch (error) {
      console.error("Error generating scripts:", error);
      res.status(500).json({ error: "Failed to generate scripts" });
    }
  });

  // Debug endpoint to see raw webhook data
  app.post("/api/webhook-debug", async (req, res) => {
    console.log('=== WEBHOOK DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Body keys:', Object.keys(req.body));
    console.log('==================');
    
    // Return detailed info about the data structure
    const response = {
      success: true,
      message: "Webhook received successfully",
      dataStructure: {
        bodyKeys: Object.keys(req.body),
        hasContactObject: !!req.body.contact,
        hasContactEmail: !!req.body['contact.email'],
        hasDirectEmail: !!req.body.email,
        fullBody: req.body
      }
    };
    
    res.json(response);
  });



  // Simple webhook that accepts everything - for HighLevel debugging
  app.all("/api/highlevel/webhook", (req, res) => {
    console.log(`=== HIGHLEVEL WEBHOOK ${req.method} RECEIVED ===`);
    console.log('URL:', req.url);
    console.log('Path:', req.path);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Raw body:', req.body);
    console.log('Query params:', req.query);
    console.log('================================================');
    
    // Always return success regardless of data format
    res.status(200).json({
      success: true,
      message: "HighLevel webhook processed successfully",
      method: req.method,
      path: req.path,
      receivedData: req.body,
      queryParams: req.query,
      timestamp: new Date().toISOString()
    });
  });

  // Subscription management routes
  
  // Update user subscription tier (for HighLevel integration or manual updates)
  app.post("/api/subscription/update", async (req, res) => {
    try {
      const { userId, subscriptionTier, tags } = req.body;
      
      if (!userId || !subscriptionTier) {
        return res.status(400).json({ error: "User ID and subscription tier are required" });
      }

      // Set generation limits based on tier
      const tierLimits = {
        free: 0,
        basic: 2,
        pro: 10,
        unlimited: 999999 // Effectively unlimited
      };

      const generationsLimit = tierLimits[subscriptionTier as keyof typeof tierLimits] || 0;

      const updatedUser = await storage.updateUserSubscription(userId, {
        subscriptionTier,
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        tags: tags || [],
        generationsLimit: generationsLimit
      });

      res.json({
        success: true,
        user: updatedUser,
        message: `Subscription updated to ${subscriptionTier}`
      });
    } catch (error: any) {
      console.error('Subscription update error:', error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Purchase additional generations ($7 per generation)
  app.post("/api/purchase-generations", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    try {
      const { userId, generationCount = 1 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const amountPerGeneration = 700; // $7.00 in cents
      const totalAmount = amountPerGeneration * generationCount;

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${generationCount} Additional Content Generation${generationCount > 1 ? 's' : ''}`,
                description: 'Extra generations for your monthly content creation limit',
              },
              unit_amount: amountPerGeneration,
            },
            quantity: generationCount,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/settings?payment=success`,
        cancel_url: `${req.headers.origin}/settings?payment=cancelled`,
        metadata: {
          userId: userId.toString(),
          generationCount: generationCount.toString(),
          type: "content_generation_purchase"
        },
      });

      res.json({
        success: true,
        sessionId: session.id,
        amount: totalAmount,
        generationCount
      });
    } catch (error: any) {
      console.error('Generation purchase error:', error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Purchase script generations with tier-based pricing
  app.post("/api/purchase-script-generations", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    try {
      const { userId, scriptCount = 1 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const tier = user.subscriptionTier || 'free';
      if (tier === 'free') {
        return res.status(403).json({ error: "Script generations require at least a Basic subscription" });
      }

      // Tier-based pricing: $10 for Basic, $7 for Pro+
      const pricePerScript = tier === 'basic' ? 1000 : 700; // in cents
      const totalAmount = pricePerScript * scriptCount;

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${scriptCount} Script Generation${scriptCount > 1 ? 's' : ''}`,
                description: `Video script generations for ${tier} tier user`,
              },
              unit_amount: pricePerScript,
            },
            quantity: scriptCount,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/settings?payment=success&type=script`,
        cancel_url: `${req.headers.origin}/settings?payment=cancelled`,
        metadata: {
          userId: userId.toString(),
          scriptCount: scriptCount.toString(),
          type: "script_generation_purchase",
          tier: tier
        },
      });

      res.json({
        success: true,
        sessionId: session.id,
        amount: totalAmount,
        scriptCount,
        pricePerScript: pricePerScript / 100
      });
    } catch (error: any) {
      console.error('Script purchase error:', error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Stripe webhook endpoint to handle payment completions
  app.post('/api/webhook/stripe', (req, res, next) => {
    if (req.get('content-type') === 'application/json') {
      req.setEncoding('utf8');
      req.rawBody = '';
      req.on('data', (chunk) => {
        req.rawBody += chunk;
      });
      req.on('end', () => {
        next();
      });
    } else {
      next();
    }
  }, async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      if (!sig) {
        return res.status(400).send('Missing stripe signature');
      }
      
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.log('Warning: STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).send('Webhook secret not configured');
      }

      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as any;
        
        try {
          if (!session.metadata) {
            console.log('No metadata found in session');
            break;
          }

          const userId = parseInt(session.metadata.userId);
          const purchaseType = session.metadata.type;
          
          if (purchaseType === 'content_generation_purchase') {
            const generationCount = parseInt(session.metadata.generationCount);
            
            // Record the purchase
            await storage.createGenerationPurchase({
              userId,
              generationsAdded: generationCount,
              amountPaid: session.amount_total || 0,
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
              paymentStatus: "completed"
            });

            // Add generations to user's account
            await storage.addGenerationsToUser(userId, generationCount);
            
            console.log(`Added ${generationCount} content generations to user ${userId}`);
            
          } else if (purchaseType === 'script_generation_purchase') {
            const scriptCount = parseInt(session.metadata.scriptCount);
            
            // Record the purchase
            await storage.createGenerationPurchase({
              userId,
              generationsAdded: scriptCount,
              amountPaid: session.amount_total || 0,
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
              paymentStatus: "completed"
            });

            // Add script generations to user's account
            await storage.addGenerationsToUser(userId, scriptCount);
            
            console.log(`Added ${scriptCount} script generations to user ${userId}`);
          }
          
        } catch (error) {
          console.error('Error processing webhook:', error);
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  });

  // Get checkout URL for session
  app.post("/api/get-checkout-url", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      // Retrieve the session to get the URL
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session && session.url) {
        res.json({ url: session.url });
      } else {
        res.status(400).json({ error: "Invalid session or no URL available" });
      }
    } catch (error: any) {
      console.error('Checkout URL error:', error);
      res.status(500).json({ error: "Failed to get checkout URL" });
    }
  });

  // Handle successful payment and add generations
  app.post("/api/purchase/confirm", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      const userId = parseInt(paymentIntent.metadata.userId);
      const generationCount = parseInt(paymentIntent.metadata.generationCount);

      // Record the purchase
      await storage.createGenerationPurchase({
        userId,
        generationsAdded: generationCount,
        amountPaid: paymentIntent.amount,
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: "completed"
      });

      // Add generations to user's account
      const updatedUser = await storage.addGenerationsToUser(userId, generationCount);

      res.json({
        success: true,
        user: updatedUser,
        generationsAdded: generationCount,
        message: `Successfully added ${generationCount} generation${generationCount > 1 ? 's' : ''} to your account`
      });
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  // Manual user sync endpoint for testing
  app.post("/api/manual-sync", async (req, res) => {
    try {
      const { email, tags } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get or create user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          name: email.split('@')[0],
          email: email,
          password: 'password123' // Default password for manual sync users
        });
      }

      // Map plan tags to subscription tiers
      const planMapping = {
        "$3 No Code Tool Automation and Content Creator Access": "basic",
        "$3 No Code Tool Automation": "basic",
        "$3 Content Creator Access": "basic",
        "$3": "basic",
        "XAUTI 27 CONTENT TOOL": "pro", 
        "XAUTI CRM BUSINESS IN A BOX": "unlimited",
        "XAUTI CRM UNOCK": "unlimited"
      };

      let subscriptionTier = "free"; // Start with free tier
      let generationsLimit = 0; // Start with no generations

      // Check if specific tags were provided - prioritize highest tier found
      let foundTier = "free";
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          const tagLower = tag.toLowerCase();
          console.log(`Manual sync checking tag: "${tag}" (lowercase: "${tagLower}")`);
          
          // Check for unlimited tier first (highest value)
          if (tagLower.includes('xauti crm business') || 
              tagLower.includes('business in a box') || 
              tagLower.includes('$99') || 
              tagLower.includes('99 plan') || 
              tagLower.includes('unlimited')) {
            foundTier = "unlimited";
            console.log(`Manual sync found UNLIMITED plan tag: ${tag} -> ${foundTier}`);
            break; // Stop at highest tier
          }
          // Check for pro tier
          else if (tagLower.includes('27') || 
                   tagLower.includes('xauti 27') ||
                   tagLower.includes('content tool')) {
            if (foundTier === "free") foundTier = "pro"; // Only if no higher tier found
            console.log(`Manual sync found PRO plan tag: ${tag} -> ${foundTier}`);
          }
          // Check for basic tier
          else if (tagLower.includes('$3') || 
                   tagLower.includes('3 dollar') || 
                   tagLower.includes('automation')) {
            if (foundTier === "free") foundTier = "basic"; // Only if no higher tier found
            console.log(`Manual sync found BASIC plan tag: ${tag} -> ${foundTier}`);
          }
          
          // Direct mapping check
          if (planMapping[tag as keyof typeof planMapping]) {
            const directTier = planMapping[tag as keyof typeof planMapping];
            if (directTier === "unlimited" || (directTier === "pro" && foundTier !== "unlimited") || (directTier === "basic" && foundTier === "free")) {
              foundTier = directTier;
              console.log(`Manual sync found EXACT plan tag: ${tag} -> ${foundTier}`);
            }
          }
        }
        subscriptionTier = foundTier;
        console.log(`Manual sync final subscription tier: ${subscriptionTier}`);
      }

      // Set generation limits
      const tierLimits = { free: 0, basic: 2, pro: 10, unlimited: 999999 };
      generationsLimit = tierLimits[subscriptionTier as keyof typeof tierLimits] || 2;

      // Update user subscription
      const updatedUser = await storage.updateUserSubscription(user.id, {
        subscriptionTier,
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tags: tags || ["$3"],
        generationsLimit: generationsLimit
      });

      res.json({
        success: true,
        message: `User ${email} synced with ${subscriptionTier} tier`,
        user: updatedUser
      });
    } catch (error: any) {
      console.error('Manual sync error:', error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Get user's content generation history
  app.get("/api/user-history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const contentRequests = await storage.getContentRequestsByUserId(parseInt(userId));
      
      // Sort by creation date, newest first
      const sortedRequests = contentRequests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json({
        success: true,
        contentRequests: sortedRequests
      });
    } catch (error: any) {
      console.error('User history error:', error);
      res.status(500).json({ error: "Failed to get user history" });
    }
  });

  // Get user subscription and usage info
  app.get("/api/subscription/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const tierInfo = {
        free: { limit: 0, name: "Free", price: "$0" },
        basic: { limit: 2, name: "Basic", price: "$3" },
        pro: { limit: 10, name: "Pro", price: "$27" },
        unlimited: { limit: 999999, name: "Unlimited", price: "$99+" }
      };

      const userTier = (user.subscriptionTier || 'free') as keyof typeof tierInfo;
      const currentTier = tierInfo[userTier];
      const canGenerate = await storage.checkUserCanGenerate(parseInt(userId));

      // Calculate total available generations
      const tierLimit = currentTier.limit;
      const totalLimit = tierLimit + (user.generationsLimit || 0);

      res.json({
        success: true,
        subscription: {
          tier: userTier,
          tierName: currentTier.name,
          tierPrice: currentTier.price,
          status: user.subscriptionStatus || 'inactive',
          endDate: user.subscriptionEndDate
        },
        usage: {
          generationsUsed: user.generationsUsed || 0,
          generationsLimit: user.generationsLimit || 0,
          tierLimit: tierLimit,
          totalLimit: totalLimit,
          canGenerate: canGenerate,
          remainingGenerations: Math.max(0, totalLimit - (user.generationsUsed || 0))
        },
        tags: user.tags || []
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}