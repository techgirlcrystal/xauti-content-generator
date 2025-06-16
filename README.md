# Xauti Content Generator

Enhanced content generation platform leveraging n8n workflows to provide intelligent, streamlined content creation for digital marketers and content professionals.

## 🚀 Features

### Content Generation
- **30-Day Content Calendars**: Generate comprehensive monthly content plans
- **Script Generation**: Create optimized scripts for video content and podcasts
- **Google Drive Integration**: Automatic CSV export and cloud storage
- **Real-time Processing**: Live progress tracking with polling-based workflows

### Payment & Subscription System
- **Stripe Integration**: Secure payment processing with tier-based pricing
- **Multiple Subscription Tiers**: Free, Basic ($3), Pro ($27), Unlimited ($99+)
- **Generation Limits**: Enforced usage tracking with automatic balance updates
- **Webhook Processing**: Real-time payment confirmation and account crediting

### User Management
- **Authentication System**: Secure login with password management
- **HighLevel CRM Integration**: Tag-based subscription management
- **Usage Tracking**: Real-time generation count and streak monitoring
- **Access Control**: Tier-based feature restrictions

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **shadcn/ui** components built on Radix UI
- **Tailwind CSS** for styling
- **Wouter** for client-side routing
- **TanStack React Query** for server state management
- **Vite** for development and production builds

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **Neon Database** (serverless PostgreSQL)
- **Stripe API** for payment processing
- **OpenAI API** for content generation
- **n8n Workflow** integration

### Infrastructure
- **PostgreSQL** database with session storage
- **Environment-based** configuration
- **Webhook** processing for real-time updates
- **CORS** and security middleware

## 📋 Installation

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Stripe account with API keys
- OpenAI API key

### Setup
1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/xauti-content-generator.git
cd xauti-content-generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example environment file
cp .env.example .env

# Add your API keys and database URL
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

4. Initialize database:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

## 🏗 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route components
│   │   ├── lib/           # Utilities and API client
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
└── package.json         # Dependencies and scripts
```

## 🔧 API Endpoints

### Authentication
- `POST /api/signin` - User authentication
- `POST /api/signup` - User registration

### Content Generation
- `POST /api/generate-content` - Start content generation workflow
- `POST /api/generate-scripts` - Create script content (Pro+ only)
- `GET /api/content-request/:id` - Check generation status

### Payments
- `POST /api/purchase-generations` - Create content generation payment
- `POST /api/purchase-script-generations` - Create script generation payment
- `POST /api/get-checkout-url` - Get Stripe checkout URL
- `POST /api/stripe-webhook` - Process payment confirmations

### User Management
- `GET /api/user` - Get current user data
- `POST /api/change-password` - Update user password
- `POST /api/webhook/subscription` - HighLevel CRM integration

## 💳 Pricing Structure

### Subscription Tiers
- **Free**: 0 generations/month
- **Basic ($3)**: 2 generations/month (content only)
- **Pro ($27)**: 10 generations/month (content + scripts)
- **Unlimited ($99+)**: Unlimited generations

### Additional Purchases
- **Content Generations**: $7 each (all tiers)
- **Script Generations**: $10 (Basic), $7 (Pro+)

## 🔒 Security Features

- **Environment Variable Protection**: Sensitive data stored securely
- **CORS Configuration**: Cross-origin request protection
- **Session Management**: PostgreSQL-backed sessions
- **Input Validation**: Zod schema validation
- **Webhook Verification**: Stripe signature validation

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Setup
Ensure all environment variables are configured:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLIC_KEY`

## 📊 Recent Updates

### June 16, 2025: Server-Side Stripe Integration
- Resolved checkout redirect failures
- Implemented server-side URL generation
- Added new tab checkout flow
- Enhanced webhook processing

### June 16, 2025: Tier-Based Pricing System
- Script generation access control (Pro+ only)
- Dynamic pricing based on subscription tier
- Comprehensive generation limit enforcement
- Real-time balance tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and inquiries, please contact the development team or visit [xautimarketingai.com](https://xautimarketingai.com/).

---

**Built with ❤️ for content creators and digital marketers**