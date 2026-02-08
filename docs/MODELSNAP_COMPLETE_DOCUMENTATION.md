# ModelSnapper.ai - Complete Project Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** MVP Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Database Collection Schemas](#database-collection-schemas)
3. [User Flow Diagrams](#user-flow-diagrams)
4. [API Sequence Diagrams](#api-sequence-diagrams)
5. [System Architecture](#system-architecture)
6. [Frontend Component & Route Flow](#frontend-component--route-flow)
7. [Consent Logic State Machine](#consent-logic-state-machine)
8. [Credit Usage Flow](#credit-usage-flow)
9. [Tech Stack](#tech-stack)
10. [Theme & Design System](#theme--design-system)

---

## Overview

ModelSnapper.ai is an AI-powered fashion photography platform designed specifically for Sri Lankan fashion brands. The platform enables businesses to upload clothing items and render them on AI-generated Sri Lankan models or human models with proper consent and royalty management.

### Key Features

- **AI Avatar Gallery**: 32 pre-generated Sri Lankan avatars (4 body types × 4 skin tones × 2 genders)
- **Human Model Marketplace**: Ethical consent workflow with one-time approval per business-model pair
- **Credit-Based System**: Pay-per-render with subscription plans
- **Royalty Management**: Automatic royalty tracking and payout for human models
- **Watermarking**: Free tier includes watermarked images
- **High-Resolution Downloads**: Premium tiers offer watermark-free downloads

### Core Principles

- **One-Time Consent**: A business must request consent once per model. After approval, unlimited use.
- **Server-Side Rendering**: All AI generation logic runs server-side for security
- **Type Safety**: Strict TypeScript with no `any` types
- **Component-Based**: Reusable, maintainable React components
- **Performance First**: Optimal use of Next.js Server Components

---

## Database Collection Schemas

### 📌 **users**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique ID for the user document. |
| id | String | Unique | Indexed | **Clerk user ID** (primary identifier). This is the Clerk authentication ID used throughout the codebase. |
| emailAddress | Array<String> |  | Indexed | User's email addresses from Clerk. |
| firstName | String |  |  | User's first name. |
| lastName | String |  |  | User's last name. |
| picture | String |  |  | Profile picture URL from Clerk. |
| role | String |  | Indexed | User role: `'BUSINESS'`, `'MODEL'`, or `'ADMIN'`. Default: `'BUSINESS'`. |
| stripeCustomerId | String |  | Indexed | Stripe customer ID for payment processing. |
| lemonsqueezyCustomerId | String |  |  | Lemon Squeezy customer ID (alternative payment). |
| webxpayCustomerId | String |  |  | WebXPay customer ID (alternative payment). |
| credits | Number |  |  | Remaining AI photo credits. **CRITICAL**. Default: 10 (free tier). |
| plan | Object (Embedded) |  |  | Current subscription plan details. |
| plan.id | String |  |  | Plan identifier (e.g., "free", "starter", "growth"). |
| plan.type | String |  |  | Plan type: "free" or subscription type. |
| plan.planType | String |  |  | Legacy field - kept for backward compatibility. |
| plan.name | String |  |  | Display name of the plan. |
| plan.price | String |  |  | Plan price as string. |
| plan.isPremium | Boolean |  |  | Whether plan includes premium features. |
| createdAt | Date |  |  | Timestamp of creation. |
| updatedAt | Date |  |  | Timestamp of last update. |

**Current Implementation:** `models/user.ts`  
**Notes:**
- The `id` field stores the Clerk user ID (not a separate `clerkId` field)
- A virtual `clerkId` is available for backward compatibility (returns `id`)
- Role field added for future role-based access control (BUSINESS, MODEL, ADMIN)
- All critical fields are indexed for performance

---

### 📌 **business_profiles**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique profile ID. |
| userId | ObjectId | Foreign Key | Unique | Links to user in **users** collection. |
| businessName | String |  |  | Name of the boutique/company. |
| aiCredits | Number |  |  | Remaining AI photo credits. **CRITICAL**. |
| subscriptionStatus | String |  | Single | `'STARTER'`, `'GROWTH'`, `'FREE'`, etc. |
| approvedModels | Array<ObjectId> | Foreign Key |  | Whitelist of Human Model IDs (refs `model_profiles._id`). |
| stripeCustomerId | String |  | Single | Stripe customer ID. |
| packageId | ObjectId | Foreign Key |  | Ref to **packages** collection. |
| createdAt | Date |  |  | Timestamp of creation. |
| updatedAt | Date |  |  | Timestamp of last update. |

**Status:** TODO - Model needs to be created  
**File:** `models/business-profile.ts`

---

### 📌 **model_profiles**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique model profile ID. |
| userId | ObjectId | Foreign Key | Unique | Links to user in **users** collection. |
| name | String |  |  | Public display name. |
|paidAmount |Number| Charge for the model | 
| royaltyBalance | Number |  |  | Accumulated earnings. **CRITICAL**. Default: 0. |
| referenceImages | Array<String> (S3 URLs) |  |  | 3–4 likeness reference images stored in S3. |
| approvedBusinesses | Array<ObjectId> | Foreign Key |  | Allowed business IDs (refs `business_profiles.userId`). |
| consentSigned | Boolean |  |  | Confirms digital likeness release. Default: false. |
| status | String |  | Single | `'active'`, `'paused'`, `'inactive'`. |
| createdAt | Date |  |  | Timestamp of creation. |
| updatedAt | Date |  |  | Timestamp of last update. |

**Status:** TODO - Model needs to be created  
**File:** `models/model-profile.ts`

---

### 📌 **consent_requests**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique request ID. |
| businessId | ObjectId | Foreign Key | Compound | Business requesting consent (refs `business_profiles._id`). |
| modelId | ObjectId | Foreign Key | Compound | Model being asked (refs `model_profiles._id`). |
| status | String |  | Compound | `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'EXPIRED'`. |
| requestedAt | Date |  | Single | Created timestamp. |
| expiresAt | Date |  |  | Optional expiration date for consent. |
| grantedAt | Date |  |  | Timestamp when consent was approved. |
| rejectedAt | Date |  |  | Timestamp when consent was rejected. |
| **Combined Index** | N/A |  | Compound Index | `(businessId, modelId)` for quick lookup. |

**Status:** TODO - Model needs to be created  
**File:** `models/consent-request.ts`  
**Critical Rule:** One-time consent per business-model pair. Once approved, business can use model indefinitely.

---

### 📌 **generations**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique generation ID. |
| userId | ObjectId | Foreign Key | Compound | Business user (refs `users._id`). |
| modelId | ObjectId | Foreign Key | Compound | Human model used (refs `model_profiles._id`) or `null` for AI avatar. |
| avatarId | ObjectId | Foreign Key |  | AI avatar used (refs `ai_avatars._id`) or `null` for human model. |
| modelType | String |  |  | `'AI_AVATAR'` or `'HUMAN_MODEL'`. |
| garmentImageUrl | String |  |  | S3 URL of uploaded garment image. |
| outputS3Url | String |  |  | Final generated image S3 URL. |
| royaltyPaid | Number |  |  | `$2.00` if human model, `$0` otherwise. |
| creditsUsed | Number |  |  | Credits consumed (1 for AI avatar, 0 for human model). |
| status | String |  |  | `'pending'`, `'processing'`, `'completed'`, `'failed'`. |
| fashnRequestId | String |  |  | FASHN API request ID for tracking. |
| errorMessage | String |  |  | Error message if generation failed. |
| generatedAt | Date |  | Compound | Timestamp. |
| **Index** | N/A |  | Compound Index | `(userId, generatedAt)` — history lookup. |
| **Index** | N/A |  | Compound Index | `(modelId, generatedAt)` — royalty tracking. |

**Status:** Partially Done - Currently using `models/render.ts`  
**Note:** The Render model should be enhanced or replaced with Generation model to align with full schema.

---

### 📌 **packages**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique package ID. |
| stripePriceId | String |  | Unique | Direct Stripe pricing object link. **CRITICAL**. |
| lemonsqueezyVariantId | String |  | Unique | Lemon Squeezy variant ID (alternative). |
| name | String |  |  | E.g., `'STARTER TIER'`, `'GROWTH TIER'`. |
| description | String |  |  | Package description. |
| aiCreditsGranted | Number |  |  | Credits per purchase/subscription period. |
| humanModelAccess | Boolean |  |  | Enables Human Model marketplace access. |
| price | Number |  |  | Package price in USD. |
| currency | String |  |  | Currency code (e.g., "usd", "lkr"). |
| billingCycle | String |  |  | `'monthly'`, `'yearly'`, or `'one-time'`. |
| isActive | Boolean |  | Single | Display/hide package. Default: true. |
| createdAt | Date |  |  | Timestamp of creation. |
| updatedAt | Date |  |  | Timestamp of last update. |

**Status:** TODO - Model needs to be created  
**File:** `models/package.ts`

---

### 📌 **ai_avatars**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique AI avatar ID. |
| id | String | Unique | Unique | Custom unique identifier. |
| name | String |  |  | Display name (e.g., *AI Model Sophia*). |
| gender | String |  | Compound | `'male'` or `'female'`. |
| bodyType | String |  | Compound | Body type identifier (e.g., `'slim'`, `'medium'`, `'plus-size'`). |
| skinTone | String |  | Compound | Skin tone identifier (e.g., `'SL-01'`, `'SL-02'`). |
| imageUrl | String |  |  | Path relative to public folder or S3 URL. |
| s3Url | String |  |  | Canonical reference image in S3 (if stored in S3). |
| modelId | String |  |  | FASHN model ID if available. |
| isActive | Boolean |  | Single | Show/hide avatar. Default: true. |
| createdAt | Date |  |  | Timestamp of creation. |
| updatedAt | Date |  |  | Timestamp of last update. |

**Status:** Done - `models/avatar.ts`  
**Note:** Current implementation includes gender, bodyType, and skinTone for filtering.

---

### 📌 **invoices**

| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique invoice ID. |
| userId | ObjectId | Foreign Key | Single | Business owner (refs `users._id`). |
| businessId | ObjectId | Foreign Key |  | Business profile (refs `business_profiles._id`). |
| stripeInvoiceId | String |  | Unique | Stripe invoice ID (e.g., `in_...`). |
| invoiceNumber | String |  | Single | Human-readable invoice number. |
| amountDue | Number |  |  | Final payable amount. |
| currency | String |  |  | e.g., `'USD'`, `'LKR'`. |
| status | String |  | Single | `'draft'`, `'open'`, `'paid'`, `'uncollectible'`, `'void'`. |
| pdfUrl | String |  |  | Stripe-hosted PDF. **CRITICAL**. |
| hostedInvoiceUrl | String |  |  | Stripe-hosted invoice page. |
| periodStart | Date |  |  | Start of billing cycle. |
| periodEnd | Date |  |  | End of billing cycle. |
| lineItems | Array (Embedded) |  |  | Optional snapshot of line items. |
| paidAt | Date \| null |  |  | When payment was confirmed. |
| createdAt | Date |  |  | Timestamp of creation. |
| updatedAt | Date |  |  | Timestamp of last update. |

**Status:** TODO - Model needs to be created  
**File:** `models/invoice.ts`

---



 **Critical Rule:** Consent is one-time per business per model. After approval, the business can continue using the model without asking again.

---

### 🧩 Model User Flow

#### 1. Signup & Profile Creation

```mermaid
graph TD
A[Model Sign Up via Clerk] --> B[Create Model Profile]
B --> C[Upload 3-4 Reference Images]
C --> D[Images Stored in S3]
D --> E[Enable Digital Likeness Use]
E --> F[Profile Active in Marketplace]
```

#### 2. Receiving Consent Requests

```mermaid
graph TD
A[Business Requests Consent] --> B[Model Dashboard Notification]
B --> C[Review Business Profile]
C --> D{Approve or Reject?}
D -- Approve --> E[Consent Saved]
E --> F[Business Added to 'Approved Businesses']
D -- Reject --> G[Request Closed]
G --> H[Business Cannot Use Model]
```



```

---

## API Sequence Diagrams

### Complete Generation Flow (AI Avatar)

```mermaid
sequenceDiagram
    participant UI as Frontend (Next.js)
    participant API as Backend API Routes
    participant DB as MongoDB
    participant FASHN as Fashn AI API
    participant S3 as AWS S3

    UI->>API: POST /api/upload (Garment Image)
    API->>S3: Generate Pre-signed URL
    S3-->>API: Return Pre-signed URL
    API-->>UI: Return Upload URL
    UI->>S3: Upload Image Directly
    S3-->>UI: Upload Complete
    UI->>API: POST /api/render (Avatar ID, Garment URL)
    
    API->>DB: Check User Credits
    alt Insufficient Credits
        API-->>UI: Error: Insufficient Credits
    else Credits Available
        API->>FASHN: Call Try-On API (Avatar + Garment)
        FASHN-->>API: Generated Image URL
        API->>S3: Store Generated Image
        S3-->>API: S3 URL Confirmed
        API->>DB: Deduct 1 Credit
        API->>DB: Save Generation Record
        API-->>UI: Return Rendered Image URL
    end
```

### Human Model Generation Flow

```mermaid
sequenceDiagram
    participant UI as Frontend (Next.js)
    participant API as Backend API Routes
    participant DB as MongoDB
    participant FASHN as Fashn AI API
    participant S3 as AWS S3
    participant Email as Resend Email

    UI->>API: POST /api/render (Model ID, Garment URL)
    
    API->>DB: Check Consent Status
    alt No Consent
        API->>DB: Create Consent Request (PENDING)
        API->>Email: Send Notification to Model
        API-->>UI: Error: Consent Required
    else Consent Approved
        API->>DB: Check Payment Method
        API->>FASHN: Call Try-On API (Model + Garment)
        FASHN-->>API: Generated Image URL
        API->>S3: Store Generated Image
        S3-->>API: S3 URL Confirmed
        API->>DB: Payout model's charge with 10% commision to platform
        API->>DB: Save Generation Record
        API-->>UI: Return Rendered Image URL
    end
```

### Consent Request Flow

```mermaid
sequenceDiagram
    participant Business as Business User
    participant API as Backend API
    participant DB as MongoDB
    participant Email as Resend Email
    participant Model as Model User

    Business->>API: POST /api/consent/request (Model ID)
    API->>DB: Check Existing Consent
    alt Consent Already Exists
        API-->>Business: Error: Consent Already Granted
    else No Consent
        API->>DB: Create Consent Request (PENDING)
        API->>Email: Send Notification to Model
        Email->>Model: Email: New Consent Request
        Model->>API: GET /api/consent/requests
        API->>DB: Fetch Pending Requests
        API-->>Model: Return Requests List
        Model->>API: POST /api/consent/approve (Request ID)
        API->>DB: Update Status to APPROVED
        API->>DB: Add Business to Approved List
        API->>Email: Send Confirmation to Business
        API-->>Model: Success: Consent Approved
    end
```

---

## System Architecture

### High-Level Architecture



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
```

### Component Architecture

```mermaid
flowchart TB
    subgraph NextJS_App [Next.js 15 App Router]
        subgraph Server_Components [Server Components - Default]
            SC1[Landing Page Sections]
            SC2[Avatar Gallery]
            SC3[Render History]
            SC4[Admin Dashboard]
        end
        
        subgraph Client_Components [Client Components - Interactive]
            CC1[Upload Interface]
            CC2[Avatar Selector]
            CC3[Render Interface]
            CC4[Theme Toggle]
            CC5[Credit Counter]
        end
        
        subgraph Server_Actions [Server Actions - Mutations]
            SA1[Render Generation]
            SA2[Credit Deduction]
            SA3[Consent Request]
            SA4[Payment Processing]
        end
        
        subgraph API_Routes [API Routes - External]
            API1[/api/render]
            API2[/api/upload]
            API3[/api/consent]
            API4[/api/webhook/stripe]
        end
    end
    
    Server_Components --> Client_Components
    Client_Components --> Server_Actions
    Server_Actions --> API_Routes
    API_Routes --> External[External Services]
```

---

## Frontend Component & Route Flow

### Landing Page Structure

```mermaid
flowchart TB
    A[Landing Page /] --> B[Header with Navigation]
    A --> C[Hero Section]
    A --> D[Problem Section]
    A --> E[Solution Section]
    A --> F[Gallery Section]
    A --> G[Demo Section]
    A --> H[Advantage Section]
    A --> I[Stats Section]
    A --> J[Pricing Section]
    A --> K[FAQ Section]
    A --> L[Team Section]
    A --> M[Footer]
    
    J --> N[Checkout Flow]
    N --> O[Stripe/LemonSqueezy]
```

### Business Dashboard Routes

```mermaid
flowchart TB
    A[Login / Sign Up] -->|Business Role| B[Business Dashboard /app]
    
    B --> C[Generate Tab]
    B --> D[Models Tab]
    B --> E[History Tab]
    B --> F[Billing Tab]
    
    C --> C1[Upload Garment]
    C --> C2[Select AI Avatar]
    C --> C3[Select Human Model]
    C --> C4[Render Button]
    
    D --> D1[AI Avatar Gallery]
    D --> D2[Human Model Marketplace]
    D --> D3[Request Consent]
    
    E --> E1[Render History List]
    E --> E2[Download Images]
    E --> E3[Preview Images]
    
    F --> F1[Current Plan]
    F --> F2[Credit Balance]
    F --> F3[Upgrade Plan]
    F --> F4[Invoice History]
    F --> F5[Billing Portal]
```

### Model Dashboard Routes

```mermaid
flowchart TB
    A[Login / Sign Up] -->|Model Role| B[Model Dashboard /app/model]
    
    B --> C[Profile Tab]
    B --> D[Consent Requests Tab]
    B --> E[Earnings Tab]
    
    C --> C1[Edit Profile]
    C --> C2[Upload Reference Images]
    C --> C3[Enable/Disable Profile]
    
    D --> D1[Pending Requests]
    D --> D2[Approved Requests]
    D --> D3[Rejected Requests]
    D --> D4[Approve/Reject Action]
    
    E --> E1[Royalty Balance]
    E --> E2[Earnings History]
    E --> E3[Request Payout]
```

### Navigation Structure

```mermaid
flowchart LR
    subgraph Sidebar [Vertical Sidebar - Left]
        S1[Dashboard]
        S2[Generate]
        S3[Models]
        S4[History]
        S5[Billing]
    end
    
    subgraph TopBar [Top Bar - Right]
        T1[Credits Counter]
        T2[Theme Toggle]
        T3[Account Menu]
        T4[Notifications]
    end
    
    Sidebar --> Content[Main Content Area]
    TopBar --> Content
```

**Navigation Pattern:** Hybrid Navigation
- **Vertical Sidebar (Left)**: Primary navigation between major sections
- **Top Bar**: User profile, credits counter, notifications, role switcher
- **Mobile**: Collapsible hamburger menu

---

## Consent Logic State Machine

### Consent States

- **NoRequest**: No consent request exists
- **Pending**: Request sent, awaiting model response
- **Approved**: Model approved, consent active
- **Rejected**: Model rejected the request
- **Expired**: Request expired (if time-limited)
- **ActiveConsent**: Consent is active and usable
- **Revoked**: Model revoked previously approved consent

---

## Credit Usage Flow

### AI Avatar Credit Flow

```mermaid
flowchart TD
    A[User Initiates Generation] --> B{Model Type?}
    B -->|AI Avatar| C[Check AI Credits]
    C --> D{Credits >= 1?}
    D -->|Yes| E[Validate Garment Image]
    D -->|No| F[Show Upgrade Prompt]
    F --> G[Redirect to Billing]
    E --> H[Call FASHN API]
    H --> I[Receive Generated Image]
    I --> J[Deduct 1 Credit]
    J --> K[Save Generation Record]
    K --> L[Store Image in S3]
    L --> M[Return Image URL]
    M --> N{Free Plan?}
    N -->|Yes| O[Apply Watermark]
    N -->|No| P[Return Clean Image]
    O --> Q[Display Preview]
    P --> Q
    Q --> R[Download Available]
```

### Human Model Credit Flow

```mermaid
flowchart TD
    A[User Initiates Generation] --> B{Model Type?}
    B -->|Human Model| C[Check Consent Status]
    C --> D{Consent Approved?}
    D -->|No| E[Create Consent Request]
    E --> F[Send Email to Model]
    F --> G[Wait for Approval]
    D -->|Yes| H[Charge model's amount for one time from business with 10% commition to platform, add that business to charged business numbers of that model, if the same business use the model here after should not be charged again]
    H --> I[Call FASHN API]
    I --> J[Receive Generated Image]
    J --> K[Add Royalty to Model]
    K --> L[Save Generation Record]
    L --> M[Store Image in S3]
    M --> N[Return Image URL]
    N --> O[Display Preview]
    O --> P[Download Available]
```

### Combined Credit Flow Diagram

```mermaid
flowchart LR
    A[Generation Request] --> B{AI or Human Model?}

    B -->|AI Avatar| C[Check AI Credits]
    C -->|Credits Available| D[Generate]
    C -->|No Credits| E[Show Upgrade]

    B -->|Human Model| F[Check Consent]
    F -->|No Consent| G[Send Consent Request]
    F -->|Consent Approved| H[Charge]
    H --> D[Generate]

    D --> I[Store in S3]
    D --> J[Log in DB]
    J --> K[Return to User]
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **State Management**: React Context API
- **Internationalization**: next-intl

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes & Server Actions
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: AWS S3
- **Authentication**: Clerk
- **Payments**: Stripe, Lemon Squeezy, WebXPay
- **Email**: Resend

### External Services
- **AI Generation**: Fashn.ai Virtual Try-On API
- **Analytics**: Google Analytics
- **Logging**: Grafana (Vercel Logs)
- **Deployment**: Vercel

### Development Tools
- **Testing**: Playwright
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **CI/CD**: GitHub Actions

---

## Theme & Design System

### Color Palette

#### Light Mode
- **Primary**: `#015064` (Teal/Cyan) - Main brand color
- **Accent**: `#027d94` (Brighter teal)
- **Background**: `#F7F7F7` (Light gray)
- **Foreground**: `#1A1A1A` (Dark gray)
- **Muted**: `#f8fafc` (Very light gray)
- **Border**: `#e2e8f0` (Light border)

#### Dark Mode
- **Primary**: `#03a9c6` (Brighter teal for visibility)
- **Accent**: `#027d94`
- **Background**: `#121314` (Dark background)
- **Foreground**: `#f8fafc` (Light text)
- **Muted**: `#334155` (Dark muted)
- **Border**: `#334155` (Dark border)

### Typography
- **Headings**: Inter (font-sans)
- **Body**: IBM Plex Sans (alternative)
- **Accent**: Sora/Mulish (optional)

### Spacing & Layout
- **Border Radius**: `0.75rem` (12px) base
- **Container Max Width**: `screen-xl` (1280px)
- **Sidebar Width**: Collapsible, default open
- **Top Bar Height**: `55px`

### Component Patterns
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Primary, secondary, ghost variants
- **Forms**: Clean inputs with focus rings
- **Modals**: Backdrop blur, centered content

---

## Security & Performance

### Security Measures
- **Server-Side Rendering**: All AI generation logic runs server-side
- **Rate Limiting**: Implemented on API routes
- **Authentication**: Clerk handles all auth flows
- **File Upload**: Pre-signed S3 URLs for direct upload
- **API Keys**: Stored in environment variables, never exposed

### Performance Optimizations
- **Server Components**: Default for data fetching
- **Client Components**: Only for interactivity (upload, animations)
- **Image Optimization**: Next.js Image component with S3
- **Caching**: MongoDB queries cached where appropriate
- **Code Splitting**: Automatic with Next.js App Router

### Scalability Considerations
- **Database Indexing**: Compound indexes on frequently queried fields
- **S3 Storage**: Scalable object storage
- **API Rate Limits**: Monitored and enforced
- **Error Handling**: Comprehensive error boundaries
- **Logging**: Centralized logging via Grafana

---

## API Endpoints

### Render Endpoints
- `POST /api/render` - Generate AI avatar or human model image
- `GET /api/render/history` - Get user's render history

### Upload Endpoints
- `POST /api/upload` - Get pre-signed S3 URL for upload

### Avatar Endpoints
- `GET /api/avatars` - List all available AI avatars

### Consent Endpoints (TODO)
- `POST /api/consent/request` - Request consent from model
- `GET /api/consent/requests` - Get consent requests (for models)
- `POST /api/consent/approve` - Approve consent request
- `POST /api/consent/reject` - Reject consent request

### Payment Endpoints
- `POST /api/payments/checkout` - Create checkout session
- `POST /api/webhook/stripe` - Handle Stripe webhooks
- `GET /api/payment-status` - Check payment status

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user (credits, plan)

---

## Environment Variables

### Required Variables
```env
# Database
MONGO_URI=mongodb://...
MONGODB_DATABASE=modelsnap

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# AI API
FASHN_API_KEY=your_fashn_api_key

# Payments
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Admin
ADMIN_EMAILS=admin@example.com

# Optional
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...
```

---

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode, no `any` types
- **Components**: Server components by default
- **Client Components**: Only for upload UI, animations, forms
- **Naming**: PascalCase for components, camelCase for functions
- **File Structure**: Follow Next.js App Router conventions

### Testing Requirements
- **Component Tests**: Playwright for all UI components
- **Integration Tests**: Full user flows
- **E2E Tests**: Critical paths (signup, render, payment)

### Git Workflow
- **Branching**: Feature branches from main
- **Commits**: Descriptive commit messages
- **PRs**: Required before merging
- **CI/CD**: Automatic on push to main

---

## Future Enhancements

### Phase 2
- Background presets
- Batch upload
- Brand kits
- Advanced filtering

### Phase 3
- Pose packs
- Custom avatars
- API access for developers
- White-label options

### Phase 4
- International expansion
- Multi-language support
- Additional payment methods
- Mobile app

---

**End of Documentation**

