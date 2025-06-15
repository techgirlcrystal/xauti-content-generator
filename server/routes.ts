import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // API route to handle content generation requests (proxy to n8n)
  app.post("/api/content-generate", async (req, res) => {
    try {
      const { industry, selected_topics } = req.body;
      
      if (!industry || !selected_topics) {
        return res.status(400).json({ error: "Industry and selected topics are required" });
      }

      console.log(`Content generation requested for industry: ${industry}`);
      
      // Create request record in database
      const contentRequest = await storage.createContentRequest({
        userId: 0, // Anonymous for now
        industry,
        selectedTopics: selected_topics,
        status: "processing"
      });

      // Proxy request to n8n webhook with timeout
      console.log('Sending request to n8n webhook...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('n8n request timeout after 3 minutes');
        controller.abort();
      }, 180000); // 3 minutes timeout

      const n8nResponse = await fetch('https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request', {
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
        
        try {
          // Fetch the actual CSV content from Google Drive
          const fileResponse = await fetch(downloadUrl);
          if (fileResponse.ok) {
            const csvContent = await fileResponse.text();
            csvBase64 = btoa(csvContent);
            console.log('Successfully fetched CSV content from Google Drive');
          } else {
            throw new Error('Failed to fetch from Google Drive');
          }
        } catch (fetchError) {
          console.log('Could not fetch file content, providing download link instead');
          // Fallback to providing download instructions
          const csvContent = `Content Generation Complete!
File Name: ${filename}
File Size: ${responseData.size} bytes
Created: ${responseData.createdTime}

Your CSV content has been generated successfully.
Direct Download URL: ${downloadUrl}

To access your content:
1. Click the download button below to get the file info
2. Copy the Direct Download URL and paste it in a new browser tab
3. The CSV file will download automatically`;
          
          csvBase64 = btoa(csvContent);
        }
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
