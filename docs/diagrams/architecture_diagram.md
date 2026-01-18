flowchart TD
    %% Tiers Definition
    subgraph Client_Tier_1 [1. Client Tier - Browser/User]
        A[Business Owner / Model]
    end

    subgraph Edge_Application_Tier_2 [2. Edge / Application Tier - Next.js 15, Vercel]
        B[Next.js Server Components]
        C[Next.js Server Actions - Mutation]
        D[Next.js Middleware]
        E[Next.js Route Handlers - Webhooks]
    end

    subgraph Data_Storage_Tier_3 [3. Data & Storage Tier]
        F[AWS S3 - Image Storage]
        G[MongoDB - Data, Credits, Consent, Usage Logs]
    end

    subgraph External_Services_Tier_4 [4. External Services Tier - APIs]
        H[Clerk - Auth & User Management]
        I[Fashn.ai - Virtual Try-On API]
        J[Lemon Squeezy - Payments, Subscriptions]
        K[Resend - Email/Notifications]
        L[Google Analytics - Event Tracking]
        M[Vercel Logs - Grafana Integration]
        N[PostHog - Product Analytics]
    end

    %% Flow Connections

    %% Authentication & Edge
    A -- Authenticates --> D
    D -- Auth Check --> H
    H -- User Data Sync --> G

    %% Data Fetching & UI (Fast Path)
    B -- Fetch (RSC) --> G
    B -- Fetch (RSC) --> F

    %% 1. Image Upload Flow (Secure & Efficient)
    A -- Initiate Upload --> C
    C -- 1. Generate Pre-signed URL --> F
    A -- 2. Upload Image Directly --> F
    C -- 3. Save S3 URL --> G

    %% 2. The Core AI Generation Flow (Secure)
    A -- Initiate Generation --> C
    C -- 1. Check Credits/Consent (G) & Fetch Inputs (F) --> G & F
    C -- 2. Call AI API (Secure) --> I
    I -- 3. Generates Image --> F
    C -- 4. Update Credit/Usage Log --> G
    C -- 5. Returns Generated S3 URL --> A

    %% 3. Payment & Subscription Flow (Secure)
    A -- Checkout / Upgrade --> C
    C -- 1. Create Checkout Session --> J
    J -- 2. Redirects User --> A
    J -- 3. Payment Confirmed (Webhook) --> E
    E -- 4. Update Credits/Subscription --> G

    %% 4. Human Model Consent Flow (Gated)
    A -- Send Consent Request --> C
    C -- 1. Create 'PENDING' record --> G
    C -- 2. Notify Model - via Email --> K
    A -- Model Responds/Approve --> C
    C -- 3. Update Status / Whitelist --> G

    %% Monitoring & Tracking
    D -- Logs Events --> M
    D -- Client Scripts --> L
