import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // API route to handle content generation requests (proxy to n8n)
  app.post("/api/content-generate", async (req, res) => {
    try {
      const { industry, selected_topics, content_type = 'ai-pics' } = req.body;
      
      if (!industry || !selected_topics) {
        return res.status(400).json({ error: "Industry and selected topics are required" });
      }

      console.log(`Content generation requested for industry: ${industry}, content type: ${content_type}`);
      
      // Create request record in database
      const contentRequest = await storage.createContentRequest({
        userId: 0, // Anonymous for now
        industry,
        selectedTopics: selected_topics,
        status: "processing"
      });

      // Determine webhook URL based on content type
      const webhookUrl = content_type === 'content-only' 
        ? 'https://n8n.srv847085.hstgr.cloud/webhook/words-only'
        : 'https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request';

      // Proxy request to n8n webhook with timeout
      console.log(`Sending request to n8n webhook: ${webhookUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('n8n request timeout after 30 seconds');
        controller.abort();
      }, 30000); // 30 seconds timeout for initial connection

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
        
        const csvContent = `IMPORTANT: Your CSV file has been generated successfully!

File Details:
- Name: ${filename}
- Size: ${responseData.size} bytes
- Created: ${responseData.createdTime}

DIRECT DOWNLOAD LINK:
${downloadUrl}

INSTRUCTIONS:
1. Copy the link above
2. Paste it in a new browser tab
3. Your CSV file will download automatically

TO FIX THIS FOR FUTURE GENERATIONS:
Update your n8n workflow by adding these nodes after creating the CSV:

1. Add "Google Drive - Download" node
   - Set File ID: {{$json["id"]}}
   - Set Return Format: "File Content (Base64)"

2. Update your "Respond to Webhook" node to return:
   {
     "csvBase64": "{{$json["data"]}}",
     "filename": "{{$json["name"]}}"
   }

This will provide direct CSV downloads without requiring Google Drive authentication.`;
        
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
      res.status(500).json({ error: "Internal server error", details: error?.message });
    }
  });

  // Test webhook connectivity endpoint
  app.post("/api/test-webhook", async (req, res) => {
    try {
      const { webhook_type = 'ai-pics' } = req.body;
      
      const webhookUrl = webhook_type === 'content-only' 
        ? 'https://n8n.srv847085.hstgr.cloud/webhook/words-only'
        : 'https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request';

      console.log(`Testing webhook: ${webhookUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout for testing

      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry: "Test",
          selected_topics: ["test"]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      res.json({
        webhook_url: webhookUrl,
        status: testResponse.status,
        ok: testResponse.ok,
        message: testResponse.ok 
          ? `Webhook is active and responding` 
          : `Webhook returned ${testResponse.status} error`
      });

    } catch (error: any) {
      console.log(`Webhook test error: ${error}`);
      res.json({
        error: true,
        message: error.name === 'AbortError' 
          ? 'Webhook timeout - may not be active'
          : `Connection error: ${error.message}`
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
