# Xauti Content Generator - Technical Documentation

## Project Overview
The Xauti Content Generator is a fully functional SaaS platform for AI-powered content creation. This version is production-ready and being used by paying customers. A white-label version was partially developed but is currently on hold while focusing on core platform growth.

## System Architecture

### Frontend Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query v5 for server state
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React for interface icons

### Backend Technology Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Neon Database (serverless)
- **ORM**: Drizzle ORM with type-safe operations
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **Authentication**: Custom email/password system with HighLevel CRM integration
- **Payment Processing**: Stripe integration for subscriptions and purchases
- **AI Integration**: OpenAI API for content generation and tone analysis
- **Workflow Automation**: n8n integration for content processing

### Database Schema
Located in `shared/schema.ts` with the following main tables:
- **users**: User management with subscription tiers and usage tracking
- **contentRequests**: Content generation requests with status tracking
- **generationPurchases**: Payment records for additional generations
- **tenants**: Multi-tenant infrastructure (for future white-label expansion)

### Key Features Implemented

#### 1. User Authentication & Management
- Email/password signin system
- Integration with HighLevel CRM for subscription management
- Tag-based subscription tier assignment
- Real-time access control based on subscription status

#### 2. Subscription System
- **Free Tier**: No access (requires paid subscription)
- **Basic ($3/month)**: 2 content generations per month
- **Pro ($27/month)**: 10 content + script generations per month
- **Unlimited ($99+/month)**: Unlimited generations
- Usage tracking and enforcement at UI and API levels

#### 3. Content Generation
- 30-day content calendar generation for any industry
- Topic selection system with predefined and custom options
- Integration with n8n workflows for processing
- Google Drive CSV file delivery system
- Progress tracking and status updates

#### 4. Script Generation (Pro+ Only)
- AI-powered daily script generation (7 unique themes)
- Custom brand tone analysis using OpenAI
- Customizable call-to-action integration
- Optimized for text-to-speech platforms like Eleven Labs

#### 5. Payment Integration
- Stripe payment processing for additional generations
- Tier-based pricing ($7 for content, $10/$7 for scripts based on tier)
- Secure checkout with server-side session management
- Generation balance tracking and automatic updates

#### 6. User Interface
- Responsive design optimized for mobile and desktop
- Content streak tracking and gamification
- Comprehensive history page with download functionality
- Settings page for password management and purchases
- Delete functionality for managing content history

### Environment Configuration

#### Required Environment Variables
```
DATABASE_URL=postgresql://[connection_string]
OPENAI_API_KEY=sk-[your_openai_key]
STRIPE_SECRET_KEY=sk_[your_stripe_secret]
VITE_STRIPE_PUBLIC_KEY=pk_[your_stripe_public]
N8N_WEBHOOK_URL=https://[your_n8n_instance]/webhook/[webhook_id]
```

#### Database Configuration
- **Provider**: Neon Database (serverless PostgreSQL)
- **Connection**: Configured via DATABASE_URL environment variable
- **Migrations**: Managed via Drizzle Kit (`npm run db:push`)
- **Session Storage**: PostgreSQL-based session management

### API Endpoints

#### Authentication
- `POST /api/auth/signin` - User authentication with HighLevel integration
- `POST /api/auth/signout` - User logout

#### Content Generation
- `POST /api/generate-content` - Start content generation workflow
- `POST /api/generate-scripts` - Start script generation (Pro+ only)
- `GET /api/user-history/:userId` - Retrieve user's content history
- `DELETE /api/content-request/:requestId` - Delete content requests

#### Subscription Management
- `GET /api/subscription/status/:userId` - Get user subscription info
- `POST /api/subscription/sync` - Sync with HighLevel CRM
- `POST /api/create-payment-intent` - Stripe payment processing

#### User Management
- `PUT /api/user/password` - Update user password
- `POST /api/user/increment-generations` - Track generation usage

### Deployment Configuration

#### Production Environment
- **Platform**: Replit with auto-scaling
- **Domain**: Custom domain with SSL certificate
- **Build Process**: Vite builds React frontend, esbuild bundles Express backend
- **Port Configuration**: Internal port 5000, external port 80

#### Development Workflow
```bash
npm run dev     # Start development server (frontend + backend)
npm run build   # Build for production
npm run start   # Start production server
npm run db:push # Push database schema changes
```

### File Structure
```
/
├── client/src/           # React frontend application
│   ├── components/ui/    # shadcn/ui component library
│   ├── pages/           # Application pages/routes
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utility functions and configuration
├── server/              # Express.js backend
│   ├── db.ts           # Database connection and configuration
│   ├── storage.ts      # Database operations and business logic
│   ├── routes.ts       # API endpoint definitions
│   └── index.ts        # Server entry point
├── shared/             # Shared TypeScript types and schemas
│   └── schema.ts       # Drizzle database schema definitions
└── attached_assets/    # User-uploaded assets and files
```

### External Integrations

#### HighLevel CRM Integration
- User authentication and subscription management
- Tag-based access control system
- Real-time subscription status synchronization
- Webhook endpoints for subscription updates

#### n8n Workflow Automation
- Content generation processing workflows
- Google Drive file creation and sharing
- Email notifications and status updates
- Error handling and retry mechanisms

#### Stripe Payment Processing
- Subscription management and billing
- One-time generation purchases
- Secure payment handling with webhooks
- Customer and subscription lifecycle management

#### OpenAI API Integration
- Content generation using GPT models
- Brand tone analysis from writing examples
- Custom prompt engineering for industry-specific content
- Rate limiting and error handling

### Security Implementation
- Environment variable protection for sensitive keys
- SQL injection prevention via Drizzle ORM
- XSS protection through React's built-in sanitization
- CORS configuration for API security
- Secure session management with PostgreSQL storage

### Performance Optimizations
- React Query caching for improved user experience
- Lazy loading of components and routes
- Optimized database queries with proper indexing
- CDN-ready static asset serving
- Efficient bundle splitting with Vite

### Monitoring and Error Handling
- Comprehensive error logging throughout the application
- User-friendly error messages and toast notifications
- Graceful degradation for failed API calls
- Database connection pooling and retry logic

## Current Status

### Production Ready Features
✅ User authentication and management
✅ Subscription system with usage enforcement
✅ Content generation with n8n workflows
✅ Script generation for Pro+ users
✅ Stripe payment integration
✅ History management with delete functionality
✅ Responsive UI with optimized layouts
✅ Database integration with proper relationships

### White Label Development (On Hold)
The platform includes partial multi-tenant infrastructure:
- Tenant management system in database schema
- Subdomain-based routing middleware
- Isolated environments for white-label clients
- Custom branding API endpoints

**Decision**: White label development paused to focus on core platform growth and customer acquisition.

### Next Steps for Cloud Engineer
1. **Infrastructure Review**: Assess current Replit deployment for scalability
2. **Monitoring Setup**: Implement application and database monitoring
3. **Backup Strategy**: Ensure robust backup procedures for database and files
4. **Performance Analysis**: Review and optimize database queries and API response times
5. **Security Audit**: Validate security measures and implement additional protections as needed

### Contact Information
- **Repository**: https://github.com/techgirlcrystal/xauti-content-generator
- **Live Platform**: [Current Replit deployment URL]
- **Documentation**: This file and `replit.md` contain comprehensive project details

---

**Last Updated**: June 17, 2025
**Version**: Production v1.0 - Fully Functional Core Platform