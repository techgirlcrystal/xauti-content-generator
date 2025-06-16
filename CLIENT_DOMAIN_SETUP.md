# Domain Setup Guide for White Label Clients

## Overview
As a $199 white label client, you can use your own custom domain for your branded content generation platform. This gives you complete professional control over your client-facing URL.

## Domain Options

### Option 1: Use Your Existing Domain (Recommended)
Point a subdomain of your existing domain to your white label platform:
- `app.yourbusiness.com`
- `content.yourbusiness.com` 
- `tools.yourbusiness.com`

### Option 2: Purchase New Domain
Buy a dedicated domain for your content platform:
- `yourbusinesstools.com`
- `yourcompanyai.com`

## DNS Configuration Steps

### Step 1: Access Your Domain Provider
Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)

### Step 2: Add CNAME Record
Create a new DNS record with these settings:

**For Subdomain (Option 1):**
```
Type: CNAME
Name: app (or content, tools, etc.)
Value: [your-client-name].xauti-platform.replit.app
TTL: 300 (5 minutes)
```

**Example:**
If your client subdomain is "acme", they point to:
```
Type: CNAME
Name: app
Value: acme.xauti-platform.replit.app
TTL: 300
```

**For Root Domain (Option 2):**
```
Type: A Record
Name: @ (root)
Value: [IP Address provided by Xauti]
TTL: 300
```

### Step 3: Verify Configuration
After setting up DNS:
1. Wait 5-15 minutes for propagation
2. Test your domain: `https://app.yourbusiness.com`
3. You should see your branded content platform

## SSL Certificate
SSL certificates are automatically provisioned for your custom domain within 24 hours of DNS configuration. Your site will show as secure with the green lock icon.

## What Your Clients See

### Before Custom Domain:
`https://yourclient.xautiplatform.com`

### After Custom Domain:
`https://app.yourbusiness.com`

This creates a completely professional experience where your clients never see the Xauti branding - only yours.

## Professional Benefits

### Complete White Label Experience:
- Your domain, your branding
- Your logo and colors throughout
- Your company name on all pages
- Professional email notifications from your domain

### Client Trust:
- Builds credibility with your own domain
- Clients see you as the technology provider
- Reinforces your brand identity
- Professional appearance increases conversion rates

## Technical Requirements

### Domain Provider Compatibility:
Works with all major providers:
- GoDaddy
- Namecheap  
- Cloudflare
- Route 53 (AWS)
- Google Domains
- Any DNS provider supporting CNAME records

### Setup Timeline:
- DNS configuration: 5 minutes
- Propagation: 5-60 minutes globally
- SSL certificate: 2-24 hours
- Full activation: Usually within 1 hour

## Support Process

### Initial Setup:
1. **Purchase your white label license ($199)**
2. **Choose your subdomain**: We'll set up `yourclient.xautiplatform.com`
3. **Configure your domain**: Follow this guide to point your domain
4. **Verify functionality**: Test your custom domain works
5. **Go live**: Start onboarding your clients

### Ongoing Support:
- DNS configuration assistance
- SSL certificate management
- Domain troubleshooting
- Technical support included

## Client Onboarding

Once your custom domain is configured:

### Share with Clients:
"Access your content generation platform at: `https://app.yourbusiness.com`"

### Professional Positioning:
Your clients see your business as the technology provider, not a reseller. This allows you to:
- Charge premium pricing
- Build stronger client relationships  
- Maintain control over the client experience
- Scale your service business professionally

## Revenue Impact

### Professional Domain Benefits:
- **Higher Conversion**: Clients trust your branded domain
- **Premium Pricing**: Professional appearance justifies higher rates
- **Brand Building**: Every client interaction reinforces your brand
- **Referral Value**: Clients recommend your branded solution

## Monthly API Cost Estimates

Understanding your operational costs when running your white label platform:

### OpenAI API (Required - Your Account)
**Per Generation Costs:**
- Content calendar generation: $0.50-2.00
- Script generation: $0.75-3.00
- Brand tone analysis: $0.25-1.00

**Monthly Projections:**
- 10 clients × 3 generations = $15-60/month
- 25 clients × 5 generations = $60-250/month
- 50 clients × 10 generations = $250-1,000/month

### n8n Workflow Platform (Required - Your Account)
**Subscription Options:**
- Starter: $19/month (5,000 executions)
- Pro: $39/month (10,000 executions)

**Usage Guide:**
- Each generation uses ~10-20 executions
- 100 generations/month = ~2,000 executions
- 500 generations/month = ~10,000 executions

### Stripe Payment Processing (Required - Your Account)
**Processing Fees:**
- 2.9% + $0.30 per transaction
- $50 payment = $1.75 fee
- $100 payment = $3.20 fee
- $200 payment = $6.10 fee

### Total Operating Costs vs Revenue

**Small Scale Example (10 clients at $50/month = $500 MRR):**
- API costs: ~$49-104/month
- **Net profit: $396-451/month (80-90% margin)**

**Medium Scale Example (25 clients at $100/month = $2,500 MRR):**
- API costs: ~$154-414/month
- **Net profit: $2,086-2,346/month (85-95% margin)**

**Large Scale Example (50 clients at $150/month = $7,500 MRR):**
- API costs: ~$514-1,474/month
- **Net profit: $6,026-6,986/month (80-85% margin)**

### Key Financial Benefits
- 100% revenue retention (no platform fees after $199 setup)
- Scalable cost structure grows with usage
- High-margin recurring revenue model
- Direct client payments to your accounts

Your $199 investment includes complete domain setup support and ongoing technical assistance to ensure a seamless professional experience for your clients.