# ModelSnap.ai MVP Testing Checklist

Use this checklist to verify all MVP features are working correctly.

## Prerequisites

- [ ] All environment variables are set in `.env.local`
- [ ] MongoDB is connected and accessible
- [ ] Clerk authentication is configured
- [ ] FASHN API key is valid
- [ ] Admin emails are set in `ADMIN_EMAILS`

## 1. Landing Page Tests

### Navigation & UI
- [ ] Landing page loads without errors
- [ ] Hero section displays correctly
- [ ] "Get Early Access" button scrolls to pricing section
- [ ] "Try Demo" button scrolls to demo section
- [ ] All sections render (Problem, Sri Lanka, Solution, Gallery, Demo, Advantage, Pricing, Traction, Roadmap, Team)
- [ ] Gallery hover preview works (if implemented)
- [ ] Pricing cards display correctly
- [ ] Checkout buttons are visible on pricing cards

### Responsive Design
- [ ] Page is responsive on mobile
- [ ] Page is responsive on tablet
- [ ] Page is responsive on desktop

## 2. Authentication Tests

### Sign Up
- [ ] Can create a new account via Clerk
- [ ] User is redirected after sign up
- [ ] User data is saved to MongoDB

### Sign In
- [ ] Can sign in with existing account
- [ ] Session persists after page refresh
- [ ] Can sign out successfully

## 3. Business Owner Platform Tests

### Avatar Selection
- [ ] `/app` page loads for authenticated users
- [ ] Avatar selector displays avatars from MongoDB
- [ ] Can filter avatars by gender
- [ ] Can filter avatars by body type
- [ ] Can filter avatars by skin tone
- [ ] Avatar images load correctly

### Garment Upload
- [ ] Upload component displays
- [ ] Can drag and drop image file
- [ ] Can click to select image file
- [ ] File validation works (file type, size)
- [ ] Upload progress indicator works
- [ ] Uploaded image preview displays

### Render Flow
- [ ] Can select an avatar
- [ ] Can upload a garment image
- [ ] "Render" button is enabled when both are selected
- [ ] Render request is sent to API
- [ ] Loading state displays during render
- [ ] Rendered image displays after completion
- [ ] Can download rendered image
- [ ] Credits are deducted correctly
- [ ] Error handling works (insufficient credits, API errors)

### Render History
- [ ] Render history page loads
- [ ] Past renders are displayed
- [ ] Can view render details
- [ ] Can download past renders
- [ ] Pagination works (if implemented)

## 4. Admin Dashboard Tests

### Access Control
- [ ] Non-admin users cannot access `/admin`
- [ ] Non-admin users are redirected from `/admin`
- [ ] Admin users can access `/admin`
- [ ] Admin layout displays correctly

### User Management
- [ ] `/admin/users` page loads
- [ ] User list displays correctly
- [ ] Can view user details
- [ ] Can adjust user credits
- [ ] Pagination works (if implemented)

### Subscription Management
- [ ] `/admin/subscriptions` page loads
- [ ] Subscription list displays correctly
- [ ] Can view subscription details
- [ ] Can update subscription status
- [ ] Bank transfer approval workflow works

## 5. API Endpoint Tests

### Avatar API
- [ ] `GET /api/avatars` returns avatar list
- [ ] Response includes all required fields
- [ ] Filtering works via query parameters

### Render API
- [ ] `POST /api/render` requires authentication
- [ ] Credit check works
- [ ] FASHN API integration works
- [ ] Render is saved to database
- [ ] Credits are deducted atomically
- [ ] Error responses are correct

### Render History API
- [ ] `GET /api/render/history` requires authentication
- [ ] Returns user's render history
- [ ] Pagination works

### Admin APIs
- [ ] `GET /api/admin/users` requires admin access
- [ ] `GET /api/admin/subscriptions` requires admin access
- [ ] `PATCH /api/admin/subscriptions` requires admin access

## 6. Database Tests

### Connection
- [ ] MongoDB connection works
- [ ] Database name is correct (`model_snap_local` or configured name)
- [ ] Avatars are in database (31 avatars)

### Data Integrity
- [ ] User data is saved correctly
- [ ] Render data is saved correctly
- [ ] Credit transactions are atomic

## 7. Error Handling Tests

### Network Errors
- [ ] Handles FASHN API failures gracefully
- [ ] Handles MongoDB connection failures gracefully
- [ ] Displays user-friendly error messages

### Validation Errors
- [ ] File upload validation works
- [ ] Form validation works
- [ ] API parameter validation works

## 8. Performance Tests

### Page Load
- [ ] Landing page loads quickly
- [ ] Platform pages load quickly
- [ ] Images load efficiently

### API Response Times
- [ ] Avatar API responds quickly
- [ ] Render API responds within acceptable time
- [ ] Admin APIs respond quickly

## 9. Browser Compatibility

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

## 10. Security Tests

### Authentication
- [ ] Protected routes require authentication
- [ ] Admin routes require admin access
- [ ] Session expires correctly

### API Security
- [ ] API routes validate authentication
- [ ] API routes validate permissions
- [ ] Rate limiting works (if implemented)

## Common Issues to Check

1. **Environment Variables**: Ensure all required env vars are set
2. **MongoDB Connection**: Check connection string and IP whitelist
3. **Clerk Configuration**: Verify webhook URLs and keys
4. **FASHN API**: Test API key and check credits
5. **Image Loading**: Check if avatar images are accessible
6. **Build Errors**: Run `npm run build` to check for build issues

## Quick Test Commands

```bash
# Check environment variables
npm run dev  # Should start without errors

# Check build
npm run build

# Run linter
npm run lint

# Run tests
npm test
```

## Notes

- Test with a real FASHN API key to verify render flow
- Test with multiple user accounts to verify isolation
- Test admin access with email from `ADMIN_EMAILS`
- Monitor browser console for errors
- Monitor server logs for API errors

