# Local Development Setup Guide

Complete guide to set up and run ModelSnapper.ai locally for testing and development.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **MongoDB** running locally or MongoDB Atlas account
- **Git** for cloning the repository

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd modelsnap

# Install dependencies
npm install
```

### 2. Environment Variables Setup

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all required values (see below for details).

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Environment Variables

### Required Variables

#### 1. Application Settings
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

#### 2. Clerk Authentication ⚠️ REQUIRED
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

**Setup Steps:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or use existing
3. Copy the keys from **API Keys** section
4. For webhook secret:
   - Go to **Webhooks** → **Endpoints**
   - Create endpoint: `http://localhost:3000/api/webhook/clerk`
   - Copy the **Signing Secret**

#### 3. MongoDB Database ⚠️ REQUIRED
```env
MONGO_URI=mongodb://localhost:27017/modelsnap
```

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# macOS: brew install mongodb-community
# Windows: Download from mongodb.com
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod

# Use connection string:
MONGO_URI=mongodb://localhost:27017/modelsnap
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user
4. Whitelist your IP (or `0.0.0.0/0` for development)
5. Get connection string:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/modelsnap?retryWrites=true&w=majority
```

#### 4. FASHN AI API ⚠️ REQUIRED
```env
FASHN_API_KEY=your_fashn_api_key
```

**Setup Steps:**
1. Go to [FASHN.ai](https://docs.fashn.ai)
2. Sign up for an account
3. Get your API key from dashboard
4. Add credits to your account

#### 5. Stripe Payments ⚠️ REQUIRED (for payments)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup Steps:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Use **Test Mode** for development
3. Get keys from **Developers** → **API keys**
4. For webhook:
   - Go to **Developers** → **Webhooks**
   - Add endpoint: `http://localhost:3000/api/webhook/stripe`
   - Use **ngrok** or **Stripe CLI** for local testing:
     ```bash
     # Install Stripe CLI
     stripe listen --forward-to localhost:3000/api/webhook/stripe
     ```
   - Copy the webhook signing secret

#### 6. Resend Email ⚠️ REQUIRED
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@modelsnap.ai
```

**Setup Steps:**
1. Go to [Resend](https://resend.com)
2. Sign up for free account
3. Get API key from **API Keys** section
4. Verify your domain (or use default for testing)

#### 7. AWS S3 Storage ⚠️ REQUIRED (for image storage)
```env
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

**Setup Steps:**
1. Go to [AWS Console](https://console.aws.amazon.com)
2. Create S3 bucket:
   - Name: `modelsnap-images` (or your choice)
   - Region: `us-east-1` (or your preference)
   - Block public access: **Uncheck** (or configure bucket policy)
3. Create IAM user with S3 permissions:
   - Go to **IAM** → **Users** → **Create User**
   - Attach policy: `AmazonS3FullAccess` (or custom policy)
   - Create access key
   - Copy **Access Key ID** and **Secret Access Key**

**S3 Bucket Policy (for public access):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

#### 8. Admin Access ⚠️ REQUIRED
```env
ADMIN_EMAILS=your-email@example.com
```

Add your email address (the one you use to sign in with Clerk) to get admin access.

### Optional Variables

#### AWS CloudFront CDN (Optional - for production)
```env
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

**Setup Steps:**
1. Create CloudFront distribution pointing to S3 bucket
2. Copy distribution domain
3. See `docs/CDN_SETUP.md` for detailed setup

#### Render Worker Secret (Optional)
```env
RENDER_WORKER_SECRET=your_secure_secret_here
```

Used for authenticating background worker endpoints. Generate a random string.

#### Analytics (Optional)
```env
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
POSTHOG_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com
```

## 🛠️ Configuration Steps

### Step 1: MongoDB Setup

**Local MongoDB:**
```bash
# Start MongoDB service
# macOS/Linux:
brew services start mongodb-community
# or
mongod --dbpath /path/to/data

# Windows:
# Start MongoDB service from Services panel
```

**MongoDB Atlas:**
- Create cluster (free tier available)
- Create database user
- Whitelist IP: `0.0.0.0/0` for development (⚠️ not for production)
- Get connection string

### Step 2: Clerk Setup

1. **Create Application:**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Create new application
   - Choose authentication methods (Email, Google, etc.)

2. **Configure Webhook:**
   - Go to **Webhooks** → **Endpoints**
   - Add endpoint: `http://localhost:3000/api/webhook/clerk`
   - For local testing, use **ngrok**:
     ```bash
     # Install ngrok
     npm install -g ngrok
     
     # Start tunnel
     ngrok http 3000
     
     # Use ngrok URL in Clerk webhook: https://xxxx.ngrok.io/api/webhook/clerk
     ```

3. **Copy Keys:**
   - Go to **API Keys**
   - Copy publishable and secret keys
   - Copy webhook signing secret

### Step 3: Stripe Setup

1. **Test Mode:**
   - Use test mode keys (start with `pk_test_` and `sk_test_`)

2. **Webhook Testing:**
   ```bash
   # Install Stripe CLI
   # macOS: brew install stripe/stripe-cli/stripe
   # Windows: Download from github.com/stripe/stripe-cli
   
   # Login
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```
   Copy the webhook secret from the CLI output.

### Step 4: AWS S3 Setup

1. **Create Bucket:**
   - Go to [S3 Console](https://s3.console.aws.amazon.com)
   - Create bucket: `modelsnap-images-dev`
   - Region: `us-east-1`
   - Uncheck "Block all public access" (or configure bucket policy)

2. **Create IAM User:**
   - Go to [IAM Console](https://console.aws.amazon.com/iam)
   - Create user: `modelsnap-s3-user`
   - Attach policy: `AmazonS3FullAccess`
   - Create access key
   - **Save credentials securely**

3. **Configure CORS (if needed):**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": []
     }
   ]
   ```

### Step 5: Resend Email Setup

1. **Create Account:**
   - Go to [Resend](https://resend.com)
   - Sign up (free tier available)

2. **Get API Key:**
   - Go to **API Keys**
   - Create new key
   - Copy key (starts with `re_`)

3. **Domain Setup (Optional):**
   - Add your domain for custom "from" email
   - Or use default for testing

## 🧪 Testing the Setup

### 1. Check Environment Variables

Visit `/setup` page (if implemented) or manually verify:

```bash
# Check if all required vars are set
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.MONGO_URI ? '✅ MONGO_URI' : '❌ MONGO_URI');"
```

### 2. Test Database Connection

```bash
# Start dev server
npm run dev

