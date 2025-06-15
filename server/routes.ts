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
        userId: null, // Anonymous for now
        industry,
        selectedTopics: selected_topics,
        status: "processing"
      });

      // Proxy request to n8n webhook
      const n8nResponse = await fetch('https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry,
          selected_topics
        })
      });

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
      
      // Update request status to completed
      await storage.updateContentRequest(contentRequest.id, {
        status: "completed",
        csvFilename: responseData.filename,
        csvBase64: responseData.csvBase64,
        completedAt: new Date()
      });

      console.log(`Content generation completed for request ${contentRequest.id}`);
      
      // Return the response data
      res.json(responseData);

    } catch (error) {
      console.log(`Content generation error: ${error}`);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // API route to get content request history
  app.get("/api/content-requests", async (req, res) => {
    try {
      // For now, get all requests (later can filter by user)
      const requests = await storage.getContentRequestsByUserId(null);
      res.json(requests);
    } catch (error) {
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
