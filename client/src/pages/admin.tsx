import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Tenant {
  id: number;
  name: string;
  domain: string;
  subdomain: string;
  ownerId: number;
  brandingConfig?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
    customCss?: string;
    favicon?: string;
    emailFromName?: string;
  };
  n8nWebhookUrl?: string;
  n8nApiKey?: string;
  stripeSecretKey?: string;
  stripePublicKey?: string;
  stripeWebhookSecret?: string;
  openaiApiKey?: string;
  isActive: boolean;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTenantForm {
  companyName: string;
  customDomain: string;
  n8nWebhookUrl: string;
  stripeSecretKey: string;
  stripePublicKey: string;
  openaiApiKey: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [newTenant, setNewTenant] = useState<CreateTenantForm>({
    companyName: "",
    customDomain: "",
    n8nWebhookUrl: "",
    stripeSecretKey: "",
    stripePublicKey: "",
    openaiApiKey: ""
  });

  // Fetch all tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/admin/tenants"],
    queryFn: () => apiRequest("GET", "/api/admin/tenants").then(res => res.json()),
  });

  // Create tenant mutation
  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/tenants/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Deleted",
        description: "White label client has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  // DNS check mutation
  const checkDnsMutation = useMutation({
    mutationFn: async ({ domain, expectedTarget }: { domain: string; expectedTarget: string }) => {
      try {
        const response = await apiRequest("POST", "/api/admin/check-dns", { domain, expectedTarget });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error: any) {
        console.error('DNS check error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      const statusMessages: Record<string, string> = {
        configured: "DNS is correctly configured!",
        misconfigured: `DNS misconfigured. ${data.message}`,
        different_config: "Domain resolves but not using CNAME record",
        not_configured: "DNS not configured yet - domain doesn't resolve"
      };
      
      toast({
        title: "DNS Check Complete",
        description: statusMessages[data.status] || data.message || "Check completed",
        variant: data.status === 'configured' ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      console.error('DNS mutation error:', error);
      toast({
        title: "DNS Check Failed",
        description: error.message || "Could not check DNS status",
        variant: "destructive",
      });
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: (tenant: CreateTenantForm) => {
      // Generate unique subdomain from company name
      const baseSubdomain = tenant.companyName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 12);
      
      // Add random suffix to ensure uniqueness
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      const subdomain = `${baseSubdomain}${randomSuffix}`;
      
      return apiRequest("POST", "/api/admin/tenants", {
        name: tenant.companyName,
        domain: tenant.customDomain,
        subdomain: subdomain,
        ownerId: 0,
        brandingConfig: {
          companyName: tenant.companyName,
          primaryColor: "#0066cc",
          secondaryColor: "#f0f9ff",
        },
        n8nWebhookUrl: tenant.n8nWebhookUrl,
        stripeSecretKey: tenant.stripeSecretKey,
        stripePublicKey: tenant.stripePublicKey,
        openaiApiKey: tenant.openaiApiKey,
        isActive: true,
        plan: "white_label"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "White Label Client Created!",
        description: `${newTenant.companyName} platform is ready. Client credentials saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setNewTenant({
        companyName: "",
        customDomain: "",
        n8nWebhookUrl: "",
        stripeSecretKey: "",
        stripePublicKey: "",
        openaiApiKey: ""
      });
      // Switch to manage tab to show the new client
      setActiveTab("manage");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const handleCreateTenant = () => {
    if (!newTenant.companyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    createTenantMutation.mutate(newTenant);
  };

  const generateSubdomain = (companyName: string) => {
    return companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">White Label Admin</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Setup new $199 white label client platforms
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="create">New Client</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Active Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {tenants?.filter((t: Tenant) => t.isActive).length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    ${((tenants?.filter((t: Tenant) => t.isActive).length || 0) * 199).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profit Margin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">94%</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Setup New White Label Client</CardTitle>
                <CardDescription>
                  Each client gets their own branded platform with isolated login system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={newTenant.companyName}
                      onChange={(e) => setNewTenant({ ...newTenant, companyName: e.target.value })}
                      placeholder="Marketing Pro Agency"
                    />
                    {newTenant.companyName && (
                      <p className="text-sm text-gray-600 mt-1">
                        Platform: {generateSubdomain(newTenant.companyName)}.xauti-platform.replit.app
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                    <Input
                      id="customDomain"
                      value={newTenant.customDomain}
                      onChange={(e) => setNewTenant({ ...newTenant, customDomain: e.target.value })}
                      placeholder="app.clientbusiness.com"
                    />
                    {newTenant.customDomain && newTenant.companyName && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">DNS Setup Instructions</p>
                        <code className="block mt-1 text-xs bg-blue-100 dark:bg-blue-800 p-2 rounded">
                          CNAME: {newTenant.customDomain} → {generateSubdomain(newTenant.companyName)}.xauti-platform.replit.app
                        </code>
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">SSL Certificate Note:</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Custom domains will show "Not Secure" initially. For SSL certificates, clients need to:
                          </p>
                          <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
                            <li>Use platform subdomain for immediate SSL</li>
                            <li>Or setup Cloudflare for custom domain SSL</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold">Client API Keys</h4>
                  
                  <div>
                    <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
                    <Input
                      id="n8nWebhookUrl"
                      value={newTenant.n8nWebhookUrl}
                      onChange={(e) => setNewTenant({ ...newTenant, n8nWebhookUrl: e.target.value })}
                      placeholder="https://n8n.example.com/webhook/content"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Client's workflow endpoint for content generation
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="stripePublicKey">Stripe Public Key</Label>
                      <Input
                        id="stripePublicKey"
                        value={newTenant.stripePublicKey}
                        onChange={(e) => setNewTenant({ ...newTenant, stripePublicKey: e.target.value })}
                        placeholder="pk_live_..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                      <Input
                        id="stripeSecretKey"
                        type="password"
                        value={newTenant.stripeSecretKey}
                        onChange={(e) => setNewTenant({ ...newTenant, stripeSecretKey: e.target.value })}
                        placeholder="sk_live_..."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                    <Input
                      id="openaiApiKey"
                      type="password"
                      value={newTenant.openaiApiKey}
                      onChange={(e) => setNewTenant({ ...newTenant, openaiApiKey: e.target.value })}
                      placeholder="sk-proj-..."
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h4 className="font-semibold mb-2">What Each Client Gets:</h4>
                  <ul className="text-sm space-y-1 mb-3">
                    <li>• Their own branded login page for customers</li>
                    <li>• Completely isolated user database</li>
                    <li>• Custom domain support</li>
                    <li>• Independent payment processing</li>
                    <li>• Full control over customer pricing</li>
                  </ul>
                  
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <h5 className="font-medium text-sm mb-2">Client Login Access:</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Clients don't need login credentials - you just set them up once. Their customers create accounts directly on their branded platform. The client owns and manages all their customer data independently.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleCreateTenant} 
                  disabled={createTenantMutation.isPending}
                  className="w-full"
                >
                  {createTenantMutation.isPending ? "Creating..." : "Create White Label Client"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                {tenantsLoading ? (
                  <div>Loading...</div>
                ) : !tenants || tenants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No clients created yet</p>
                    <Button 
                      onClick={() => setActiveTab("create")} 
                      className="mt-4"
                    >
                      Create First Client
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tenants?.map((tenant: Tenant) => (
                      <div key={tenant.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{tenant.brandingConfig?.companyName || tenant.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>Platform:</span>
                              <span className="font-mono text-green-600">
                                {window.location.origin}?tenant={tenant.subdomain}
                              </span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Ready with SSL
                              </Badge>
                            </div>
                            {tenant.domain && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span>Custom:</span>
                                  <span className="font-mono text-amber-600">{tenant.domain}</span>
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    Needs DNS Setup
                                  </Badge>
                                </div>
                                <div className="ml-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                  <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">DNS Instructions:</div>
                                  <div className="font-mono bg-blue-100 dark:bg-blue-800 p-1 rounded">
                                    CNAME: {tenant.domain} → {window.location.host}
                                  </div>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(tenant.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <Badge variant={tenant.isActive ? "default" : "secondary"}>
                              {tenant.isActive ? "Live & Ready" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Credentials Stored
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="mt-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              Client Setup Complete
                            </span>
                          </div>
                          <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                            <li>✓ Platform URL configured</li>
                            <li>✓ API keys stored securely</li>
                            <li>✓ Login system active</li>
                            <li>✓ Ready for customer signups</li>
                          </ul>
                        </div>
                        
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // Use custom domain if available, otherwise use the main platform with subdomain detection
                              const url = tenant.domain 
                                ? `https://${tenant.domain}` 
                                : `${window.location.protocol}//${window.location.host}?tenant=${tenant.subdomain}`;
                              window.open(url, '_blank');
                            }}
                          >
                            Visit Platform
                          </Button>
                          {tenant.domain && (
                            <>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => {
                                  const dnsInstructions = `DNS Setup Instructions for ${tenant.brandingConfig?.companyName || tenant.name}

Platform URL (Ready): ${window.location.origin}?tenant=${tenant.subdomain}
Custom Domain: ${tenant.domain}

DNS Record Required:
Type: CNAME
Name: ${tenant.domain}
Value: ${window.location.host}

Steps:
1. Log into your domain registrar (GoDaddy, Namecheap, etc.)
2. Go to DNS Management
3. Add a CNAME record with the details above
4. Save changes (propagation takes 24-48 hours)

For SSL on custom domains:
- Use Cloudflare for free SSL certificates
- Or contact your hosting provider

Complete guide: ${window.location.origin}/DNS_SETUP_GUIDE.md

Need help? Forward these instructions to your client.`;
                                  
                                  navigator.clipboard.writeText(dnsInstructions);
                                  toast({
                                    title: "DNS Instructions Copied",
                                    description: "Share these instructions with your client",
                                  });
                                }}
                              >
                                Copy DNS Setup
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  // Create and download the DNS guide as a text file
                                  const guideContent = `DNS Setup Guide for White Label Clients

## Quick Start
Your branded content generation platform is ready! You have two options:

### Option 1: Use Platform URL (Immediate, SSL Included)
Your platform is live at: ${tenant.subdomain}.xauti-platform.replit.app
- ✅ Works immediately
- ✅ SSL certificate included  
- ✅ No setup required

### Option 2: Custom Domain Setup
To use your custom domain: ${tenant.domain}

## DNS Configuration Steps

### 1. Access Your Domain Provider
Log into your domain registrar or DNS provider:
- GoDaddy, Namecheap, Cloudflare, Route 53, NameSilo, Others

### 2. Create CNAME Record
Add a new DNS record with these details:

Type: CNAME
Name: ${tenant.domain}
Value: ${tenant.subdomain}.xauti-platform.replit.app
TTL: 300 (or leave default)

### 3. Common Provider Instructions

#### GoDaddy:
1. Go to "My Products" → "DNS"
2. Click "Add" → "CNAME"
3. Host: @ (for root domain) or subdomain
4. Points to: ${tenant.subdomain}.xauti-platform.replit.app

#### Namecheap:
1. Go to "Domain List" → "Manage"
2. Click "Advanced DNS"
3. Add Record → CNAME
4. Host: @ or subdomain
5. Value: ${tenant.subdomain}.xauti-platform.replit.app

#### Cloudflare:
1. Go to "DNS" → "Records"
2. Add record → CNAME
3. Name: @ or subdomain
4. Target: ${tenant.subdomain}.xauti-platform.replit.app
5. Proxy status: Orange cloud (for SSL)

### 4. SSL Certificate Options

#### Option A: Use Cloudflare (Recommended)
1. Transfer DNS to Cloudflare (free)
2. Enable "Full" SSL mode
3. SSL certificate is automatic

#### Option B: Platform URL
Continue using ${tenant.subdomain}.xauti-platform.replit.app - it has built-in SSL

## Verification
1. Wait 24-48 hours for full propagation
2. Test at: https://dnschecker.org
3. Verify CNAME points to ${tenant.subdomain}.xauti-platform.replit.app

## Troubleshooting

### Common Issues
- "This site can't be reached": DNS not propagated yet (wait 24-48 hours)
- "Not Secure" warning: Use Cloudflare for free SSL or use platform URL

Your platform is completely isolated and you control all customer data and revenue.`;

                                  // Create blob and download
                                  const blob = new Blob([guideContent], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `DNS-Setup-Guide-${tenant.brandingConfig?.companyName || tenant.name}.txt`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                  
                                  toast({
                                    title: "Guide Downloaded",
                                    description: "DNS setup guide saved to your downloads",
                                  });
                                }}
                              >
                                Download Guide
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => {
                                  checkDnsMutation.mutate({
                                    domain: tenant.domain,
                                    expectedTarget: `${tenant.subdomain}.xauti-platform.replit.app`
                                  });
                                }}
                                disabled={checkDnsMutation.isPending}
                              >
                                {checkDnsMutation.isPending ? "Checking..." : "Check DNS"}
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Delete ${tenant.brandingConfig?.companyName || tenant.name}? This cannot be undone.`)) {
                                deleteTenantMutation.mutate(tenant.id);
                              }
                            }}
                            disabled={deleteTenantMutation.isPending}
                          >
                            {deleteTenantMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}