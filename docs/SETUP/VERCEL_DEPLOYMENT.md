# Vercel Deployment Guide for ModelSnapper.ai

This guide will help you deploy ModelSnapper.ai to Vercel successfully.

## ✅ Pre-Deployment Checklist

### 1. Files Ready
- [x] `vercel.json` - Vercel configuration file
- [x] `next.config.ts` - Next.js configuration (production-ready)
- [x] `package.json` - Build scripts configured
- [x] `.gitignore` - Excludes sensitive files

### 2. Code Ready
- [x] TypeScript compiles without errors
- [x] No critical linting errors
- [x] Build succeeds locally (`npm run build`)

## 🚀 Deployment Steps

### Step 1: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub/GitLab repository
4. Vercel will auto-detect Next.js framework

### Step 2: Configure Build Settings

Vercel should auto-detect these settings, but verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)
- **Root Directory**: `./` (if repo is at root)

### Step 3: Add Environment Variables

**⚠️ CRITICAL**: Add ALL these environment variables in Vercel Dashboard → Project Settings → Environment Variables

#### Required Environment Variables

```env
# ============================================
# CLERK AUTHENTICATION (Required)
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
CLERK_SECRET_KEY=sk_live_... (or sk_test_...)
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# ============================================
# DATABASE (Required)
# ============================================
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
MONGODB_DATABASE=model_snap_production (optional, defaults to model_snap_local)

# ============================================
# FASHN AI API (Required)
# ============================================
FASHN_API_KEY=your_fashn_api_key_here

# ============================================
# EMAIL SERVICES (Required)
# ============================================
RESEND_API_KEY=re_...

# ============================================
# PAYMENTS - Stripe (Required if using Stripe)
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# PAYMENTS - Lemon Squeezy (Required if using Lemon Squeezy)
# ============================================
LEMONSQUEEZY_API_KEY=your_api_key
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret

# ============================================
# APPLICATION SETTINGS (Required)
# ============================================
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production

# ============================================
# ADMIN ACCESS (Optional but Recommended)
# ============================================
ADMIN_EMAILS=admin@yourdomain.com,another@yourdomain.com

# ============================================
# OPTIONAL SERVICES
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Step 4: Configure Webhooks

After deployment, update webhook URLs in external services:

#### Clerk Webhook
1. Go to Clerk Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/webhook/clerk`
3. Copy the signing secret → Add to `CLERK_WEBHOOK_SIGNING_SECRET`

#### Stripe Webhook (if using Stripe)
1. Go to Stripe Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/webhook/stripe`
3. Copy the signing secret → Add to `STRIPE_WEBHOOK_SECRET`

#### Lemon Squeezy Webhook (if using Lemon Squeezy)
1. Go to Lemon Squeezy Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/webhook/lemonsqueezy`
3. Copy the signing secret → Add to `LEMONSQUEEZY_WEBHOOK_SECRET`

### Step 5: MongoDB Atlas Configuration

1. **Whitelist Vercel IPs**: 
   - MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` (allows all IPs) OR add Vercel's IP ranges
   - For production, consider restricting to Vercel IPs only

2. **Database User**:
   - Ensure database user has read/write permissions
   - Use strong password in connection string

3. **Connection String**:
   - Use MongoDB Atlas connection string format
   - Include database name in connection string or use `MONGODB_DATABASE` env var

### Step 6: Deploy

1. Click **"Deploy"** in Vercel
2. Wait for build to complete
3. Check build logs for any errors
4. Visit your deployed site

## 🔍 Post-Deployment Verification

### 1. Test Landing Page
- [ ] Landing page loads correctly
- [ ] All sections render properly
- [ ] Images load correctly
- [ ] Navigation works

### 2. Test Authentication
- [ ] Can sign up
- [ ] Can sign in
- [ ] Session persists
- [ ] Can sign out

### 3. Test Platform Features
- [ ] Can access `/app` when signed in
- [ ] Avatar selector loads avatars
- [ ] Can upload garment image
- [ ] Render flow works (if FASHN API is configured)

### 4. Test Admin Dashboard
- [ ] Admin can access `/admin`
- [ ] Non-admin users are redirected
- [ ] User management works
- [ ] Subscription management works

### 5. Test API Endpoints
- [ ] `/api/avatars` returns avatar list
- [ ] `/api/render` works (requires authentication)
- [ ] `/api/admin/*` requires admin access

## 🐛 Troubleshooting

### Build Fails

**Error: TypeScript errors**
```bash
# Fix locally first
npx tsc --noEmit
npm run lint
```

**Error: Missing environment variables**
- Check Vercel dashboard → Environment Variables
- Ensure all required variables are set
- Check variable names match exactly (case-sensitive)

**Error: MongoDB connection failed**
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas IP whitelist
- Verify database user permissions

### Runtime Errors

**Error: 401 Unauthorized**
- Check Clerk keys are set correctly
- Verify webhook signing secret
- Check Clerk dashboard for webhook delivery

**Error: FASHN API errors**
- Verify `FASHN_API_KEY` is set
- Check API key is valid and has credits
- Review FASHN API logs

**Error: Images not loading**
- Check `next.config.ts` has correct `remotePatterns`
- Verify image URLs are accessible
- Check CORS settings on image sources

### Performance Issues

**Slow page loads**
- Check Vercel function regions (currently set to `iad1`)
- Consider using edge functions for static content
- Optimize images (already configured in `next.config.ts`)

## 📝 Environment Variable Reference

### Production vs Development

For **Production**:
- Use `pk_live_` and `sk_live_` keys (Clerk, Stripe)
- Use production MongoDB database
- Set `NEXT_PUBLIC_APP_URL` to your production domain

For **Preview/Staging**:
- Can use test keys
- Use staging database
- Set `NEXT_PUBLIC_APP_URL` to preview URL

### Vercel Environment Variable Settings

In Vercel Dashboard:
1. Go to Project → Settings → Environment Variables
2. Add variables for:
   - **Production** (main branch)
   - **Preview** (all other branches)
   - **Development** (local development)

## 🔐 Security Checklist

- [ ] All secrets are in environment variables (not in code)
- [ ] `.env.local` is in `.gitignore`
- [ ] Production keys are different from development keys
- [ ] Webhook secrets are set correctly
- [ ] MongoDB connection string doesn't expose credentials in logs
- [ ] Admin emails are set correctly

## 📊 Monitoring

After deployment, monitor:
- Vercel function logs
- MongoDB connection health
- API response times
- Error rates
- User sign-ups and renders

## 🎉 Success!

Once deployed, your ModelSnapper.ai MVP will be live at:
`https://your-project.vercel.app`

## Next Steps

1. Set up custom domain (optional)
2. Configure analytics
3. Set up monitoring and alerts
4. Test all features end-to-end
5. Share with beta users!

---

**Need Help?**
- Check Vercel logs: Project → Deployments → Click deployment → View Function Logs
- Check MongoDB Atlas logs
- Review error messages in browser console
- Check API response status codes

