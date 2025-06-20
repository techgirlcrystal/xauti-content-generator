# Xauti Content Generator

## Overview

This is a full-stack web application built for generating content based on user-specified industry and topics. The application uses a modern React frontend with shadcn/ui components, an Express.js backend, and is configured for deployment on Replit with PostgreSQL database support.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **API Design**: RESTful API with `/api` prefix

### Development Setup
- **Runtime**: Node.js 20
- **Package Manager**: npm
- **Type Safety**: TypeScript with strict configuration
- **Hot Reload**: Vite HMR for frontend, tsx for backend development

## Key Components

### Database Schema
- **Users Table**: Basic user management with username/password authentication
- **Schema Location**: `shared/schema.ts` for type safety across frontend/backend
- **Migrations**: Drizzle Kit manages database migrations in `./migrations`

### Frontend Structure
- **Pages**: Home page with content generation form, 404 not found page
- **Components**: Full shadcn/ui component library including forms, cards, progress bars, alerts
- **Hooks**: Custom hooks for mobile detection and toast notifications
- **API Layer**: Centralized API request handling with error management

### Backend Structure
- **Storage Interface**: Abstracted storage layer with in-memory implementation (ready for database integration)
- **Routes**: Modular route registration system
- **Middleware**: Request logging, error handling, and CORS support
- **Static Serving**: Vite middleware for development, static file serving for production

## Data Flow

1. **User Input**: Form data collected on home page (industry, topic selection)
2. **Form Validation**: Client-side validation with error display
3. **API Request**: POST to `/api` endpoints with form data
4. **Backend Processing**: Express routes handle business logic
5. **Database Operations**: Drizzle ORM manages data persistence
6. **Response Handling**: Success/error states managed by React Query
7. **UI Updates**: Toast notifications and progress indicators for user feedback

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing
- **date-fns**: Date manipulation utilities

