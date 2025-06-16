# GitHub Setup Guide for Xauti Content Generator

## Quick GitHub Setup Instructions

### Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in top right corner
3. Select "New repository"
4. Repository name: `xauti-content-generator`
5. Description: `Enhanced Content Generator with Stripe Integration and n8n Workflows`
6. Set to Public or Private (your choice)
7. **DO NOT** initialize with README, .gitignore, or license (we have these files already)
8. Click "Create repository"

### Step 2: Copy Your Repository URL
After creating the repository, GitHub will show you a page with setup instructions. Copy the repository URL that looks like:
```
https://github.com/YOUR_USERNAME/xauti-content-generator.git
```

### Step 3: Push Your Code to GitHub
Open a terminal/shell in your project and run these commands:

```bash
# Remove the lock file if it exists
rm -f .git/index.lock

# Add your GitHub repository as the remote origin
git remote add origin https://github.com/YOUR_USERNAME/xauti-content-generator.git

# Add all your project files
git add .

# Create your first commit
git commit -m "Initial commit: Complete Xauti Content Generator with Stripe integration"

# Push to GitHub
git push -u origin main
```

If you get an authentication error, you may need to:
1. Use a Personal Access Token instead of password
2. Or use GitHub CLI: `gh auth login`

### Step 4: Verify Upload
Go to your GitHub repository URL to confirm all files uploaded successfully.

## Project Structure Overview

Your complete project includes:

### Core Application Files
- `client/` - React frontend with shadcn/ui components
- `server/` - Express.js backend with TypeScript
- `shared/` - Database schema and shared types
- `package.json` - All dependencies and scripts

### Key Features Implemented
- ✅ Complete Stripe payment integration with tier-based pricing
- ✅ Server-side checkout URL generation (eliminates redirect issues)
- ✅ New tab checkout flow preserving user session
- ✅ Webhook system for automatic generation balance updates
- ✅ PostgreSQL database with Drizzle ORM
- ✅ User authentication and subscription management
- ✅ Content and script generation with n8n workflows
- ✅ Comprehensive error handling and fallback systems

### Environment Variables Needed for Deployment
When deploying elsewhere, you'll need these environment variables:
```
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

## Next Steps After GitHub Upload

1. **Documentation**: Your `replit.md` contains comprehensive project documentation
2. **Deployment**: Ready for deployment on Vercel, Netlify, or other platforms
3. **Collaboration**: Share repository with team members
4. **Version Control**: All future changes will be tracked in Git history

## Recent Implementation Highlights

- Resolved all Stripe checkout redirect failures
- Implemented robust server-side URL generation
- Added comprehensive webhook processing
- Created tier-based pricing system ($7 content, $10/$7 scripts)
- Enhanced user experience with new tab payments

Your project is production-ready with a complete payment system and user management!