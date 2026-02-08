# ModelSnapper.ai - AI Fashion Photography Platform

AI-powered fashion photography platform for Sri Lankan fashion brands. Upload clothing, select AI models, and get studio-quality photos in minutes.

## 🚀 Features

- **AI Clothing Renders**: Upload clothing and render it on AI-generated Sri Lankan models
- **Avatar Gallery**: 32 pre-generated Sri Lankan avatars (4 body types × 4 skin tones × 2 genders)
- **Credit System**: Pay-per-render with subscription plans
- **Render History**: Track all your renders with download links
- **Admin Dashboard**: User management and subscription handling
- **Landing Page**: Complete marketing site with hero, gallery, pricing, and more

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Payments**: Stripe
- **AI API**: FASHN.ai for virtual try-on
- **Email**: Resend
- **Testing**: Playwright
- **Deployment**: Vercel ready
-**AWS S3** : Image storage

## 🛠️ Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd modelsnap
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env.local
```

**📚 For complete setup instructions, see:**
- **Quick Setup**: `docs/LOCAL_SETUP_GUIDE.md`
- **Environment Variables**: `docs/ENVIRONMENT_VARIABLES.md`

**Required environment variables:**

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Database
MONGO_URI=mongodb://localhost:27017/modelsnap

# FASHN AI API
FASHN_API_KEY=your_fashn_api_key

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@modelsnap.ai

# AWS S3 Storage
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# Admin Access
ADMIN_EMAILS=admin@example.com

# Optional - CDN (for production)
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# Optional - Render Worker
RENDER_WORKER_SECRET=your_secure_secret
```

### 4. Generate Avatar Gallery

Run the avatar generation script to create the 32 Sri Lankan avatars:

```bash
npx tsx scripts/generate-avatars.ts
```

This will:
- Generate 32 avatars using FASHN API
- Save them to `public/avatars/`
- Create `public/avatars/avatarMap.json` for frontend mapping

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
├── app/                          # Next.js app directory
│   ├── [locale]/                # Internationalized routes
│   │   ├── (guest)/            # Public routes (landing page)
│   │   ├── (platform)/        # Authenticated routes
│   │   └── (auth)/            # Authentication pages
│   └── api/                    # API routes
│       ├── render/             # Render API (server-side)
│       ├── avatars/            # Avatar listing API
│       ├── upload/             # File upload API
│       └── admin/              # Admin APIs
├── components/
│   ├── platform/              # Platform components
│   │   ├── upload/           # Upload component
│   │   ├── avatar/           # Avatar selector
│   │   ├── render/           # Render interface
│   │   └── history/          # Render history
│   └── landing/              # Landing page sections
├── lib/
│   ├── fashn.ts              # FASHN API client
│   ├── analytics.ts          # Google Analytics
│   └── config/               # Configuration
├── models/                    # Database models
│   ├── user.ts               # User model
│   ├── avatar.ts             # Avatar model
│   └── render.ts             # Render model
├── scripts/
│   └── generate-avatars.ts   # Avatar generation script
└── tests/                     # Playwright tests
```

## 🎨 Rendering Pipeline

The rendering process follows a strict server-side pipeline (AGENTS.md rule 6):

1. **Credit Check**: Verify user has sufficient credits
2. **Validation**: Validate garment upload (file type, size)
3. **FASHN API Call**: Process virtual try-on
4. **Database Save**: Save render record atomically
5. **Credit Deduction**: Deduct credits from user
6. **Return Result**: Return rendered image URL

All rendering logic runs server-side for security and consistency.

## 💳 Pricing Plans

- **Free**: 3 watermarked renders
- **Starter** (LKR 2,000/mo): 50 renders per month
- **Growth** (LKR 4,500/mo): 150 renders per month

Configure pricing in `lib/config/pricing.ts`.

## 🧪 Testing

Run Playwright tests:

```bash
npm test              # Run all tests
npm run test:ui       # Run tests with UI
```

Test files are in the `tests/` directory:
- `example.spec.ts` - Basic landing page tests
- `upload.spec.ts` - Upload component tests
- `avatar-selector.spec.ts` - Avatar selector tests
- `render-flow.spec.ts` - Complete render flow integration tests

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Deploy

### CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:
- Linting and type checking
- Build verification
- Playwright tests

## 📚 Documentation

- `docs/PRD.md` - Product Requirements Document
- `docs/FASHIONAI_GUIDE.md` - FASHN API integration guide
- `docs/LANDING_PAGE_GUIDE.md` - Landing page design guide
- `ROADMAP.md` - Implementation roadmap and progress

## 🔐 Admin Access

Admin access is controlled via the `ADMIN_EMAILS` environment variable. Add comma-separated email addresses:

```env
ADMIN_EMAILS=admin@example.com,another@example.com
```

Admins can:
- View and manage all users
- Adjust user credits
- Update subscription plans

## 🤝 Support

For issues and questions:
1. Check the documentation in the `docs/` folder
2. Review `ROADMAP.md` for implementation status
3. Open an issue on GitHub

## 📄 License

This project is licensed under the MIT License.