### UI Dependencies
- **@radix-ui/**: Complete set of headless UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **cmdk**: Command palette functionality

### Development Dependencies
- **vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for backend development
- **esbuild**: Production backend bundling

## Deployment Strategy

### Replit Configuration
- **Environment**: Node.js 20, Web, PostgreSQL 16 modules
- **Development**: `npm run dev` starts both frontend and backend with hot reload
- **Production Build**: `npm run build` creates optimized bundles
- **Production Start**: `npm run start` serves built application
- **Port Configuration**: Internal port 5000, external port 80

### Build Process
1. Vite builds React frontend to `dist/public`
2. esbuild bundles Express backend to `dist/index.js`
3. Static assets served from built frontend directory
4. Environment variables configure database connection

### Database Management
- **Development**: Drizzle Kit manages schema changes with `npm run db:push`
- **Production**: Automatic migrations on deployment
- **Connection**: Environment variable `DATABASE_URL` for database connectivity

## Recent Changes

- June 17, 2025: Fixed Payment System Balance Updates with Separate Content/Script Tracking
  - Resolved critical payment processing bug where purchased generations weren't updating dashboard balances
  - Added separate tracking for content generations vs script generations in database schema
  - Updated Stripe webhook system with proper secret configuration for production payments
  - Fixed ernesthale@me.com account to show correct balances: 2 content + 1 script generations
  - Enhanced settings page to display separate content and script generation balances
  - Webhook now properly distinguishes between content ($7) and script purchases ($10 Basic, $7 Pro+)
  - Production webhook URL configured: /api/webhook/stripe with proper Stripe signature verification
  - All future payments now automatically update user balances in real-time across all subscription tiers

- June 17, 2025: Platform Layout Optimization and Deployment Preparation
  - Added comprehensive delete functionality for all content request types (completed, failed, processing)
  - Created DELETE API endpoint with proper user validation and error handling
  - Implemented optimized card layout with compact spacing and better content flow
  - Fixed Sign Out button positioning with responsive header layout design
  - Redesigned navigation with proper container boundaries and mobile responsiveness
  - Enhanced user interface consistency across all pages with clean, uncluttered appearance
  - All layout issues resolved - platform ready for production deployment to users
  - Users can now efficiently manage their generation history and navigate seamlessly

- June 17, 2025: Production-Ready Xauti Platform Deployment
  - Completed core platform with all essential features for customer sales
  - Resolved SSL certificate issues and platform accessibility
  - Fixed redirect loops and tenant middleware for proper routing
  - Added branding API system for future white label expansion
  - Platform ready for deployment with working payment integration
  - Decision to focus on core Xauti sales before expanding white label features
  - All subscription tiers, content generation, and user management operational

- June 16, 2025: Complete DNS Management and Verification System
  - Added comprehensive DNS setup guidance with downloadable client instructions
  - Implemented real-time DNS checker to verify custom domain configuration
  - Fixed guide download functionality with client-specific setup instructions
  - Enhanced admin interface with Copy DNS Setup, Download Guide, and Check DNS buttons
  - DNS checker validates CNAME records and provides clear status feedback
  - Streamlined client onboarding with complete DNS management tools

- June 16, 2025: Admin Panel Delete Functionality and Platform Testing
  - Added working delete functionality for removing duplicate white label clients
  - Fixed tenant query parameter support for testing client platforms from admin panel
  - Enhanced admin interface with clear SSL status indicators for platform vs custom domains
  - Successfully tested client deletion and platform access verification
  - Clarified that platform subdomains have immediate SSL while custom domains need DNS setup

- June 16, 2025: Multi-Tenant White Label System Implementation
  - Built complete tenant management system for $199 white label clients
  - Added isolated environments with tenant-specific n8n, Stripe, and OpenAI configurations
  - Created admin interface for managing white label client environments
  - Implemented subdomain-based tenant routing and middleware
  - Each client gets their own branded platform with custom domains
  - Added tenant-aware database operations with proper data isolation
  - Built admin dashboard for creating and managing white label instances
  - Supports custom branding, API keys, and webhook configurations per tenant

- June 16, 2025: Implemented Server-Side Stripe Checkout URL Solution
  - Completely resolved "Something went wrong" and silent redirect failures in Stripe checkout
  - Created server-side API endpoint to retrieve official checkout URLs from Stripe sessions
  - Eliminated JavaScript SDK dependency issues by using direct URL navigation
  - Implemented robust fallback system with multiple redirect methods
  - Enhanced debugging with comprehensive console logging throughout checkout process
  - Both content and script generation purchases now use reliable server-provided checkout URLs
  - Updated checkout flow to open in new tabs, preserving user's current session

- June 16, 2025: Complete Stripe Integration with Tier-Based Script Pricing
  - Integrated Stripe payment system directly into settings page for generation purchases
  - Implemented tier-based pricing for script generations: $10 for Basic users, $7 for Pro+ users
  - Added tabbed interface for separate content and script generation purchases
  - Content generations remain $7 for all subscription tiers
  - Script generation purchases restricted to paid subscribers (Basic+)
  - Enhanced settings page with quantity selection (1-10 generations) and real-time pricing
  - Added generation balance display showing remaining monthly generations
  - Updated home page generation explanation to direct users to settings for purchases
  - Unlimited tier users see appropriate messaging (no purchase needed)
  - Comprehensive payment flow with Stripe confirmation and user account updates

- June 16, 2025: Password Management and Script Generation Access Control
  - Added comprehensive password change functionality with secure backend validation
  - Created dedicated settings page accessible via user dashboard navigation
  - Implemented script generation access control - restricted to Pro ($27) and Unlimited ($99+) users only
  - Added tier-based UI visibility for script generation prompts with upgrade messaging
  - Enhanced generation usage information on home page explaining how content and script generations work
  - Updated backend API with Pro+ validation for script generation endpoints
  - Added clear subscription tier benefits explanation (Basic: content only, Pro+: content + scripts)
  - Users can now securely change passwords with current password verification
  - Script generation properly counts as 1 generation toward monthly limits
  - Provided intuitive upgrade paths for Basic users wanting script access

- June 16, 2025: Complete Access Control and Generation Management System
  - Implemented strict subscription enforcement at login level - users without active tags cannot access the app
  - Added prominent signup links (https://xautimarketingai.com/) throughout login and upgrade flows
  - Created comprehensive generation limit tracking with real-time remaining count display
  - Enhanced user dashboard showing subscription tier status (Basic $3/2 gens, Pro $27/10 gens, Unlimited $99+/∞)
  - Enforced generation limits at UI, API, and form submission levels with upgrade prompts
  - Updated webhook system to properly map HighLevel subscription tags to access tiers
  - Added generation usage tracking that increments when content is successfully completed
  - Implemented upgrade flow with options to upgrade plan or purchase additional generations ($7 each)
  - Created blocked form states and clear messaging for users who exceed their generation limits
  - RESOLVED: Fixed critical webhook tag mapping - users now correctly assigned to paid tiers instead of free tier
  - IMPLEMENTED: Real-time access control - removing HighLevel tags instantly revokes app access at next login
  - Enhanced signin endpoint with real-time tag verification and automatic subscription tier downgrade
  - Verified subscription tier mapping: $3→Basic, $27→Pro, $99+→Unlimited with proper generation limits
  - Confirmed immediate access revocation for users whose tags were removed from HighLevel CRM

- June 15, 2025: Tier-Based Subscription System with Usage Limits
  - Implemented comprehensive subscription management with 4 tiers: Free (0), $3 Basic (2), $27 Pro (10), $99+ Unlimited
  - Added Stripe payment integration for $7 per additional generation purchases
  - Created usage tracking and enforcement before content generation
  - Built subscription management API endpoints for HighLevel integration
  - Added tag-based user management for external system integration
  - Implemented automatic generation count increment on successful completion
  - Enhanced error handling with clear upgrade messaging for limit exceeded scenarios
  - Database schema expansion with subscription tiers, usage tracking, and payment records

- June 15, 2025: Epic Script Generator with Brand Tone Customization
  - Built comprehensive tone analysis system using OpenAI
  - Added option to use default warm/encouraging brand tone or custom user tone
  - Implemented automatic brand tone analysis from user writing examples
  - Created manual brand tone description option for advanced users
  - Added custom call-to-action integration for each script
  - Enhanced daily script generation with 7 unique content themes (motivation, tips, stories, insights, encouragement, reflection, vision)
  - Optimized scripts for Eleven Labs text-to-speech (30 seconds each)
  - Database integration for storing tone preferences and call-to-actions
  - Created comprehensive UI for tone setup and customization

- June 15, 2025: n8n Workflow Timeout Resolution and Google Drive Integration
  - Fixed server crashes caused by undefined variables in routes
  - Implemented polling-based system to handle long-running n8n workflows
  - Removed 2-minute timeout limitations - workflows can now run indefinitely
  - Added proper Google Drive file detection and download handling
  - Updated UI text to correctly show "30 days of content" instead of "5 days"
  - Users now get proper Google Drive CSV files with full 30-day content calendars
  - Improved error handling and user feedback during content generation

- June 15, 2025: Complete 30-day content streak system implementation
  - Removed AI Pics option - focused exclusively on 30-day content generation
  - Implemented name/email sign-in system with automatic user creation
  - Added content streak tracking showing "Day 1, Day 2, Day 3" progress
  - Created clean landing page for authentication
  - Updated home page with streak display and user info header
  - Modified backend to use single content workflow endpoint
  - Fixed all frontend errors and completed authentication flow
  - Users can now track daily content generation progress

- June 15, 2025: Database integration and CSV download resolution
  - Added PostgreSQL database with content request tracking
  - Created backend API proxy to handle CORS issues with n8n webhook
  - Resolved Google Drive CSV download by implementing direct download links
  - Fixed server errors and implemented robust error handling

- June 15, 2025: Initial setup with enhanced UI and n8n integration

## User Preferences

Preferred communication style: Simple, everyday language.