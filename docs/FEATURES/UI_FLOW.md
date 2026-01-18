Here we are going to implement the UI-platform flow of modelsnap application. (platform) directory is where the protected routes exists. @/app/[locale]/(platform)

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

(platform)/
│   │   │   ├── layout.tsx (Server Component with Sidebar)
│   │   │   ├── business/
│   │   │   │   ├── generate/page.tsx
│   │   │   │   ├── history/page.tsx
│   │   │   │   ├── models/page.tsx (AI + Human Marketplace)
│   │   │   │   └── billing/page.tsx
|   |   |   |   |__profile/page.tsx
│   │   │   └── model/
│   │   │   |   ├── profile/page.tsx
│   │   │   |    ├── requests/page.tsx
│   │   │   |    └── earnings/page.tsx
|   |   |   |__admin/
                |--analytics/page.tsx
                |--consent/page.tsx
                |--credits/page.tsx
                |--subscriptions/page.tsx
                |--users/page.tsx

The is the breakdown of the UI flow works.
There are 3 types of main user roles --> "BUSINESS" | "MODEL" | "ADMIN"

1. Users can signup through landing page (signup and signin process is handled by clerk)
2. Once an user signup though clear, clearn webhook trigers and create an user in mongodb users collection. 
3. Then it direct to a onboaridng flow, which mainly want to identify this user is going to be a BUSINESS or MODEL. The ADMIN Role should be identified automatically though ADMIN_EMAILS after signin. So ADMIN role should direct to admin dashboard. 
4. After getting the information of role as MODEL or BUSINESS in onboarding process,
If role=BUSINESS --> Direct to /(dashboard)/businesses/generate view and that dashboard
If role=MODEL --> Direct to /(dashboard)/businesses/profile view and that dashboard

User can have only one role.

Navigation:
Vertical Sidebar (Left): Primary navigation between major sections according to the role and user(Generate, Models, History, Billing)
Top Bar: User profile, credits counter, notifications, role

All the UIs should use lazy loading and loading skeltons and also client compoentsa and server components as needed. 
Also for data fetching with caching we have to use tanstack/query
We need to think a lot about app performance 

Here is the breakdown of each view

1. business/generate
Here is the main magic happens
User can upload the product image
When an image uploaded to it store in the s3 and give the url
Then as the 2nd step there is a tab selection AI models, Human models
AI models --> List the pre-generated AI avatars 
Human Mmodels --> default You have no human models and direct to models/page.tsx (AI + Human Marketplace). If a business get a consent from at least one model, that model should be listed under the human models tab
So here in 2nd step --> Business can select any model
Then in 3rd step business has to click 'generate' button and then starts generating. 

2. business/history
Here we show the created images of the user from using AI models and/or human models

3. business/model
This is the Human/AI models market place
All the registered models are listed here. 
Businesses can check the model profiles and send a consent request. There should be a confirmation popup for this.
And businesses should be able to see the consents requests they sent and their status. 

For the AI models marketplace,
Businesses can be able to generate a dedicated AI model for themselves. This is an upcomming feature. So need to implement it now. Just saw the details in interactive way and tell that upcomming feature. 

4. business/billing
This is the billing page where business can see their current subscription, remaining credits, link to go pricing page to upgrade package, invoices list of previous charges

5. business/profile
This is the view of business profile, where businesses can add thier business name, description, few images , their cloths etc. Models can view this before they approve the consent. 

6. model/profile
This is where the landing page of models, where they can create there profile. Businesses can able to check their works and select them. And they can add which kind of modeling they do. Models can select the cloth products they willing to present like only shirts, frocks etc. And also model needs to provide their cost of use. Platform get 10% amount of that as the commision. And models can be listed as consent required or consent not required category. 

7. model/requests
This is where the models can see the consent request list received to them. Then models can view the business profile from here and approve or reject it.

8. model/earnings
This is the where the models can see how much they have earned with details, and they can reqest to pay if they have earned the minimum requirement ($5/$10)
And payout transaction history for this model also listed here

9.admin/analytics
This is where the admin can see the analytics. 

10.admin/consent
This is where admin can see the consents going through the paltform. from which business to model and the status. 

11. admin/credits
This is where the admin can add credits to a certain user in case of specific case. 

12. admin/users
This is where the admin can see the user profiles fully with their subscriptions. 

Important facts to consider.