# Check MongoDB connection in logs
# Should see: "MongoDB connected successfully"
```

### 3. Test Authentication

1. Go to `http://localhost:3000`
2. Click "Sign In"
3. Create account or sign in
4. Should redirect to dashboard

### 4. Test Image Upload

1. Go to dashboard
2. Try uploading a garment image
3. Check S3 bucket for uploaded file

### 5. Test Render

1. Upload garment image
2. Select AI avatar
3. Click "Generate"
4. Should process and return rendered image

## 🔧 Troubleshooting

### MongoDB Connection Failed

**Error:** `MongoServerError: connection refused`

**Solutions:**
- Check MongoDB is running: `mongosh` or `mongo`
- Verify `MONGO_URI` is correct
- Check MongoDB port (default: 27017)
- For Atlas: Check IP whitelist includes your IP

### Clerk Authentication Not Working

**Error:** `401 Unauthorized`

**Solutions:**
- Verify keys are correct (no extra spaces)
- Check webhook secret matches
- Ensure webhook endpoint is accessible (use ngrok for local)

### S3 Upload Failed

**Error:** `Access Denied` or `Invalid credentials`

**Solutions:**
- Verify AWS credentials are correct
- Check IAM user has S3 permissions
- Verify bucket name is correct
- Check bucket region matches `AWS_REGION`

### Stripe Webhook Not Working

**Error:** Webhook events not received

**Solutions:**
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
- Or use ngrok: `ngrok http 3000` and update webhook URL in Stripe
- Verify webhook secret matches

### Images Not Loading

**Error:** Images return 403 or don't load

**Solutions:**
- Check S3 bucket is public or has correct bucket policy
- Verify CORS configuration
- Check CloudFront distribution (if using CDN)
- Verify image URLs are correct

## 📝 New Environment Variables Added

### Recently Added (Latest Features)

1. **AWS CloudFront CDN** (Optional)
   ```env
   AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
   ```
   - For CDN image delivery
   - Improves global performance
   - See `docs/CDN_SETUP.md` for setup

2. **Render Worker Secret** (Optional)
   ```env
   RENDER_WORKER_SECRET=your_secure_secret_here
   ```
   - For batch rendering worker authentication
   - Used by cron jobs or scheduled tasks

3. **Resend From Email** (Optional)
   ```env
   RESEND_FROM_EMAIL=noreply@modelsnap.ai
   ```
   - Default "from" email address
   - Falls back to `noreply@modelsnap.ai` if not set

### All Environment Variables Summary

**Required:**
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk frontend key
- `CLERK_SECRET_KEY` - Clerk backend key
- `CLERK_WEBHOOK_SIGNING_SECRET` - Clerk webhook secret
- `MONGO_URI` - MongoDB connection string
- `FASHN_API_KEY` - FASHN AI API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `RESEND_API_KEY` - Resend email API key
- `AWS_REGION` - AWS region
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `ADMIN_EMAILS` - Admin email addresses

**Optional:**
- `AWS_CLOUDFRONT_DOMAIN` - CloudFront CDN domain ⭐ NEW
- `AWS_S3_PUBLIC_URL` - Custom CDN URL
- `RESEND_FROM_EMAIL` - Email "from" address ⭐ NEW
- `RENDER_WORKER_SECRET` - Worker authentication ⭐ NEW
- `LEMON_SQUEEZY_API_KEY` - Lemon Squeezy API key
- `LEMON_SQUEEZY_STORE_ID` - Lemon Squeezy store ID
- `LEMON_SQUEEZY_WEBHOOK_SECRET` - Lemon Squeezy webhook secret
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` - Google Analytics ID
- `POSTHOG_KEY` - PostHog analytics key
- `POSTHOG_HOST` - PostHog host URL

## 🎯 Quick Checklist

Before running the app, ensure:

- [ ] `.env.local` file created
- [ ] All required environment variables set
- [ ] MongoDB running (local or Atlas)
- [ ] Clerk application created and keys copied
- [ ] Stripe test account set up
- [ ] Resend account created and API key copied
- [ ] AWS S3 bucket created and credentials configured
- [ ] Admin email added to `ADMIN_EMAILS`
- [ ] Dependencies installed (`npm install`)

## 🚀 Start Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and start testing!

## 📚 Additional Resources

- **Clerk Docs**: https://clerk.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **AWS S3**: https://docs.aws.amazon.com/s3
- **Resend**: https://resend.com/docs
- **FASHN.ai**: https://docs.fashn.ai

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review error logs in terminal
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
5. Ensure all services are running and accessible

