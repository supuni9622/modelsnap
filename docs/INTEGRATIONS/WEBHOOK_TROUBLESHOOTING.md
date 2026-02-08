# Webhook Troubleshooting Guide

## Issue: Users Not Created in MongoDB After Signup

If users sign up with Clerk but don't appear in MongoDB, follow these steps:

## 1. Check Webhook Configuration

### Verify Webhook Endpoint in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** → **Endpoints**
3. Check if webhook endpoint is configured:
   - **Production**: `https://your-domain.com/api/webhook/clerk`
   - **Local Development**: Use ngrok (see below)

### For Local Development

You need to expose your local server to Clerk:

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Add webhook in Clerk: https://abc123.ngrok.io/api/webhook/clerk
```

## 2. Check Webhook Secret

Verify `CLERK_WEBHOOK_SIGNING_SECRET` is set correctly:

```env
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

**Get from**: Clerk Dashboard → Webhooks → Endpoints → Signing Secret

## 3. Check Webhook Logs

### In Clerk Dashboard

1. Go to **Webhooks** → **Endpoints**
2. Click on your webhook endpoint
3. Check **Recent Deliveries** tab
4. Look for:
   - ✅ **Success** (200 status)
   - ❌ **Failed** (400/500 status)
   - ⏱️ **Pending** (not delivered yet)

### In Your Application Logs

Check your terminal/console for:
- `📨 Received webhook event: user.created`
- `✅ User created successfully: <user-id>`
- `❌ Error in handleUserCreated: <error>`

## 4. Test Webhook Manually

### Using Clerk Dashboard

1. Go to **Webhooks** → **Endpoints**
2. Click **Send Test Event**
3. Select `user.created` event
4. Check if webhook receives and processes it

### Check Server Logs

After sending test event, check your logs for:
```
🔵 Processing user.created event: { id: '...', email: '...' }
✅ User created in MongoDB: ...
✅ User created successfully: ...
```

## 5. Common Issues and Solutions

### Issue: Webhook Not Receiving Events

**Symptoms:**
- No logs in application
- No deliveries in Clerk dashboard

**Solutions:**
- Verify webhook URL is correct
- Check if webhook is enabled in Clerk
- For local: Ensure ngrok is running and URL is updated
- Check firewall/network blocking webhook requests

### Issue: Webhook Verification Fails

**Symptoms:**
- `Error: Verification error` in logs
- 400 status in Clerk dashboard

**Solutions:**
- Verify `CLERK_WEBHOOK_SIGNING_SECRET` matches Clerk dashboard
- Check if secret was regenerated (need to update env var)
- Ensure webhook URL is correct

### Issue: User Creation Fails

**Symptoms:**
- Webhook received but user not created
- Error logs in application

**Solutions:**
- Check MongoDB connection
- Verify database permissions
- Check for duplicate user errors
- Review error logs for specific issues

### Issue: User Created But Missing Data

**Symptoms:**
- User exists but fields are empty/null

**Solutions:**
- Check if Clerk user has required data (email, name)
- Verify webhook payload structure
- Check for errors in data mapping

## 6. Fallback Mechanism

If webhook fails, the application has a fallback:

### Automatic Fallback

When a user tries to access `/api/app` and doesn't exist:
- System automatically creates user from Clerk data
- User is created with default "free" plan
- Check logs for: `⚠️ User not found in database, attempting fallback creation`

### Manual Fallback

Call the fallback endpoint manually:

```bash
POST /api/user/create-if-missing
Authorization: Bearer <clerk-session-token>
```

## 7. Debugging Steps

### Step 1: Enable Detailed Logging

Check your application logs for:
- Webhook receipt
- Event processing
- User creation
- Errors

### Step 2: Check Database

```javascript
// In MongoDB shell or Compass
db.users.find({ id: "<clerk-user-id>" })
```

### Step 3: Test Webhook Endpoint

```bash
# Test webhook endpoint is accessible
curl -X POST http://localhost:3000/api/webhook/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: test" \
  -d '{"type":"user.created","data":{"id":"test"}}'
```

### Step 4: Verify Environment Variables

```bash
# Check if webhook secret is set
echo $CLERK_WEBHOOK_SIGNING_SECRET

# Should output: whsec_...
```

## 8. Production Checklist

- [ ] Webhook endpoint configured in Clerk
- [ ] Webhook secret set in environment variables
- [ ] Webhook URL is publicly accessible
- [ ] Recent deliveries show success (200)
- [ ] Users are being created in MongoDB
- [ ] Fallback mechanism is working

## 9. Still Having Issues?

1. **Check Clerk Dashboard** for webhook delivery status
2. **Review Application Logs** for errors
3. **Test with ngrok** for local development
4. **Verify Environment Variables** are correct
5. **Check MongoDB Connection** is working
6. **Review Error Messages** in logs for specific issues

## 10. Quick Fix: Use Fallback

If webhook isn't working, users will be automatically created when they:
- Sign in and access the app
- Call `/api/app` endpoint
- Access any protected route

The fallback creates users on-demand from Clerk data.

