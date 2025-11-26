Migrate our Stripe integration to LemonSqueezy.

Requirements:
- Replace Stripe customer creation with LemonSqueezy API call
- Replace Stripe checkout session creation with LemonSqueezy checkout URL generation
- Update webhook handling to handle LemonSqueezy events:
  - invoice.payment_succeeded → add AI credits
  - subscription.created / updated → update plan
  - subscription.canceled → downgrade plan
- Update database schema: add gateway="lemonsqueezy", lemonCustomerId, subscriptionId
- Keep Stripe branch for reference, new branch is lemonsqueezy-integration
- Update all payment and subscription logic to use LemonSqueezy instead of Stripe
- Test flow: user signup, checkout, webhook processing, AI credits, plan updates, cancel flow
- Output full migration code in Next.js API route style, compatible with existing MongoDB models
