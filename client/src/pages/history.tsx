
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, ArrowLeft, Calendar, FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentRequest {
  id: number;
  industry: string;
  selectedTopics: string[];
  status: string;
  csvFilename?: string;
  csvBase64?: string;
  scriptContent?: string;
  brandTone?: string;
  callToAction?: string;
  createdAt: string;
  completedAt?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  subscriptionTier: string;
}

export default function History() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [contentRequests, setContentRequests] = useState<ContentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for user authentication
    const storedUser = localStorage.getItem("xauti_user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        fetchUserHistory(userData.id);
      } catch (error) {
        setLocation('/');
        return;
      }
    } else {
      setLocation('/');
      return;
    }
  }, []);

  const fetchUserHistory = async (userId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user-history/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      
      const data = await response.json();
      setContentRequests(data.contentRequests || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Failed to load your generation history.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadContent = (request: ContentRequest) => {
    if (!request.csvBase64) {
      toast({
        title: "Download Error",
        description: "No content available for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      
      // Handle different data formats
      if (request.csvBase64.startsWith('data:')) {
        link.href = request.csvBase64;
      } else {
        link.href = `data:text/csv;base64,${request.csvBase64}`;
      }
      
      link.download = request.csvFilename || `content-${request.industry}-${new Date(request.createdAt).toLocaleDateString()}.csv`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Downloaded",
        description: "Content file has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error", 
        description: "Failed to download content file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadScripts = (request: ContentRequest) => {
    if (!request.scriptContent) {
      toast({
        title: "Download Error",
        description: "No scripts available for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvBlob = new Blob([atob(request.scriptContent)], { type: 'text/csv' });
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scripts-${request.industry}-${new Date(request.createdAt).toLocaleDateString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Scripts Downloaded",
        description: "Script file has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Script download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download script file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[hsl(24,95%,53%)] rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generation History</h1>
                <p className="text-sm text-gray-600">
                  View and download your past content generations
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation('/home')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* User Info */}
        {user && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">{user.name}</h3>
                  <p className="text-sm text-blue-700">{user.email}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 capitalize">
                  {user.subscriptionTier} Plan
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[hsl(24,95%,53%)]" />
              <p className="text-gray-600">Loading your generation history...</p>
            </CardContent>
          </Card>
        )}

        {/* No History */}
        {!isLoading && contentRequests.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Generations Yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't generated any content yet. Start creating your first 30-day content calendar!
              </p>
              <Button 
                onClick={() => setLocation('/home')}
                className="bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white"
              >
                Generate Content
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        {!isLoading && contentRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Content Generations ({contentRequests.length})
            </h2>
            
            {contentRequests.map((request) => (
              <Card key={request.id} className="shadow-sm border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[hsl(24,95%,53%)] rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900 capitalize">
                          {request.industry}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(request.createdAt)}</span>
                          {request.completedAt && (
                            <>
                              <span>•</span>
                              <span>Completed {formatDate(request.completedAt)}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Topics */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Topics Covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(request.selectedTopics) 
                        ? request.selectedTopics.map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))
                        : <Badge variant="outline" className="text-xs">No topics available</Badge>
                      }
                    </div>
                  </div>

                  {/* Custom Branding Info */}
                  {(request.brandTone || request.callToAction) && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                      <h4 className="text-sm font-medium text-purple-900 mb-2">Custom Branding</h4>
                      {request.brandTone && (
                        <p className="text-xs text-purple-700 mb-1">
                          <strong>Brand Tone:</strong> {request.brandTone.substring(0, 100)}...
                        </p>
                      )}
                      {request.callToAction && (
                        <p className="text-xs text-purple-700">
                          <strong>Call to Action:</strong> {request.callToAction}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Download Actions */}
                  {request.status === 'completed' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => downloadContent(request)}
                        className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white font-medium"
                        disabled={!request.csvBase64}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Content
                      </Button>
                      
                      {request.scriptContent && (
                        <Button
                          onClick={() => downloadScripts(request)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Scripts
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Failed Status */}
                  {request.status === 'failed' && (
                    <Alert className="bg-red-50 border-red-200">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        This generation failed to complete. You can try generating new content from the home page.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Processing Status */}
                  {request.status === 'processing' && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <AlertDescription className="text-blue-800">
                        This generation is still in progress. Check back in a few minutes.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
