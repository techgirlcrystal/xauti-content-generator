import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name, email address, and password.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      
      if (data.user) {
        // Store user in localStorage
        localStorage.setItem("xauti_user", JSON.stringify(data.user));
        
        // Trigger custom event to notify App component of auth change
        window.dispatchEvent(new Event('auth-changed'));
        
        toast({
          title: "Welcome!",
          description: data.message,
        });
        
        navigate("/home");
      } else if (data.needsUpgrade || response.status === 403) {
        // Handle subscription requirement
        setSubscriptionError(true);
        toast({
          title: "Access Denied",
          description: data.error || "Subscription invalid. Please sign up for a new subscription.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign In Failed",
          description: data.error || data.message || "Unable to sign in. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: "Unable to sign in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Xauti</h1>
          <p className="text-xl text-gray-600">Content Generator</p>
          <p className="text-sm text-gray-500 mt-2">Build your 30-day content streak</p>
        </div>

        {subscriptionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">Subscription Required</h3>
            <p className="text-red-700 text-sm mb-3">
              You need an active subscription to access the content generator. Please sign up for a plan first.
            </p>
            <Button asChild className="bg-red-600 hover:bg-red-700 w-full">
              <a href="https://xautimarketingai.com/" target="_blank" rel="noopener noreferrer">
                Get Your Subscription
              </a>
            </Button>
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your name and email to start your content journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Start Your Content Streak"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              Don't have a subscription yet?
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a href="https://xautimarketingai.com/" target="_blank" rel="noopener noreferrer">
                Sign Up Here
              </a>
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Generate 30 days of content for your business</p>
            <p>Track your progress and build consistency</p>
          </div>
        </div>
      </div>
    </div>
  );
}