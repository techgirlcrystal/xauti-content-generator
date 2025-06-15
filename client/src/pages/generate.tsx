import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Download, ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenerationState {
  status: 'generating' | 'completed' | 'failed';
  progress: number;
  csvData?: {
    csvBase64: string;
    filename: string;
  };
  error?: string;
}

export default function Generate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'generating',
    progress: 0
  });

  // Get request data from URL params or session storage
  const urlParams = new URLSearchParams(window.location.search);
  const industry = urlParams.get('industry') || sessionStorage.getItem('pendingIndustry') || '';
  const topics = urlParams.get('topics')?.split(',') || 
                JSON.parse(sessionStorage.getItem('pendingTopics') || '[]');

  useEffect(() => {
    if (!industry || topics.length === 0) {
      // Redirect back to home if no data
      setLocation('/');
      return;
    }

    generateContent();
  }, []);

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
          selected_topics: topics
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Content generation failed');
      }

      const responseData = await response.json();
      
      setGenerationState({
        status: 'completed',
        progress: 100,
        csvData: {
          csvBase64: responseData.csvBase64,
          filename: responseData.filename || 'xauti-content.csv'
        }
      });

      // Clean up session storage
      sessionStorage.removeItem('pendingIndustry');
      sessionStorage.removeItem('pendingTopics');

      toast({
        title: "Success!",
        description: "Your content has been generated successfully.",
      });

    } catch (error) {
      console.error('Content generation error:', error);
      setGenerationState({
        status: 'failed',
        progress: 100,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    }
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
                  {topics.map((topic: string, index: number) => (
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
                    Please wait while our AI creates 5 days of personalized content for your industry.
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
                    Your 5 days of content is ready for download.
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
                            description: "Opening your CSV file in a new tab.",
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
                  Download CSV File
                </Button>
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