1. The UI should be loading fast.
2. UI should be consistant and interactive.
3. Use embeded 3D styles but should not cause any performance issue. Use optimization techniques. 
4.When you're building user interfaces, it helps to have some placeholder data. If a database or API is not yet available,use place holder data. But keep a seperate folder for placeholder data and import from there. 
5. Select a suitable font for this fashion domain. Next.js automatically optimise the fonts when we use /next/font module. 
6.Use next.js image optimization techniques.Next.js can serve static assets, like images, under the top-level /public folder and next.js <Image/> component comes with automatic image optimization for the above mentioned points. 
7. Navigation between pages we should optimize navigation-
To avoid full page refresh on every page navigation
We can use next.js Link component to avoid that. It supports client side navigation with Javascript 
Although parts of your application are rendered on the server, there's no full page refresh, making it feel like a native web app.
8.Showing active links- To do this, we need current path from the URL
We can use ‘usePathname’ hook for this. But it’s a React hook. Next.js components are server components by default. But React components are client components and to use React hooks we need client components. So we need to convert to a Next.js component to a client component by using ‘use client’. Then we can use React hooks inside the Next.js component. 
9. Using React Server Components to Fetch Data- By default, next.js uses react server components
Benefits of fetching data using server components
Server Components support JavaScript Promises, providing a solution for asynchronous tasks like data fetching natively. You can use async/await syntax without needing useEffect, useState or other data fetching libraries.
Server Components run on the server, so you can keep expensive data fetches and logic on the server, only sending the result to the client.
Since Server Components run on the server, you can query the database directly without an additional API layer. This saves you from writing and maintaining additional code.Avoid request waterfall as well.
10. Be aware of static redering and dynamic rendering and use it as needed. 
11. Use streaming techniques to break down a route into smaller "chunks" and progressively stream them from the server to the client as they become ready. 
Ways to do streaming
1. At the page level, with the loading.tsx file (which creates <Suspense> for you).
2. At the component level, with <Suspense> for more granular control.
11. Add loading and loading skeltons. 
12. Check the model schemas at /models

12. Be aware that we are using next.js 15.5.6 and tailwind.css 3.Always refer the official docs to get the current updates. This is 2025.11.22

verify the flow, 

When  user sign-up, 
1. Sign up via clerk
2. Create a user in mongo collection
3. Check the role
4. if the role is admin, direct to admin dashboard
5. if the role is business direct to business dashboard, create a document in businessprofiles mongo collection
6. if the role is model direct to model dashboard, create a document in modelprofiles mongo collection
7. if there's no role show onboarding flow
8. after onboaridng direct to relevent model or business dashboard (should not direct again to the landing page)

When user sign-in
1. Sign in via clerk
2. Get the user role from mongodb users collection
4. if the role is admin, direct to admin dashboard
5. if the role is business direct to business dashboard,  create a document in businessprofiles mongo collection
6. if the role is model direct to model dashboard, create a document in modelprofiles mongo collection
7. if there's no role show onboarding flow
8. after onboaridng direct to relevent model or business dashboard (should not direct again to the landing page)

## 💳 Pricing Plans

This is credit and prices based model

1.Businesses needs to subscribe for any of below package for image generation. They can check the images by generating with each model no matter AI or human. Businesses get chared credits for image generation. All of the previews are watermarked. 
2. When downloading generated images with AI models, check the subscription package. Business can download the image without watermark if they in a paid package. 
3. When dowanloading generated images with Human models, 
3.1 check the model in no-consent required category, if so charge the model's price seperately and download image without water mark. This is one-time payment. If any business already paid for a particular model, that business can use the model for certain time. Preview images has watermark and when downloading watermark removed.
3.2 if the model in required consent category, need to send a consent request from the business to model. Then model can agree or reject the business. If model agreed download buttons will be enabled to download. Until that downlaod buttons are disabled and preview is watermarked. And business should be notified that the some models need the consent, and for those models will take up to 2 days get approved. 

FREE TIER (Cost-Controlled)
Goal: Acquire fashion SMEs easily, without burning money.
Price: $0
 Includes:
3 AI-generated on-model photos/mo (your cost = $0.225/mo per free user)


Watermarked


No human models
AI model market place


Low-res preview


Limited usage license


 2. STARTER TIER – $19/month (Your ICP’s most realistic entry point)
Price: $19/mo
 Includes:
40 AI-generated photos/month
 → Your cost: 50 × $0.075 = $3.75


AI model market place 
Human model marketplace
Full-resolution downloads
Remove Watermark



3. GROWTH TIER – $49/month
For: Manufacturers (Kasun) or fast-moving boutiques
Price: $49/mo
 Includes:
100 AI-generated images/mo
 → Your cost: 100 × $0.075 = $7.5


AI model market place 
Human model marketplace
Full-resolution downloads
Remove Watermark


Early-access new features







