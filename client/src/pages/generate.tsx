import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Download, ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenerationState {
  status: 'generating' | 'completed' | 'failed' | 'scripts-prompt' | 'generating-scripts';
  progress: number;
  csvData?: {
    csvBase64: string;
    filename: string;
  };
  scriptData?: {
    csvBase64: string;
    filename: string;
  };
  requestId?: number;
  error?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  contentStreak: number;
  lastContentDate: string | null;
}

export default function Generate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'generating',
    progress: 0
  });

  // Get passed data from URL params (more reliable than wouter state)
  const urlParams = new URLSearchParams(window.location.search);
  const industry = urlParams.get('industry') || '';
  const selectedTopicsParam = urlParams.get('topics') || '';
  const selectedTopics = selectedTopicsParam ? selectedTopicsParam.split(',') : [];
  const userId = parseInt(urlParams.get('userId') || '0');

  useEffect(() => {
    // Check for user authentication
    const storedUser = localStorage.getItem("xauti_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        setLocation('/');
        return;
      }
    } else {
      setLocation('/');
      return;
    }

    console.log('Generate page data:', { industry, selectedTopics, userId });

    if (!industry || !selectedTopics.length || !userId) {
      toast({
        title: "Missing Information",
        description: "Please go back and fill out the content generation form.",
        variant: "destructive"
      });
      setLocation('/home');
      return;
    }

    generateContent();
  }, [industry, selectedTopics.length, userId]);

  // Progress simulation during generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generationState.status === 'generating') {
      interval = setInterval(() => {
        setGenerationState(prev => ({
          ...prev,
          progress: prev.progress >= 95 ? 95 : prev.progress + Math.random() * 8
        }));
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [generationState.status]);

  const generateContent = async () => {
    try {
      setGenerationState({
        status: 'generating',
        progress: 10
      });

      const response = await fetch('/api/content-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry: industry.trim(),
          selected_topics: selectedTopics,
          userId: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Content generation failed');
      }

      const responseData = await response.json();
      
      if (responseData.success && responseData.requestId) {
        // Start polling for status updates
        pollForCompletion(responseData.requestId);
        
        toast({
          title: "Generation Started",
          description: "Your content generation has started. Please wait...",
        });
      } else {
        throw new Error('Failed to start content generation');
      }

    } catch (error) {
      console.error('Content generation error:', error);
      setGenerationState({
        status: 'failed',
        progress: 100,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      // Show more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage.includes('timeout') 
          ? "The n8n workflow is not responding. Please check your workflow setup."
          : "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pollForCompletion = async (requestId: number) => {
    const maxAttempts = 60; // Poll for up to 10 minutes (every 10 seconds)
    let attempts = 0;
    
    const poll = async () => {
      try {
        attempts++;
        
        const response = await fetch(`/api/content-status/${requestId}`);
        if (!response.ok) {
          throw new Error('Failed to check status');
        }
        
        const statusData = await response.json();
        
        if (statusData.status === 'completed' && statusData.csvData) {
          setGenerationState({
            status: 'scripts-prompt',
            progress: 100,
            csvData: statusData.csvData,
            requestId: requestId
          });
          
          toast({
            title: "Success!",
            description: "Your content has been generated successfully.",
          });
          return;
        } else if (statusData.status === 'failed') {
          setGenerationState({
            status: 'failed',
            progress: 100,
            error: statusData.error || 'Content generation failed'
          });
          
          toast({
            title: "Error",
            description: statusData.error || "Content generation failed. Please try again.",
            variant: "destructive",
          });
          return;
        } else if (statusData.status === 'processing') {
          // Still processing, continue polling
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            // Timeout after max attempts
            setGenerationState({
              status: 'failed',
              progress: 100,
              error: 'Generation timeout - took longer than expected'
            });
            
            toast({
              title: "Timeout",
              description: "Content generation is taking longer than expected. Please try again or contact support.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setGenerationState({
          status: 'failed',
          progress: 100,
          error: 'Failed to check generation status'
        });
        
        toast({
          title: "Error",
          description: "Failed to check generation status. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    
    // Start polling
    setTimeout(poll, 5000); // First check after 5 seconds
  };

  const downloadCSV = () => {
    if (!generationState.csvData) return;

    try {
      const csvData = generationState.csvData.csvBase64;
      const filename = generationState.csvData.filename;
      
      console.log('Attempting to download CSV:', { filename, hasData: !!csvData });
      
      if (!csvData) {
        console.error('No CSV data available for download');
        toast({
          title: "Download Error",
          description: "No CSV data available for download.",
          variant: "destructive",
        });
        return;
      }

      // Create download link
      const link = document.createElement('a');
      
      // Handle different data formats
      if (csvData.startsWith('data:')) {
        // Already formatted as data URL
        link.href = csvData;
      } else {
        // Base64 data that needs formatting
        link.href = `data:text/csv;base64,${csvData}`;
      }
      
      link.download = filename || 'xauti-content.csv';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Downloaded",
        description: "CSV file has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error", 
        description: "Failed to download CSV file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  const tryAgain = () => {
    generateContent();
  };

  const downloadScripts = () => {
    if (generationState.scriptData) {
      const csvBlob = new Blob([atob(generationState.scriptData.csvBase64)], { type: 'text/csv' });
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generationState.scriptData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Scripts Downloaded",
        description: "Your 30-day script collection is ready for text-to-speech.",
      });
    }
  };

  const generateScripts = async () => {
    if (!generationState.requestId) return;
    
    try {
      setGenerationState(prev => ({
        ...prev,
        status: 'generating-scripts'
      }));
      
      const response = await fetch('/api/generate-scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: generationState.requestId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate scripts');
      }

      const scriptResponse = await response.json();
      
      if (scriptResponse.success && scriptResponse.scriptData) {
        setGenerationState(prev => ({
          ...prev,
          status: 'completed',
          scriptData: scriptResponse.scriptData
        }));
        
        toast({
          title: "Scripts Generated!",
          description: "Your 30-day script collection is ready for download.",
        });
      } else {
        throw new Error('Script generation failed');
      }
    } catch (error) {
      console.error('Script generation error:', error);
      setGenerationState(prev => ({
        ...prev,
        status: 'completed'
      }));
      
      toast({
        title: "Script Generation Failed",
        description: "Don't worry, your content is still available for download.",
        variant: "destructive",
      });
    }
  };

  const skipScripts = () => {
    setGenerationState(prev => ({
      ...prev,
      status: 'completed'
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[hsl(24,95%,53%)] rounded-lg flex items-center justify-center">
                {generationState.status === 'generating' && <Loader2 className="w-6 h-6 text-white animate-spin" />}
                {generationState.status === 'completed' && <CheckCircle className="w-6 h-6 text-white" />}
                {generationState.status === 'failed' && <AlertCircle className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Generation</h1>
                <p className="text-sm text-gray-600">
                  {generationState.status === 'generating' && 'Generating your content...'}
                  {generationState.status === 'scripts-prompt' && 'Content ready! Optional scripts available.'}
                  {generationState.status === 'generating-scripts' && 'Generating your daily scripts...'}
                  {generationState.status === 'completed' && 'Content generated successfully!'}
                  {generationState.status === 'failed' && 'Generation failed'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={goBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Generation Details */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Generation Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Industry</h3>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{industry}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Topics</h3>
                <div className="space-y-1">
                  {selectedTopics?.map((topic: string, index: number) => (
                    <p key={index} className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                      {topic}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        {generationState.status === 'generating' && (
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <Loader2 className="h-8 w-8 animate-spin text-[hsl(24,95%,53%)]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Generating Your Content</h3>
                  <p className="text-sm text-gray-600">
                    Please wait while we create 30 days of personalized content for your industry.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Processing content</span>
                  <span>{Math.round(generationState.progress)}%</span>
                </div>
                <Progress value={generationState.progress} className="w-full mb-3" />
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Estimated time: 2-5 minutes</span>
                </div>
              </div>

              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Please don't close this page.</strong> The generation process is running in the background.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Scripts Prompt Card */}
        {generationState.status === 'scripts-prompt' && (
          <Card className="shadow-sm border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-900">Content Ready!</h3>
                  <p className="text-sm text-blue-700">
                    Your 30 days of content is ready. Would you like daily scripts for text-to-speech?
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-gray-900 mb-2">Optional: Generate Daily Scripts</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Get 30 custom scripts (one for each day) that you can easily copy and paste into any text-to-speech generator. Each script is designed to be exactly 30 seconds when read aloud.
                  </p>
                  <div className="text-xs text-gray-500">
                    • Perfect for creating daily audio content
                    • Ready to use with any text-to-speech tool
                    • Organized by day in a CSV file for easy access
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={generateScripts}
                    className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white font-medium"
                  >
                    Yes, Generate Scripts
                  </Button>
                  <Button
                    variant="outline"
                    onClick={skipScripts}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    No Thanks, Just Download Content
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generating Scripts Card */}
        {generationState.status === 'generating-scripts' && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <Loader2 className="h-8 w-8 text-[hsl(24,95%,53%)] animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Generating Daily Scripts</h3>
                  <p className="text-sm text-gray-600">
                    Creating 30 personalized scripts for text-to-speech generators...
                  </p>
                </div>
              </div>
              
              <Progress value={75} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                This may take a few minutes as we create custom scripts for each day
              </p>
            </CardContent>
          </Card>
        )}

        {/* Success Card */}
        {generationState.status === 'completed' && (
          <Card className="shadow-sm border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-green-900">Content Generated Successfully!</h3>
                  <p className="text-sm text-green-700">
                    Your 30 days of content is ready for download.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    // Extract Google Drive download URL from the CSV content
                    if (generationState.csvData?.csvBase64) {
                      try {
                        const decodedContent = atob(generationState.csvData.csvBase64);
                        const urlMatch = decodedContent.match(/https:\/\/drive\.google\.com\/uc\?id=[^&\s]+&export=download/);
                        if (urlMatch) {
                          window.open(urlMatch[0], '_blank');
                          toast({
                            title: "Opening Download",
                            description: "Opening your 30 days of content in a new tab.",
                          });
                        } else {
                          downloadCSV();
                        }
                      } catch (error) {
                        downloadCSV();
                      }
                    }
                  }}
                  className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download 30 Days of Content
                </Button>
                
                {generationState.scriptData && (
                  <Button
                    onClick={downloadScripts}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Daily Scripts
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={downloadCSV}
                  className="border-[hsl(24,95%,53%)] text-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,53%)] hover:text-white"
                >
                  Instructions
                </Button>
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="sm:w-auto"
                >
                  Generate More Content
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Card */}
        {generationState.status === 'failed' && (
          <Card className="shadow-sm border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-red-900">Generation Failed</h3>
                  <p className="text-sm text-red-700">
                    {generationState.error || 'An error occurred during content generation.'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={tryAgain}
                  className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white font-medium"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="sm:w-auto"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}