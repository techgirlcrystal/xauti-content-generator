# DNS Setup Guide for White Label Clients

## Quick Start

Your branded content generation platform is ready! You have two options:

### Option 1: Use Platform URL (Immediate, SSL Included)
Your platform is live at: `[subdomain].xauti-platform.replit.app`
- ✅ Works immediately
- ✅ SSL certificate included
- ✅ No setup required

### Option 2: Custom Domain Setup
To use your custom domain, follow these steps:

## DNS Configuration Steps

### 1. Access Your Domain Provider
Log into your domain registrar or DNS provider:
- GoDaddy
- Namecheap
- Cloudflare
- Route 53
- NameSilo
- Others

### 2. Create CNAME Record
Add a new DNS record with these details:

```
Type: CNAME
Name: [your-custom-domain.com]
Value: [subdomain].xauti-platform.replit.app
TTL: 300 (or leave default)
```

### 3. Common Provider Instructions

#### GoDaddy:
1. Go to "My Products" → "DNS"
2. Click "Add" → "CNAME"
3. Host: @ (for root domain) or subdomain
4. Points to: [subdomain].xauti-platform.replit.app

#### Namecheap:
1. Go to "Domain List" → "Manage"
2. Click "Advanced DNS"
3. Add Record → CNAME
4. Host: @ or subdomain
5. Value: [subdomain].xauti-platform.replit.app

#### Cloudflare:
1. Go to "DNS" → "Records"
2. Add record → CNAME
3. Name: @ or subdomain
4. Target: [subdomain].xauti-platform.replit.app
5. Proxy status: Orange cloud (for SSL)

### 4. SSL Certificate Options

#### Option A: Use Cloudflare (Recommended)
1. Transfer DNS to Cloudflare (free)
2. Enable "Full" SSL mode
3. SSL certificate is automatic

#### Option B: Let's Encrypt
1. Contact your hosting provider
2. Request Let's Encrypt certificate
3. Point to: [subdomain].xauti-platform.replit.app

#### Option C: Platform URL
Continue using [subdomain].xauti-platform.replit.app - it has built-in SSL

## Verification

### Check DNS Propagation
1. Wait 24-48 hours for full propagation
2. Test at: https://dnschecker.org
3. Verify CNAME points to [subdomain].xauti-platform.replit.app

### Test Your Domain
1. Visit: https://[your-domain.com]
2. Should show your branded login page
3. SSL certificate should be valid

## Troubleshooting

### Common Issues

**"This site can't be reached"**
- DNS not propagated yet (wait 24-48 hours)
- CNAME record incorrect
- Check DNS at dnschecker.org

**"Not Secure" warning**
- SSL certificate not configured
- Use Cloudflare for free SSL
- Or use platform URL with built-in SSL

**Page loads but looks wrong**
- Clear browser cache
- Try incognito/private browsing
- Contact support

### Need Help?
1. Platform URL always works: [subdomain].xauti-platform.replit.app
2. Contact your white label provider
3. Include screenshots and error messages

## Platform Features

Once DNS is working, your customers can:
- Create accounts at your branded URL
- Generate 30-day content calendars
- Create daily scripts with custom branding
- Access all content generation features
- Use your Stripe payment system

Your platform is completely isolated and you control all customer data and revenue.