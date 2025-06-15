import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, AlertCircle, CheckCircle, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  industry: string;
  selectedTopics: string[];
  customTopic: string;
}

interface ValidationError {
  message: string;
}

const PREDEFINED_TOPICS = [
  {
    id: 'paying_dues',
    label: 'Paying Dues (Industry Legends)',
    description: 'Content about industry pioneers and success stories'
  },
  {
    id: 'current_trends',
    label: 'Current Trends & News',
    description: 'Latest industry developments and trending topics'
  }
];

export default function Home() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    industry: '',
    selectedTopics: [],
    customTopic: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 15;
          const newProgress = prev + increment;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!formData.industry.trim()) {
      errors.push({ message: 'Industry is required' });
    }
    
    if (formData.selectedTopics.length === 0 && !formData.customTopic.trim()) {
      errors.push({ message: 'Please select at least one predefined topic or enter a custom topic' });
    }
    
    return errors;
  };

  const handleTopicChange = (topicId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedTopics: checked 
        ? [...prev.selectedTopics, topicId]
        : prev.selectedTopics.filter(id => id !== topicId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setStatusMessage(null);
    setIsLoading(true);

    // Prepare topics array
    const allTopics = [...formData.selectedTopics];
    if (formData.customTopic.trim()) {
      allTopics.push(formData.customTopic.trim());
    }

    try {
      // Prepare request data for n8n webhook
      const requestData = {
        industry: formData.industry.trim(),
        selected_topics: allTopics
      };
      console.log('Sending request to n8n:', requestData);
      
      // Set a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout
      
      try {
        const response = await fetch('https://n8n.srv847085.hstgr.cloud/webhook/dashboard-content-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Response received - status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Response data received:', responseData);
        
        // Complete progress
        setProgress(100);

        // Download CSV
        const link = document.createElement('a');
        link.href = 'data:text/csv;base64,' + responseData.csvBase64;
        link.download = responseData.filename || 'xauti-content.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setStatusMessage({
          message: 'Content generated successfully! Your CSV file has been downloaded.',
          type: 'success'
        });

        toast({
          title: "Success!",
          description: "Your content has been generated and downloaded.",
        });

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('Fetch error:', fetchError);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 3 minutes. Please check if your n8n workflow is active and running.');
        } else {
          throw fetchError;
        }
      }

    } catch (error) {
      console.error('Error generating content:', error);
      setProgress(100);
      setStatusMessage({
        message: 'Something went wrong while generating content. Please try again.',
        type: 'error'
      });

      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      industry: '',
      selectedTopics: [],
      customTopic: ''
    });
    setValidationErrors([]);
    setStatusMessage(null);
    setProgress(0);
  };

  const handleFieldBlur = () => {
    const errors = validateForm();
    setValidationErrors(errors);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[hsl(24,95%,53%)] rounded-lg flex items-center justify-center">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Xauti Content Generator</h1>
              <p className="text-sm text-gray-600">Generate 5 days of engaging content for your industry</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Content Generator Form */}
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Content Configuration</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Customize your content generation parameters
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Industry Input */}
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                  Industry <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="industry"
                  type="text"
                  placeholder="e.g., Fitness, Real Estate, Digital Marketing"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  onBlur={handleFieldBlur}
                  className="focus-brand-orange"
                />
                <p className="text-xs text-gray-500">
                  Specify your business sector for targeted content generation
                </p>
              </div>

              {/* Topic Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Content Topics <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Select at least one predefined topic or add your own custom topic
                  </p>
                </div>
                
                {/* Predefined Topics */}
                <div className="space-y-3">
                  {PREDEFINED_TOPICS.map((topic) => (
                    <div key={topic.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={topic.id}
                        checked={formData.selectedTopics.includes(topic.id)}
                        onCheckedChange={(checked) => handleTopicChange(topic.id, checked as boolean)}
                        className="mt-1 data-[state=checked]:bg-[hsl(24,95%,53%)] data-[state=checked]:border-[hsl(24,95%,53%)]"
                      />
                      <div className="flex-1">
                        <Label htmlFor={topic.id} className="text-sm font-medium text-gray-700 cursor-pointer">
                          {topic.label}
                        </Label>
                        <p className="text-xs text-gray-500">{topic.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Topic Input */}
                <div className="pt-4 border-t border-gray-200">
                  <Label htmlFor="customTopic" className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Topic (Optional)
                  </Label>
                  <Input
                    id="customTopic"
                    type="text"
                    placeholder="e.g., Customer Success Stories, Product Tutorials, Behind the Scenes"
                    value={formData.customTopic}
                    onChange={(e) => setFormData(prev => ({ ...prev, customTopic: e.target.value }))}
                    onBlur={handleFieldBlur}  
                    className="focus-brand-orange"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add your own content theme not covered by the predefined topics
                  </p>
                </div>
              </div>

              {/* Validation Messages */}
              {validationErrors.length > 0 && (
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Content'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  className="sm:w-auto"
                >
                  Reset Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="mt-6 shadow-sm border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Loader2 className="h-8 w-8 animate-spin text-[hsl(24,95%,53%)]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Generating your content...</h3>
                  <p className="text-sm text-gray-600">
                    Please allow 2-5 minutes for the workflow to complete. Do not close this page.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Processing content</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Messages */}
        {statusMessage && (
          <div className="mt-6">
            <Alert className={`${
              statusMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : statusMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center space-x-3">
                {statusMessage.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                {statusMessage.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
                <AlertDescription className="font-medium">
                  {statusMessage.message}
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        {/* Info Panel */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">How it works</h3>
                <div className="mt-2 text-sm text-blue-700 space-y-1">
                  <p>• Select your industry and content topics</p>
                  <p>• Our AI generates 5 days of tailored content</p>
                  <p>• Download your content as a CSV file</p>
                  <p>• Use the content across your marketing channels</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
