import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({ name, email });
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

      res.json({ 
        user,
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

  // API route to handle content generation requests (30-day workflow only)
  app.post("/api/content-generate", async (req, res) => {
    try {
      const { industry, selected_topics, userId } = req.body;
      
      if (!industry || !selected_topics || !userId) {
        return res.status(400).json({ error: "Industry, selected topics, and user ID are required" });
      }

      console.log(`Content generation requested for industry: ${industry}, user: ${userId}`);
      
      // Create request record in database
      const contentRequest = await storage.createContentRequest({
        userId,
        industry,
        selectedTopics: selected_topics,
        status: "processing"
      });

      // Use 30-day content workflow only
      const webhookUrl = 'https://n8n.srv847085.hstgr.cloud/webhook/words-only';

      // Proxy request to n8n webhook with timeout
      console.log(`Sending request to n8n webhook: ${webhookUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('n8n request timeout after 2 minutes');
        controller.abort();
      }, 120000); // 2 minutes timeout for content generation

      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry,
          selected_topics
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('n8n response received with status:', n8nResponse.status);

      if (!n8nResponse.ok) {
        // Update request status to failed
        await storage.updateContentRequest(contentRequest.id, {
          status: "failed",
          errorMessage: `n8n webhook failed with status: ${n8nResponse.status}`,
          completedAt: new Date()
        });
        
        const errorText = await n8nResponse.text();
        console.log(`n8n webhook error: ${errorText}`);
        
        // Provide specific error message for webhook issues
        if (n8nResponse.status === 404) {
          const webhookName = content_type === 'content-only' ? 'words-only' : 'dashboard-content-request';
          return res.status(500).json({ 
            error: "Webhook not found", 
            details: `The ${webhookName} webhook is not active. Please activate your n8n workflow by clicking 'Execute workflow' in n8n, then try again.`,
            webhook_url: webhookUrl
          });
        }
        
        return res.status(500).json({ error: "Content generation failed", details: errorText });
      }

      const responseData = await n8nResponse.json();
      console.log('n8n response data structure:', JSON.stringify(responseData, null, 2));
      
      // Handle Google Drive response format from n8n
      let csvBase64 = null;
      let filename = 'xauti-content.csv';
      
      // Check for different response formats
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
        // Google Drive response - fetch the actual file content
        console.log('Detected Google Drive file response - fetching actual content');
        
        const downloadUrl = responseData.webContentLink;
        filename = responseData.name || 'xauti-content.csv';
        
        // Google Drive files require authentication, so provide direct access instructions
        console.log('Providing Google Drive download instructions');
        
        const workflowType = content_type === 'content-only' ? '30-day content' : '5-day AI image content';
        const csvContent = `IMPORTANT: Your ${workflowType} has been generated successfully!

File Details:
- Name: ${filename}
- Size: ${responseData.size} bytes
- Created: ${responseData.createdTime}
- Content Type: ${workflowType}

DIRECT DOWNLOAD LINK:
${downloadUrl}

INSTRUCTIONS:
1. Copy the link above
2. Paste it in a new browser tab
3. Your CSV file will download automatically

TO FIX THIS FOR FUTURE GENERATIONS:
Both your n8n workflows need the same update - add these nodes after creating the CSV:

1. Add "Google Drive - Download" node
   - Set File ID: {{$json["id"]}}
   - Set Return Format: "File Content (Base64)"

2. Update your "Respond to Webhook" node to return:
   {
     "csvBase64": "{{$json["data"]}}",
     "filename": "{{$json["name"]}}"
   }

This applies to BOTH workflows:
- AI Pics workflow: ${content_type === 'ai-pics' ? 'https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request' : 'https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request'}
- Content workflow: ${content_type === 'content-only' ? 'https://n8n.srv847085.hstgr.cloud/webhook/words-only' : 'https://n8n.srv847085.hstgr.cloud/webhook/words-only'}

Both need the same Google Drive download fix for direct CSV downloads.`;
        
        csvBase64 = btoa(csvContent);
      } else {
        // Fallback - convert entire response to CSV-like format
        console.log('Unknown response format, creating fallback CSV');
        const csvContent = `Industry,Topics,Status,Timestamp\n"${industry}","${selected_topics.join('; ')}","Completed","${new Date().toISOString()}"`;
        csvBase64 = btoa(csvContent);
      }
      
      // Update request status to completed
      await storage.updateContentRequest(contentRequest.id, {
        status: "completed",
        csvFilename: filename,
        csvBase64: csvBase64,
        completedAt: new Date()
      });

      console.log(`Content generation completed for request ${contentRequest.id}`);
      console.log(`Saved CSV data length: ${csvBase64?.length || 0}`);
      
      // Return the response data
      res.json({
        csvBase64: csvBase64,
        filename: filename,
        success: true
      });

    } catch (error: any) {
      console.log(`Content generation error: ${error}`);
      
      // Update request status to failed if we have a request record
      try {
        if (contentRequest?.id) {
          await storage.updateContentRequest(contentRequest.id, {
            status: "failed",
            errorMessage: `Workflow timeout or error: ${error?.message}`,
            completedAt: new Date()
          });
        }
      } catch (updateError) {
        console.log('Failed to update request status:', updateError);
      }
      
      // Provide helpful error message based on error type
      if (error.name === 'AbortError') {
        res.status(500).json({ 
          error: "Workflow timeout", 
          details: `The ${content_type || 'selected'} workflow is taking longer than expected. Please check your n8n workflow for errors or contact support.`
        });
      } else {
        res.status(500).json({ error: "Internal server error", details: error?.message });
      }
    }
  });

  // Test webhook connectivity endpoint with detailed diagnostics
  app.post("/api/test-webhook", async (req, res) => {
    try {
      const { webhook_type = 'ai-pics' } = req.body;
      
      const webhookUrl = webhook_type === 'content-only' 
        ? 'https://n8n.srv847085.hstgr.cloud/webhook/words-only'
        : 'https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request';

      console.log(`Testing webhook: ${webhookUrl}`);

      // First test basic connectivity
      const headResponse = await fetch(webhookUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      
      if (!headResponse.ok) {
        return res.json({
          webhook_url: webhookUrl,
          status: headResponse.status,
          connectivity: 'Failed',
          error: `Webhook returned ${headResponse.status} on HEAD request`,
          recommendation: 'Check if your n8n workflow is active and the webhook URL is correct'
        });
      }

      // Test with minimal payload
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: "Test", selected_topics: ["test"] }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseText = await testResponse.text();

      res.json({
        webhook_url: webhookUrl,
        status: testResponse.status,
        connectivity: 'Connected',
        response_preview: responseText.substring(0, 200),
        ok: testResponse.ok,
        message: testResponse.ok 
          ? 'Webhook executed successfully' 
          : `Workflow error: ${testResponse.status}`,
        recommendation: testResponse.ok 
          ? 'Webhook is working correctly'
          : 'Check n8n workflow execution logs for errors'
      });

    } catch (error: any) {
      console.log(`Webhook test error: ${error}`);
      res.json({
        error: true,
        webhook_url: webhookUrl,
        connectivity: 'Timeout',
        message: error.name === 'AbortError' 
          ? 'Webhook execution timeout - workflow may be stuck'
          : `Connection error: ${error.message}`,
        recommendation: 'Check n8n workflow for infinite loops, API timeouts, or authentication issues'
      });
    }
  });

  // API route to get content request history
  app.get("/api/content-requests", async (req, res) => {
    try {
      // For now, get all requests (later can filter by user)
      const requests = await storage.getContentRequestsByUserId(0); // Use 0 for anonymous requests
      res.json(requests);
    } catch (error: any) {
      console.log(`Error fetching content requests: ${error}`);
      res.status(500).json({ error: "Failed to fetch content requests" });
    }
  });

  // API route to get specific content request
  app.get("/api/content-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getContentRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Content request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.log(`Error fetching content request: ${error}`);
      res.status(500).json({ error: "Failed to fetch content request" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
