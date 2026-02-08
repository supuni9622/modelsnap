# Environment Variables Reference

Complete reference for all environment variables used in ModelSnapper.ai.

## 📋 Quick Reference

### Required Variables (Minimum to Run)

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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# Admin
ADMIN_EMAILS=your-email@example.com
```

## 🔑 Detailed Variable List

### Application Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | `http://localhost:3000` | Application base URL |
| `NODE_ENV` | ❌ No | `development` | Node environment (development/production) |

### Clerk Authentication

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | Clerk publishable key (frontend) |
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk secret key (backend) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | ✅ Yes | Clerk webhook signing secret |

**Get from:** https://dashboard.clerk.com → API Keys

### Database (MongoDB)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ Yes | MongoDB connection string |

**Examples:**
- Local: `mongodb://localhost:27017/modelsnap`
- Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/modelsnap?retryWrites=true&w=majority`

### FASHN AI API

| Variable | Required | Description |
|----------|----------|-------------|
| `FASHN_API_KEY` | ✅ Yes | FASHN AI API key for virtual try-on |

**Get from:** https://docs.fashn.ai

### Stripe Payments

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Yes | Stripe publishable key (frontend) |
| `STRIPE_SECRET_KEY` | ✅ Yes | Stripe secret key (backend) |
| `STRIPE_WEBHOOK_SECRET` | ✅ Yes | Stripe webhook signing secret |

**Get from:** https://dashboard.stripe.com → Developers → API keys

### Lemon Squeezy Payments (Optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `LEMON_SQUEEZY_API_KEY` | ❌ No | Lemon Squeezy API key |
| `LEMON_SQUEEZY_STORE_ID` | ❌ No | Lemon Squeezy store ID |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | ❌ No | Lemon Squeezy webhook secret |

**Get from:** https://app.lemonsqueezy.com/settings/api

### Email Services (Resend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | ✅ Yes | - | Resend API key |
| `RESEND_FROM_EMAIL` | ❌ No | `noreply@modelsnap.ai` | Default "from" email address ⭐ NEW |

**Get from:** https://resend.com/api-keys

### AWS S3 Storage

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_REGION` | ✅ Yes | AWS region (e.g., `us-east-1`) |
| `AWS_S3_BUCKET_NAME` | ✅ Yes | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | ✅ Yes | AWS IAM access key ID |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes | AWS IAM secret access key |

**Get from:** https://console.aws.amazon.com/iam → Users → Access keys

### AWS CloudFront CDN ⭐ NEW

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_CLOUDFRONT_DOMAIN` | ❌ No | CloudFront distribution domain (without https://) |
| `AWS_S3_PUBLIC_URL` | ❌ No | Custom CDN URL (alternative to CloudFront) |

**Example:** `d1234567890.cloudfront.net`

**Setup:** See `docs/CDN_SETUP.md`

### Admin Access

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_EMAILS` | ❌ No | Comma-separated admin email addresses |

**Example:** `admin@example.com,another@example.com`

**Note:** Emails must match Clerk user emails

### Render Worker ⭐ NEW

| Variable | Required | Description |
|----------|----------|-------------|
| `RENDER_WORKER_SECRET` | ❌ No | Secret key for worker endpoint authentication |

**Use:** For batch rendering worker authentication (cron jobs, scheduled tasks)

**Generate:** Random secure string (e.g., `openssl rand -hex 32`)

### Analytics (Optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | ❌ No | Google Analytics tracking ID |
| `POSTHOG_KEY` | ❌ No | PostHog analytics key |
| `POSTHOG_HOST` | ❌ No | PostHog host URL |

## 🆕 Newly Added Variables

### Latest Features (Recently Added)

1. **`AWS_CLOUDFRONT_DOMAIN`** ⭐
   - **Purpose**: CloudFront CDN domain for global image delivery
   - **Required**: No (optional for production)
   - **Example**: `d1234567890.cloudfront.net`
   - **When to use**: Production deployment for better performance

2. **`RESEND_FROM_EMAIL`** ⭐
   - **Purpose**: Default "from" email address for notifications
   - **Required**: No (defaults to `noreply@modelsnap.ai`)
   - **Example**: `noreply@modelsnap.ai`
   - **When to use**: Customize sender email address

3. **`RENDER_WORKER_SECRET`** ⭐
   - **Purpose**: Authentication for render worker endpoint
   - **Required**: No (only if using batch rendering worker)
   - **Example**: `your_secure_secret_here`
   - **When to use**: When setting up cron jobs or scheduled tasks for batch processing

## 📝 Complete .env.local Template

```env
# ============================================
# APPLICATION SETTINGS
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ============================================
# CLERK AUTHENTICATION (Required)
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# ============================================
# DATABASE (Required)
# ============================================
MONGO_URI=mongodb://localhost:27017/modelsnap

# ============================================
# FASHN AI API (Required)
# ============================================
FASHN_API_KEY=your_fashn_api_key

# ============================================
# STRIPE PAYMENTS (Required)
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# EMAIL SERVICES (Required)
# ============================================
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@modelsnap.ai

# ============================================
# AWS S3 STORAGE (Required)
# ============================================
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# ============================================
# AWS CLOUDFRONT CDN (Optional - Production)
# ============================================
AWS_CLOUDFRONT_DOMAIN=

# ============================================
# ADMIN ACCESS (Required)
# ============================================
ADMIN_EMAILS=your-email@example.com

# ============================================
# RENDER WORKER (Optional)
# ============================================
RENDER_WORKER_SECRET=

# ============================================
# ANALYTICS (Optional)
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
POSTHOG_KEY=
POSTHOG_HOST=
```

## 🔍 Validation

Environment variables are validated on startup. Check validation:

1. Visit `/setup` page (if implemented)
2. Or check server logs for validation errors
3. Use `lib/env-checker.ts` functions programmatically

## 🚨 Common Issues

### Missing Required Variables

**Error:** `Environment variable X is not set`

**Solution:** Add variable to `.env.local` and restart dev server

### Invalid Format

**Error:** `Invalid format for variable X`

**Solution:** Check variable format matches examples above

### Webhook Secrets

**Error:** Webhooks not working

**Solution:** 
- Use ngrok for local testing: `ngrok http 3000`
- Update webhook URL in service dashboard
- Copy new webhook secret

## 📚 Related Documentation

- **Local Setup Guide**: `docs/LOCAL_SETUP_GUIDE.md`
- **CDN Setup**: `docs/CDN_SETUP.md`
- **Deployment Guide**: `VERCEL_DEPLOYMENT.md`

