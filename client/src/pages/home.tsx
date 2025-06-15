import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, AlertCircle, Info } from "lucide-react";

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
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>({
    industry: '',
    selectedTopics: [],
    customTopic: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

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

    // Prepare topics array
    const allTopics = [...formData.selectedTopics];
    if (formData.customTopic.trim()) {
      allTopics.push(formData.customTopic.trim());
    }

    // Store data in session storage for the generate page
    sessionStorage.setItem('pendingIndustry', formData.industry.trim());
    sessionStorage.setItem('pendingTopics', JSON.stringify(allTopics));

    // Navigate to generate page
    setLocation('/generate');
  };

  const handleReset = () => {
    setFormData({
      industry: '',
      selectedTopics: [],
      customTopic: ''
    });
    setValidationErrors([]);
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
                  className="flex-1 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,47%)] text-white font-medium"
                >
                  Generate Content
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

        {/* Troubleshooting Panel */}
        <Card className="mt-6 bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900">n8n Webhook Troubleshooting</h3>
                <div className="mt-2 text-sm text-yellow-700 space-y-1">
                  <p><strong>If the webhook isn't triggering:</strong></p>
                  <p>• Ensure your n8n workflow is <strong>active/published</strong></p>
                  <p>• Check that the webhook node is set to accept <strong>POST</strong> requests</p>
                  <p>• Verify the webhook URL matches exactly: <code className="bg-yellow-200 px-1 rounded text-xs">dashboard-content-request</code></p>
                  <p>• Test the webhook independently using the n8n test feature</p>
                  <p>• Check browser console (F12) for detailed error logs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}