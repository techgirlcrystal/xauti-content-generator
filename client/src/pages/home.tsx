import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Trophy, User, LogOut, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  industry: string;
  selectedTopics: string[];
  customTopic: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  contentStreak: number;
  lastContentDate: string | null;
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
    description: 'Latest developments and trending topics in your industry'
  },
  {
    id: 'behind_scenes',
    label: 'Behind the Scenes',
    description: 'Personal stories and day-to-day business insights'
  },
  {
    id: 'customer_stories',
    label: 'Customer Success Stories',
    description: 'Testimonials and case studies from satisfied clients'
  },
  {
    id: 'tips_advice',
    label: 'Tips & Advice',
    description: 'Educational content and best practices'
  },
  {
    id: 'future_vision',
    label: 'Future Vision',
    description: 'Industry predictions and forward-thinking content'
  }
];

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    industry: "",
    selectedTopics: [],
    customTopic: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check for user in localStorage
    const storedUser = localStorage.getItem("xauti_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem("xauti_user");
        navigate("/");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("xauti_user");
    // Trigger custom event to notify App component of auth change
    window.dispatchEvent(new Event('auth-changed'));
    navigate("/");
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
    
    if (!formData.industry.trim()) {
      toast({
        title: "Missing Industry",
        description: "Please enter your industry or business type.",
        variant: "destructive"
      });
      return;
    }

    const allTopics = [...formData.selectedTopics];
    if (formData.customTopic.trim()) {
      allTopics.push(formData.customTopic.trim());
    }

    if (allTopics.length === 0) {
      toast({
        title: "No Topics Selected",
        description: "Please select at least one topic or add a custom topic.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Navigate to generate page with URL parameters (more reliable)
    const params = new URLSearchParams({
      industry: formData.industry,
      topics: allTopics.join(','),
      userId: user?.id?.toString() || '0'
    });
    
    navigate(`/generate?${params.toString()}`);
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header with user info and streak */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="flex items-center space-x-2 mb-1">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-gray-900">{user.contentStreak || 0}</span>
                </div>
                <p className="text-sm text-gray-600">Content Streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span className="text-lg font-semibold text-gray-900">Day {user.contentStreak || 1}</span>
                </div>
                <p className="text-sm text-gray-600">of 30</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content form */}
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <CardTitle>Generate Your 30-Day Content</CardTitle>
            </div>
            <CardDescription>
              Create engaging content for your business and maintain your streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="industry">Industry or Business Type</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Digital Marketing, Real Estate, Fitness Coaching"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({...prev, industry: e.target.value}))}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label>Content Topics (Select all that apply)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {PREDEFINED_TOPICS.map((topic) => (
                    <div key={topic.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                      <Checkbox
                        id={topic.id}
                        checked={formData.selectedTopics.includes(topic.id)}
                        onCheckedChange={(checked) => handleTopicChange(topic.id, checked as boolean)}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1">
                        <label htmlFor={topic.id} className="text-sm font-medium cursor-pointer">
                          {topic.label}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">{topic.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customTopic">Custom Topic (Optional)</Label>
                <Input
                  id="customTopic"
                  placeholder="Add your own specific topic..."
                  value={formData.customTopic}
                  onChange={(e) => setFormData(prev => ({...prev, customTopic: e.target.value}))}
                  disabled={isSubmitting}
                />
              </div>

              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  This will generate 30 days of content specifically tailored to your industry and selected topics.
                  Keep building your streak by generating content daily!
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Generating..." : "Generate 30-Day Content"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}