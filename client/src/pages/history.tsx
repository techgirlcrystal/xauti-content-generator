
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, ArrowLeft, Calendar, FileText, Clock, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
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
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const deleteContentRequest = async (requestId: number) => {
    if (!user) return;
    
    setDeletingId(requestId);
    
    try {
      const response = await fetch(`/api/content-request/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete content request');
      }

      // Remove from local state
      setContentRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Deleted",
        description: "Content request has been deleted successfully.",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete content request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
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
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-[hsl(24,95%,53%)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold text-gray-900 capitalize truncate">
                          {request.industry}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-600 mt-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Created {formatDate(request.createdAt)}</span>
                          </div>
                          {request.completedAt && (
                            <div className="flex items-center space-x-1 mt-0.5">
                              <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-600" />
                              <span className="truncate">Completed {formatDate(request.completedAt)}</span>
                            </div>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-3">
                  {/* Topics */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Topics Covered</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(request.selectedTopics) 
                        ? request.selectedTopics.map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                              {topic}
                            </Badge>
                          ))
                        : <Badge variant="outline" className="text-xs px-2 py-0.5">No topics available</Badge>
                      }
                    </div>
                  </div>

                  {/* Custom Branding Info */}
                  {(request.brandTone || request.callToAction) && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-md">
                      <h4 className="text-xs font-medium text-purple-900 mb-1.5">Custom Branding</h4>
                      <div className="space-y-1">
                        {request.brandTone && (
                          <p className="text-xs text-purple-700">
                            <span className="font-medium">Tone:</span> {request.brandTone.substring(0, 80)}...
                          </p>
                        )}
                        {request.callToAction && (
                          <p className="text-xs text-purple-700">
                            <span className="font-medium">CTA:</span> {request.callToAction}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Download Actions */}
                  {request.status === 'completed' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => downloadContent(request)}
                          className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white text-sm py-2"
                          disabled={!request.csvBase64}
                        >
                          <Download className="w-3 h-3 mr-1.5" />
                          Content
                        </Button>
                        
                        {request.scriptContent && (
                          <Button
                            onClick={() => downloadScripts(request)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                          >
                            <Download className="w-3 h-3 mr-1.5" />
                            Scripts
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => deleteContentRequest(request.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 text-xs py-1.5"
                        disabled={deletingId === request.id}
                      >
                        {deletingId === request.id ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1.5" />
                        )}
                        Delete Request
                      </Button>
                    </div>
                  )}

                  {/* Failed Status */}
                  {request.status === 'failed' && (
                    <div className="space-y-2">
                      <Alert className="bg-red-50 border-red-200 py-2">
                        <XCircle className="w-3 h-3 text-red-600" />
                        <AlertDescription className="text-red-800 text-xs">
                          Generation failed. Try creating new content from the home page.
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => deleteContentRequest(request.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 text-xs py-1.5"
                        disabled={deletingId === request.id}
                      >
                        {deletingId === request.id ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1.5" />
                        )}
                        Remove Failed Request
                      </Button>
                    </div>
                  )}

                  {/* Processing Status */}
                  {request.status === 'processing' && (
                    <div className="space-y-2">
                      <Alert className="bg-blue-50 border-blue-200 py-2">
                        <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                        <AlertDescription className="text-blue-800 text-xs">
                          Generation in progress. Check back in a few minutes.
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => deleteContentRequest(request.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800 text-xs py-1.5"
                        disabled={deletingId === request.id}
                      >
                        {deletingId === request.id ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1.5" />
                        )}
                        Cancel Request
                      </Button>
                    </div>
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
