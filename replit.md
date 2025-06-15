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

- June 15, 2025: Database integration completed
  - Added PostgreSQL database with content request tracking
  - Created backend API proxy to handle CORS issues with n8n webhook
  - Database stores all content generation requests with status tracking
  - Fixed direct webhook calls by routing through backend `/api/content-generate`

- June 15, 2025: Initial setup with enhanced UI and n8n integration

## User Preferences

Preferred communication style: Simple, everyday language.