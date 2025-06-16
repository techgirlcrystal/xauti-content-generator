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
import { Textarea } from "@/components/ui/textarea";

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
  name: string;
  domain: string;
  subdomain: string;
  ownerId: number;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  n8nWebhookUrl: string;
  n8nApiKey: string;
  stripeSecretKey: string;
  stripePublicKey: string;
  stripeWebhookSecret: string;
  openaiApiKey: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [newTenant, setNewTenant] = useState<CreateTenantForm>({
    name: "",
    domain: "",
    subdomain: "",
    ownerId: 0,
    companyName: "",
    primaryColor: "#0066cc",
    secondaryColor: "#f0f9ff",
    logo: "",
    n8nWebhookUrl: "",
    n8nApiKey: "",
    stripeSecretKey: "",
    stripePublicKey: "",
    stripeWebhookSecret: "",
    openaiApiKey: ""
  });

  // Fetch all tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/admin/tenants"],
    queryFn: () => apiRequest("GET", "/api/admin/tenants").then(res => res.json()),
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: (tenant: CreateTenantForm) => 
      apiRequest("POST", "/api/admin/tenants", {
        name: tenant.name,
        domain: tenant.domain,
        subdomain: tenant.subdomain,
        ownerId: tenant.ownerId,
        brandingConfig: {
          companyName: tenant.companyName,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          logo: tenant.logo,
        },
        n8nWebhookUrl: tenant.n8nWebhookUrl,
        n8nApiKey: tenant.n8nApiKey,
        stripeSecretKey: tenant.stripeSecretKey,
        stripePublicKey: tenant.stripePublicKey,
        stripeWebhookSecret: tenant.stripeWebhookSecret,
        openaiApiKey: tenant.openaiApiKey,
        isActive: true,
        plan: "white_label"
      }),
    onSuccess: () => {
      toast({
        title: "White Label Client Created",
        description: "New tenant created successfully with isolated environment.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setNewTenant({
        name: "",
        domain: "",
        subdomain: "",
        ownerId: 0,
        companyName: "",
        primaryColor: "#0066cc",
        secondaryColor: "#f0f9ff",
        logo: "",
        n8nWebhookUrl: "",
        n8nApiKey: "",
        stripeSecretKey: "",
        stripePublicKey: "",
        stripeWebhookSecret: "",
        openaiApiKey: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  const handleCreateTenant = () => {
    if (!newTenant.name || !newTenant.domain || !newTenant.subdomain) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in name, domain, and subdomain",
        variant: "destructive",
      });
      return;
    }
    createTenantMutation.mutate(newTenant);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">White Label Administration</h1>
        <p className="text-muted-foreground">Manage $199 white label client environments</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create New Client</TabsTrigger>
          <TabsTrigger value="manage">Manage Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tenants?.length || 0}</div>
                <p className="text-xs text-muted-foreground">White label instances</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tenants?.filter((t: Tenant) => t.isActive).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(tenants?.length || 0) * 199}</div>
                <p className="text-xs text-muted-foreground">Total licensing revenue</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New White Label Client</CardTitle>
              <CardDescription>
                Set up a new $199 white label environment with isolated n8n, Stripe, and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name</Label>
                  <Input
                    id="name"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                    placeholder="Acme Marketing Agency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Custom Domain (Optional)</Label>
                  <Input
                    id="domain"
                    value={newTenant.domain}
                    onChange={(e) => setNewTenant({...newTenant, domain: e.target.value})}
                    placeholder="app.clientbusiness.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Client's custom domain. They'll need to point this to your platform.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Platform Subdomain</Label>
                  <Input
                    id="subdomain"
                    value={newTenant.subdomain}
                    onChange={(e) => setNewTenant({...newTenant, subdomain: e.target.value})}
                    placeholder="acme"
                  />
                  <p className="text-xs text-muted-foreground">
                    Platform URL: {newTenant.subdomain || 'client'}.xauti-platform.replit.app
                  </p>
                  {newTenant.domain && (
                    <p className="text-xs text-green-600">
                      Client CNAME: {newTenant.domain} → {newTenant.subdomain || 'client'}.xauti-platform.replit.app
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={newTenant.companyName}
                    onChange={(e) => setNewTenant({...newTenant, companyName: e.target.value})}
                    placeholder="Acme Marketing"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Branding Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                      id="primaryColor"
                      type="color"
                      value={newTenant.primaryColor}
                      onChange={(e) => setNewTenant({...newTenant, primaryColor: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo URL</Label>
                    <Input
                      id="logo"
                      value={newTenant.logo}
                      onChange={(e) => setNewTenant({...newTenant, logo: e.target.value})}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">API Integrations</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
                    <Input
                      id="n8nWebhookUrl"
                      value={newTenant.n8nWebhookUrl}
                      onChange={(e) => setNewTenant({...newTenant, n8nWebhookUrl: e.target.value})}
                      placeholder="https://client-n8n.com/webhook/content"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                    <Input
                      id="stripeSecretKey"
                      type="password"
                      value={newTenant.stripeSecretKey}
                      onChange={(e) => setNewTenant({...newTenant, stripeSecretKey: e.target.value})}
                      placeholder="sk_live_..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripePublicKey">Stripe Public Key</Label>
                    <Input
                      id="stripePublicKey"
                      value={newTenant.stripePublicKey}
                      onChange={(e) => setNewTenant({...newTenant, stripePublicKey: e.target.value})}
                      placeholder="pk_live_..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                    <Input
                      id="openaiApiKey"
                      type="password"
                      value={newTenant.openaiApiKey}
                      onChange={(e) => setNewTenant({...newTenant, openaiApiKey: e.target.value})}
                      placeholder="sk-..."
                    />
                  </div>
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

        <TabsContent value="manage" className="space-y-6">
          {tenantsLoading ? (
            <div>Loading tenants...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {tenants?.map((tenant: Tenant) => (
                <Card key={tenant.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{tenant.name}</CardTitle>
                        <CardDescription>
                          {tenant.subdomain}.yourdomain.com | {tenant.domain}
                        </CardDescription>
                      </div>
                      <Badge variant={tenant.isActive ? "default" : "secondary"}>
                        {tenant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">n8n Connected</p>
                        <p className="text-muted-foreground">
                          {tenant.n8nWebhookUrl ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Stripe Connected</p>
                        <p className="text-muted-foreground">
                          {tenant.stripeSecretKey ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">OpenAI Connected</p>
                        <p className="text-muted-foreground">
                          {tenant.openaiApiKey ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Plan</p>
                        <p className="text-muted-foreground">{tenant.plan}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Edit Configuration
                      </Button>
                      <Button variant="outline" size="sm">
                        View Analytics
                      </Button>
                      <Button variant="outline" size="sm">
                        Manage Users
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}