import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, Plus, Video } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [scriptQuantity, setScriptQuantity] = useState("1");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const currentUser = JSON.parse(localStorage.getItem("xauti_user") || "{}");

  // Test Stripe configuration on component mount
  React.useEffect(() => {
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    console.log('Stripe public key available:', !!stripeKey);
    console.log('Stripe library loaded:', !!(window as any).Stripe);
    if (stripeKey && (window as any).Stripe) {
      console.log('Stripe configuration looks correct');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          email: currentUser.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });
        
        // Clear form
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast({
          title: "Password Change Failed",
          description: data.error || "Unable to change password. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: "Unable to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseGenerations = async () => {
    if (!quantity || parseInt(quantity) < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Please select a valid quantity.",
        variant: "destructive"
      });
      return;
    }

    setIsPurchasing(true);
    
    try {
      const generationCount = parseInt(quantity);
      console.log('Starting purchase for:', generationCount, 'generations');
      
      const response = await fetch("/api/purchase-generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id,
          generationCount: generationCount
        })
      });

      if (!response.ok) {
        console.error('Purchase API error:', response.status, response.statusText);
        throw new Error(`Purchase failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Purchase API response:', data);
      
      if (data.sessionId) {
        console.log('Redirecting to Stripe checkout...');
        console.log('Session ID format:', data.sessionId);
        
        // Validate session ID format
        if (!data.sessionId.startsWith('cs_')) {
          console.error('Invalid session ID format:', data.sessionId);
          toast({
            title: "Payment Error",
            description: "Invalid checkout session. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Use server-side Stripe checkout URL
        console.log('Getting checkout URL from server...');
        
        try {
          const checkoutResponse = await fetch("/api/get-checkout-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: data.sessionId
            }),
          });

          if (checkoutResponse.ok) {
            const checkoutData = await checkoutResponse.json();
            console.log('Server provided checkout URL:', checkoutData.url);
            window.open(checkoutData.url, '_blank');
          } else {
            // Fallback to direct Stripe checkout
            console.log('Using direct Stripe checkout...');
            window.open(`https://checkout.stripe.com/c/pay/${data.sessionId}`, '_blank');
          }
        } catch (err) {
          console.error('Checkout URL error:', err);
          // Final fallback
          console.log('Final fallback - direct Stripe URL');
          window.open(`https://checkout.stripe.com/c/pay/${data.sessionId}`, '_blank');
        }
      } else {
        toast({
          title: "Payment Setup Failed",
          description: data.error || "Unable to setup payment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: "Unable to process purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePurchaseScriptGenerations = async () => {
    if (!scriptQuantity || parseInt(scriptQuantity) < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Please select a valid quantity.",
        variant: "destructive"
      });
      return;
    }

    const tier = currentUser.subscriptionTier || 'free';
    if (tier === 'free') {
      toast({
        title: "Subscription Required",
        description: "You need at least a Basic subscription to purchase script generations.",
        variant: "destructive"
      });
      return;
    }

    setIsPurchasing(true);
    
    try {
      const scriptCount = parseInt(scriptQuantity);
      // $10 for Basic users, $7 for Pro+ users
      const pricePerScript = tier === 'basic' ? 10 : 7;
      const amount = scriptCount * pricePerScript;
      
      const response = await fetch("/api/purchase-script-generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id,
          scriptCount: scriptCount
        })
      });

      const data = await response.json();
      console.log('Script purchase response:', data);
      
      if (data.sessionId) {
        console.log('Redirecting to Stripe checkout for script purchase...');
        
        // Use server-side Stripe checkout URL for scripts
        console.log('Getting script checkout URL from server...');
        
        try {
          const checkoutResponse = await fetch("/api/get-checkout-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: data.sessionId
            }),
          });

          if (checkoutResponse.ok) {
            const checkoutData = await checkoutResponse.json();
            console.log('Server provided script checkout URL:', checkoutData.url);
            window.open(checkoutData.url, '_blank');
          } else {
            // Fallback to direct Stripe checkout
            console.log('Using direct Stripe checkout for scripts...');
            window.open(`https://checkout.stripe.com/c/pay/${data.sessionId}`, '_blank');
          }
        } catch (err) {
          console.error('Script checkout URL error:', err);
          // Final fallback
          console.log('Script final fallback - direct Stripe URL');
          window.open(`https://checkout.stripe.com/c/pay/${data.sessionId}`, '_blank');
        }
      } else {
        toast({
          title: "Payment Setup Failed",
          description: data.error || "Unable to setup payment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: "Unable to process purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and security</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({...prev, currentPassword: e.target.value}))}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password (min 6 characters)"
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({...prev, newPassword: e.target.value}))}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Purchase Additional Generations
            </CardTitle>
            <CardDescription>
              Buy extra generations to extend your monthly limit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Current Balance</span>
                <span className="text-lg font-bold text-blue-900">
                  {currentUser.subscriptionTier === 'unlimited' ? '∞' : Math.max(0, (currentUser.generationsLimit || 0) - (currentUser.generationsUsed || 0))} generations left
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Subscription: {currentUser.subscriptionTier || 'Free'} ({currentUser.generationsLimit || 0} monthly limit)
              </p>
            </div>

            {currentUser.subscriptionTier !== 'unlimited' && (
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content Generations</TabsTrigger>
                  <TabsTrigger value="scripts">Script Generations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <h4 className="font-medium text-green-900 mb-1">Content Generations</h4>
                    <p className="text-sm text-green-800">
                      Generate 30-day content calendars - $7 per generation for all tiers
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Select value={quantity} onValueChange={setQuantity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quantity" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(10)].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1} generation{i > 0 ? 's' : ''} - ${(i + 1) * 7}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <p className="text-sm text-gray-800">
                      <strong>Total: ${parseInt(quantity) * 7}</strong> for {quantity} content generation{parseInt(quantity) > 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handlePurchaseGenerations}
                    className="w-full"
                    disabled={isPurchasing}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isPurchasing ? "Processing Payment..." : `Purchase ${quantity} Content Generation${parseInt(quantity) > 1 ? 's' : ''}`}
                  </Button>
                </TabsContent>
                
                <TabsContent value="scripts" className="space-y-4">
                  {currentUser.subscriptionTier === 'free' ? (
                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                      <p className="text-sm text-orange-800">
                        <strong>Script generations require at least a Basic ($3) subscription.</strong> 
                        <br />Upgrade your plan to access script purchases.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <h4 className="font-medium text-purple-900 mb-1">Script Generations</h4>
                        <p className="text-sm text-purple-800">
                          Generate 30-day video scripts for text-to-speech
                          <br />
                          <strong>
                            {currentUser.subscriptionTier === 'basic' ? '$10 per script generation (Basic tier)' : '$7 per script generation (Pro+ tier)'}
                          </strong>
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="scriptQuantity">Quantity</Label>
                        <Select value={scriptQuantity} onValueChange={setScriptQuantity}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select quantity" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(10)].map((_, i) => {
                              const price = currentUser.subscriptionTier === 'basic' ? 10 : 7;
                              return (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1} script generation{i > 0 ? 's' : ''} - ${(i + 1) * price}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-800">
                          <strong>Total: ${parseInt(scriptQuantity) * (currentUser.subscriptionTier === 'basic' ? 10 : 7)}</strong> for {scriptQuantity} script generation{parseInt(scriptQuantity) > 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handlePurchaseScriptGenerations}
                        className="w-full"
                        disabled={isPurchasing}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        {isPurchasing ? "Processing Payment..." : `Purchase ${scriptQuantity} Script Generation${parseInt(scriptQuantity) > 1 ? 's' : ''}`}
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {currentUser.subscriptionTier === 'unlimited' && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <p className="text-sm text-purple-800">
                  You have unlimited generations! No need to purchase additional ones.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your current account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Name</Label>
              <p className="text-gray-900">{currentUser.name}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-500">Email</Label>
              <p className="text-gray-900">{currentUser.email}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-500">Subscription Tier</Label>
              <p className="text-gray-900 capitalize">
                {currentUser.subscriptionTier || 'Free'} 
                {currentUser.subscriptionTier !== 'free' && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({currentUser.generationsLimit} generations)
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}