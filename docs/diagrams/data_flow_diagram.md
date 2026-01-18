# ModelSnap.ai - Complete Data Flow Diagram

**Last Updated:** January 18, 2026

This document provides detailed data flow diagrams for all major processes in the ModelSnap.ai platform.

---

## 1. Complete Image Generation Flow (AI Avatar)

```mermaid
sequenceDiagram
    participant User as Business User
    participant UI as Frontend (Client)
    participant API as Next.js API Routes
    participant Auth as Clerk Auth
    participant DB as MongoDB
    participant S3 as AWS S3
    participant Fashn as Fashn.ai API
    participant Email as Resend Email

    %% Step 1: Authentication
    User->>UI: Access Dashboard
    UI->>Auth: Check Authentication
    Auth-->>UI: User Authenticated
    
    %% Step 2: Upload Garment
    User->>UI: Upload Garment Image
    UI->>API: POST /api/upload (file)
    API->>Auth: Verify User
    Auth-->>API: User ID
    API->>S3: Generate Pre-signed URL
    S3-->>API: Pre-signed URL
    API-->>UI: Return Upload URL
    UI->>S3: Direct Upload (PUT)
    S3-->>UI: Upload Success
    UI->>API: POST /api/upload/confirm
    API->>DB: Save Garment URL
    DB-->>API: Saved
    API-->>UI: Confirmation
    
    %% Step 3: Select Avatar
    User->>UI: Select AI Avatar
    UI->>API: GET /api/avatars
    API->>DB: Fetch Avatars
    DB-->>API: Avatar List
    API-->>UI: Return Avatars
    
    %% Step 4: Generate Render
    User->>UI: Click Generate
    UI->>API: POST /api/render<br/>{garmentUrl, avatarId}
    
    %% Step 5: Validation & Credit Check
    API->>Auth: Verify User
    Auth-->>API: User ID
    API->>DB: Fetch BusinessProfile
    DB-->>API: BusinessProfile
    API->>API: Check Credits<br/>(aiCreditsRemaining >= 1)
    
    alt Insufficient Credits
        API-->>UI: Error: Insufficient Credits
    else Credits Available
        %% Step 6: Fetch Images
        API->>S3: Fetch Garment Image
        S3-->>API: Garment Image
        API->>DB: Fetch Avatar Image URL
        DB-->>API: Avatar Image URL
        API->>S3: Fetch Avatar Image
        S3-->>API: Avatar Image
        
        %% Step 7: Call Fashn.ai API
        API->>Fashn: POST /virtual-try-on<br/>{garment_image, model_image}
        Note over Fashn: Processing...<br/>(5-30 seconds)
        Fashn-->>API: Generated Image URL
        
        %% Step 8: Download & Store Generated Image
        API->>Fashn: GET Generated Image
        Fashn-->>API: Image Buffer
        API->>API: Optimize Image (Sharp)
        API->>S3: Upload to S3<br/>(generated/)
        S3-->>API: S3 URL
        
        %% Step 9: Save Record & Deduct Credits (Atomic)
        API->>DB: Start Transaction
        API->>DB: Create Render Record
        API->>DB: Deduct 1 Credit<br/>(aiCreditsRemaining--)
        API->>DB: Create Credit Transaction Log
        API->>DB: Commit Transaction
        DB-->>API: Success
        
        %% Step 10: Return Result
        API-->>UI: Return Result<br/>{previewImageUrl, outputS3Url}
        UI->>User: Display Generated Image
        
        %% Step 11: Send Email Notification (Async)
        API->>Email: Send Completion Email
        Email-->>User: Email Notification
    end
```

---

## 2. Complete Image Generation Flow (Human Model)

```mermaid
sequenceDiagram
    participant Business as Business User
    participant UI as Frontend
    participant API as API Routes
    participant DB as MongoDB
    participant S3 as AWS S3
    participant Fashn as Fashn.ai API
    participant Model as Model User
    participant Email as Resend

    %% Step 1: Browse Models
    Business->>UI: Browse Human Models
    UI->>API: GET /api/models
    API->>DB: Fetch Model Profiles
    DB-->>API: Model List
    API-->>UI: Return Models
    
    %% Step 2: Check Purchase Status
    Business->>UI: Select Human Model
    UI->>API: GET /api/models/[id]/purchase-status
    API->>DB: Check Purchase Status
    DB-->>API: Purchase Status
    
    alt Not Purchased
        UI-->>Business: Show Purchase Button
        Business->>UI: Click Purchase
        UI->>API: POST /api/models/purchase/checkout
        API->>DB: Check Consent (if required)
        alt Consent Required & Not Approved
            API-->>UI: Error: Consent Required First
        else Can Purchase
            API->>LEMON: Create Checkout Session
            LEMON-->>API: Checkout URL
            API-->>UI: Redirect to Checkout
            Business->>LEMON: Complete Payment
            LEMON->>API: Webhook: Payment Success
            API->>DB: Create ModelPurchase Record
            API->>DB: Update BusinessProfile<br/>(purchasedModels)
            API->>DB: Update ModelProfile<br/>(availableBalance += 90%)
        end
    end
    
    %% Step 3: Generate with Human Model
    Business->>UI: Click Generate
    UI->>API: POST /api/render<br/>{garmentUrl, modelId}
    
    %% Step 4: Validation
    API->>DB: Check Credits
    API->>DB: Check Purchase Status
    API->>S3: Fetch Garment Image
    API->>DB: Fetch Model Reference Images
    API->>S3: Fetch Model Images
    
    %% Step 5: Generate
    API->>Fashn: POST /virtual-try-on<br/>{garment_image, model_image}
    Fashn-->>API: Generated Image URL
    API->>S3: Store Generated Image
    API->>DB: Create Generation Record
    API->>DB: Deduct 1 Credit
    API-->>UI: Return Result
    
    %% Note: Model earnings from purchase only, not generation
```

---

## 3. Payment & Subscription Flow (Lemon Squeezy)

```mermaid
sequenceDiagram
    participant User as Business User
    participant UI as Frontend
    participant API as API Routes
    participant DB as MongoDB
    participant Lemon as Lemon Squeezy
    participant Email as Resend

    %% Step 1: Initiate Subscription
    User->>UI: Click Subscribe (Starter/Growth)
    UI->>API: POST /api/payments/lemonsqueezy/create-checkout
    API->>Auth: Verify User
    API->>DB: Fetch User & BusinessProfile
    API->>Lemon: Create Checkout Session<br/>{variant_id, custom_data: {user_id}}
    Lemon-->>API: Checkout URL
    API-->>UI: Return Checkout URL
    UI->>Lemon: Redirect to Checkout
    
    %% Step 2: Payment Processing
    User->>Lemon: Enter Payment Details
    Lemon->>Lemon: Process Payment
    
    alt Payment Success
        Lemon->>API: Webhook: subscription_created<br/>(or order_created)
        API->>API: Verify Webhook Signature
        API->>DB: Find User by customer_id/user_id/email
        API->>DB: Start Transaction
        API->>DB: Update BusinessProfile<br/>(subscriptionTier, credits,<br/>subscriptionId, periodEnd)
        API->>DB: Create Invoice Record
        API->>DB: Create Payment History
        API->>DB: Commit Transaction
        API->>Email: Send Welcome Email
        Email-->>User: Welcome Email
        Lemon-->>UI: Redirect to Success Page
        UI->>User: Show Success Message
    else Payment Failed
        Lemon-->>UI: Show Error
    end
    
    %% Step 3: Monthly Renewal
    Note over Lemon: 30 Days Later
    Lemon->>Lemon: Charge Subscription
    alt Charge Success
        Lemon->>API: Webhook: subscription_payment_success
        API->>DB: Reset Credits<br/>(aiCreditsRemaining = plan limit)
        API->>DB: Update subscriptionCurrentPeriodEnd
        API->>DB: Create Invoice
        API->>Email: Send Invoice Email
    else Charge Failed
        Lemon->>API: Webhook: subscription_payment_failed
        API->>DB: Set subscriptionStatus = 'past_due'
        API->>Email: Send Payment Failed Email
    end
```

---

## 4. Consent Request Flow

```mermaid
sequenceDiagram
    participant Business as Business User
    participant UI as Frontend
    participant API as API Routes
    participant DB as MongoDB
    participant Email as Resend
    participant Model as Model User

    %% Step 1: Request Consent
    Business->>UI: Browse Human Models
    Business->>UI: Click "Request Consent"
    UI->>API: POST /api/consent<br/>{modelId}
    
    %% Step 2: Validation
    API->>DB: Check Existing Consent
    alt Consent Already Exists
        API-->>UI: Error: Already Approved
    else No Consent
        %% Step 3: Create Request
        API->>DB: Create ConsentRequest<br/>{status: 'PENDING',<br/>businessId, modelId}
        DB-->>API: Request Created
        
        %% Step 4: Notify Model
        API->>DB: Fetch Model Profile
        API->>Email: Send Consent Request Email
        Email-->>Model: Email: New Consent Request
        
        %% Step 5: Model Reviews Request
        Model->>UI: View Consent Requests
        UI->>API: GET /api/consent/requests
        API->>DB: Fetch Pending Requests
        DB-->>API: Requests List
        API-->>UI: Return Requests
        
        %% Step 6: Model Decision
        Model->>UI: Approve/Reject Request
        UI->>API: POST /api/consent/[id]<br/>{action: 'approve'/'reject'}
        
        alt Approve
            API->>DB: Start Transaction
            API->>DB: Update ConsentRequest<br/>{status: 'APPROVED'}
            API->>DB: Add to BusinessProfile<br/>(approvedModels.push(modelId))
            API->>DB: Add to ModelProfile<br/>(approvedBusinesses.push(businessId))
            API->>DB: Commit Transaction
            API->>Email: Send Approval Email to Business
            Email-->>Business: Consent Approved Email
            API-->>UI: Success: Consent Approved
        else Reject
            API->>DB: Update ConsentRequest<br/>{status: 'REJECTED'}
            API->>Email: Send Rejection Email to Business
            Email-->>Business: Consent Rejected Email
            API-->>UI: Success: Consent Rejected
        end
    end
```

---

## 5. Model Purchase Flow

```mermaid
sequenceDiagram
    participant Business as Business User
    participant UI as Frontend
    participant API as API Routes
    participant DB as MongoDB
    participant Lemon as Lemon Squeezy
    participant Email as Resend
    participant Model as Model User

    %% Step 1: Check Purchase Status
    Business->>UI: View Human Model
    UI->>API: GET /api/models/[id]/purchase-status
    API->>DB: Check if Purchased<br/>(businessProfile.purchasedModels)
    DB-->>API: Purchase Status
    API-->>UI: Return Status
    
    alt Not Purchased
        %% Step 2: Check Consent (if required)
        UI->>API: Check Consent Status
        API->>DB: Check Consent
        alt Consent Required & Not Approved
            UI-->>Business: Show: "Request Consent First"
        else Can Purchase
            %% Step 3: Initiate Purchase
            Business->>UI: Click Purchase
            UI->>API: POST /api/models/purchase/checkout<br/>{modelId}
            API->>DB: Fetch Model Profile
            API->>DB: Calculate Price<br/>(model.price)
            API->>Lemon: Create Checkout Session<br/>{price, custom_data: {modelId, userId}}
            Lemon-->>API: Checkout URL
            API-->>UI: Redirect to Checkout
            Business->>Lemon: Complete Payment
            
            %% Step 4: Payment Webhook
            Lemon->>API: Webhook: order_created<br/>(or subscription_created)
            API->>API: Verify Signature
            API->>DB: Start Transaction
            API->>DB: Create ModelPurchase Record<br/>{status: 'completed',<br/>platformCommission: 10%,<br/>modelEarnings: 90%}
            API->>DB: Update BusinessProfile<br/>(purchasedModels.push(modelId))
            API->>DB: Update ModelProfile<br/>(availableBalance += 90% of price)
            API->>DB: Commit Transaction
            API->>Email: Send Purchase Confirmation
            Email-->>Business: Purchase Confirmation
            Email-->>Model: Earnings Notification
            Lemon-->>UI: Redirect to Success
        end
    else Already Purchased
        UI-->>Business: Show "Purchased" Badge
    end
```

---

## 6. Credit Management Flow

```mermaid
flowchart TD
    START[User Action: Generate Image]
    
    START --> CHECK_SUB{Check Subscription<br/>Tier}
    
    CHECK_SUB -->|Free Tier| FREE_CHECK{30 Days<br/>Passed?}
    CHECK_SUB -->|Paid Tier| PAID_CHECK{Subscription<br/>Active?}
    
    FREE_CHECK -->|Yes| FREE_RESET[Auto-Reset Credits<br/>to 3]
    FREE_CHECK -->|No| FREE_CONTINUE[Continue]
    FREE_RESET --> FREE_CONTINUE
    
    PAID_CHECK -->|No - Past Due| BLOCK[Block Generation<br/>Show Upgrade]
    PAID_CHECK -->|Yes| PAID_CONTINUE[Continue]
    
    FREE_CONTINUE --> CHECK_CREDITS{Credits<br/>>= 1?}
    PAID_CONTINUE --> CHECK_CREDITS
    
    CHECK_CREDITS -->|No| ERROR[Return Error:<br/>Insufficient Credits]
    CHECK_CREDITS -->|Yes| DEDUCT[Start Transaction]
    
    DEDUCT --> DEDUCT_CREDIT[Deduct 1 Credit<br/>aiCreditsRemaining--]
    DEDUCT_CREDIT --> LOG[Create Credit Transaction<br/>Log Entry]
    LOG --> COMMIT[Commit Transaction]
    COMMIT --> SUCCESS[Generation Proceeds]
    
    ERROR --> END_ERROR[End: Error Response]
    SUCCESS --> END_SUCCESS[End: Generate Image]
    
    style FREE_RESET fill:#fff4e6
    style BLOCK fill:#ffebee
    style ERROR fill:#ffebee
    style SUCCESS fill:#e8f5e9
```

---

## 7. Watermarking Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend
    participant API as API Routes
    participant DB as MongoDB
    participant S3 as AWS S3
    participant CDN as CloudFront CDN

    %% Display Preview (Always Watermarked)
    User->>UI: View Render History
    UI->>API: GET /api/render/history
    API->>DB: Fetch Renders
    DB-->>API: Render List with previewImageUrl
    API-->>UI: Return History
    
    alt previewImageUrl Exists
        UI->>API: GET previewImageUrl<br/>(/api/images/[id]/watermarked)
    else Construct URL
        UI->>API: GET /api/images/[id]/watermarked?type=ai
    end
    
    API->>DB: Verify Ownership
    API->>S3: Fetch Original Image
    S3-->>API: Original Image Buffer
    API->>API: Apply Watermark (Sharp)
    API-->>UI: Return Watermarked Image<br/>(with cache headers)
    UI->>User: Display Watermarked Preview
    
    %% Download Flow
    User->>UI: Click Download
    UI->>API: GET /api/render/download?id=[id]
    
    API->>DB: Check Subscription Tier
    API->>DB: Check Purchase Status (if human model)
    
    alt Free Tier + AI Model
        API->>S3: Fetch Original
        API->>API: Apply Watermark
        API-->>UI: Return Watermarked Image
    else Paid Tier + AI Model
        API->>S3: Fetch Original
        API-->>UI: Return Non-Watermarked Image
    else Human Model + Not Purchased
        API-->>UI: Error: Purchase Required
    else Human Model + Purchased
        API->>S3: Fetch Original
        API-->>UI: Return Non-Watermarked Image
    end
```

---

## 8. Webhook Processing Flow

```mermaid
flowchart TD
    START[External Service Event]
    
    START --> CLERK_EVENT{Clerk<br/>Event?}
    START --> LEMON_EVENT{Lemon Squeezy<br/>Event?}
    START --> STRIPE_EVENT{Stripe<br/>Event?}
    
    %% Clerk Webhook
    CLERK_EVENT -->|Yes| CLERK_VERIFY[Verify Svix Signature]
    CLERK_VERIFY --> CLERK_TYPE{Event Type}
    CLERK_TYPE -->|user.created| CLERK_CREATE[Create User in MongoDB<br/>Set role: null]
    CLERK_TYPE -->|user.updated| CLERK_UPDATE[Update User Data]
    CLERK_TYPE -->|user.deleted| CLERK_DELETE[Archive User Data]
    
    %% Lemon Squeezy Webhook
    LEMON_EVENT -->|Yes| LEMON_VERIFY[Verify HMAC Signature]
    LEMON_VERIFY --> LEMON_TYPE{Event Type}
    LEMON_TYPE -->|subscription_created| LEMON_SUB_CREATE[Create Subscription<br/>Allocate Credits]
    LEMON_TYPE -->|subscription_payment_success| LEMON_RENEWAL[Reset Credits<br/>Create Invoice]
    LEMON_TYPE -->|subscription_updated| LEMON_UPDATE[Update Plan<br/>Adjust Credits]
    LEMON_TYPE -->|subscription_cancelled| LEMON_CANCEL[Downgrade to Free<br/>Set Credits to 3]
    LEMON_TYPE -->|order_created| LEMON_ORDER[Process One-time Payment<br/>(Model Purchase)]
    
    %% Stripe Webhook (if used)
    STRIPE_EVENT -->|Yes| STRIPE_VERIFY[Verify Stripe Signature]
    STRIPE_VERIFY --> STRIPE_TYPE{Event Type}
    STRIPE_TYPE -->|checkout.session.completed| STRIPE_CHECKOUT[Process Checkout]
    STRIPE_TYPE -->|invoice.paid| STRIPE_INVOICE[Process Invoice]
    
    %% All paths converge
    CLERK_CREATE --> SAVE[Save to MongoDB]
    CLERK_UPDATE --> SAVE
    CLERK_DELETE --> SAVE
    LEMON_SUB_CREATE --> SAVE
    LEMON_RENEWAL --> SAVE
    LEMON_UPDATE --> SAVE
    LEMON_CANCEL --> SAVE
    LEMON_ORDER --> SAVE
    STRIPE_CHECKOUT --> SAVE
    STRIPE_INVOICE --> SAVE
    
    SAVE --> EMAIL[Send Email Notification]
    EMAIL --> END[End: Webhook Processed]
    
    style CLERK_VERIFY fill:#e3f2fd
    style LEMON_VERIFY fill:#fff3e0
    style STRIPE_VERIFY fill:#f3e5f5
    style SAVE fill:#e8f5e9
```

---

## 9. Free Tier Credit Reset Flow (Cron Job)

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron
    participant API as /api/cron/reset-free-credits
    participant DB as MongoDB
    participant Email as Resend

    Note over Cron: Daily at Midnight UTC
    
    Cron->>API: GET /api/cron/reset-free-credits<br/>(with secret token)
    API->>API: Verify RENDER_WORKER_SECRET
    
    alt Invalid Secret
        API-->>Cron: 401 Unauthorized
    else Valid Secret
        API->>DB: Find All Free Tier Users<br/>(subscriptionTier: 'free')
        DB-->>API: Free Tier Users List
        
        loop For Each User
            API->>API: Calculate Days Since<br/>lastCreditReset
            
            alt 30+ Days Passed
                API->>DB: Start Transaction
                API->>DB: Reset Credits<br/>(aiCreditsRemaining = 3)
                API->>DB: Update lastCreditReset = NOW
                API->>DB: Commit Transaction
                API->>Email: Send Credit Reset Email (Optional)
            else Less Than 30 Days
                Note over API: Skip User
            end
        end
        
        API-->>Cron: Success: X users reset
    end
```

---

## 10. Complete User Onboarding Flow

```mermaid
sequenceDiagram
    participant User as New User
    participant Clerk as Clerk Auth
    participant Webhook as Clerk Webhook
    participant API as API Routes
    participant DB as MongoDB
    participant UI as Frontend

    %% Step 1: Sign Up
    User->>Clerk: Sign Up (Email/Google)
    Clerk->>Clerk: Create User Account
    Clerk->>Webhook: POST /api/webhook/clerk<br/>(user.created event)
    Webhook->>DB: Create User Record<br/>{id: clerkId, role: null}
    DB-->>Webhook: User Created
    Webhook-->>Clerk: Success
    
    %% Step 2: Redirect to Onboarding
    Clerk-->>UI: Redirect to /onboarding
    UI->>API: GET /onboarding
    API->>DB: Check User Role
    DB-->>API: role: null
    API-->>UI: Show Onboarding Page
    
    %% Step 3: Role Selection
    User->>UI: Select Role (BUSINESS/MODEL)
    UI->>API: POST /api/user/role<br/>{role: 'BUSINESS'}
    
    %% Step 4: Create Profile
    API->>DB: Start Transaction
    API->>DB: Update User<br/>{role: 'BUSINESS'}
    API->>DB: Create BusinessProfile<br/>{subscriptionTier: 'free',<br/>aiCreditsRemaining: 3}
    API->>DB: Commit Transaction
    DB-->>API: Profile Created
    API-->>UI: Success
    
    %% Step 5: Redirect to Dashboard
    UI->>UI: Redirect to /dashboard/business/generate
    UI->>API: GET /dashboard/business/generate
    API->>DB: Fetch BusinessProfile
    DB-->>API: Profile Data
    API-->>UI: Render Dashboard
    UI->>User: Show Generate Page
```

---

## 11. Model Earnings & Payout Flow

```mermaid
sequenceDiagram
    participant Business as Business User
    participant Lemon as Lemon Squeezy
    participant Webhook as Lemon Webhook
    participant API as API Routes
    participant DB as MongoDB
    participant Model as Model User
    participant Admin as Admin User
    participant Email as Resend

    %% Step 1: Model Purchase
    Business->>Lemon: Purchase Human Model
    Lemon->>Webhook: Webhook: order_created
    Webhook->>DB: Create ModelPurchase<br/>{modelEarnings: 90%,<br/>platformCommission: 10%}
    Webhook->>DB: Update ModelProfile<br/>(availableBalance += 90%)
    Webhook->>Email: Notify Model of Earnings
    Email-->>Model: Earnings Notification
    
    %% Step 2: Model Requests Payout
    Model->>UI: View Earnings Dashboard
    UI->>API: GET /api/model/dashboard/stats
    API->>DB: Fetch ModelProfile
    DB-->>API: availableBalance
    API-->>UI: Return Earnings
    
    Model->>UI: Click Request Payout
    UI->>API: POST /api/model/payout/request<br/>{amount, bankDetails}
    API->>DB: Create PayoutRequest<br/>{status: 'pending',<br/>amount, modelId}
    API->>Email: Notify Admin
    Email-->>Admin: New Payout Request
    
    %% Step 3: Admin Processes Payout
    Admin->>UI: View Payout Requests
    UI->>API: GET /api/admin/payouts
    API->>DB: Fetch Pending Payouts
    DB-->>API: Payout List
    API-->>UI: Return Payouts
    
    Admin->>UI: Approve Payout
    UI->>API: POST /api/admin/payouts<br/>{payoutId, action: 'approve'}
    API->>DB: Start Transaction
    API->>DB: Update PayoutRequest<br/>{status: 'approved'}
    API->>DB: Update ModelProfile<br/>(availableBalance -= amount)
    API->>DB: Commit Transaction
    API->>Email: Notify Model
    Email-->>Model: Payout Approved Email
    
    %% Step 4: Admin Completes Payout
    Admin->>UI: Mark as Completed
    UI->>API: POST /api/admin/payouts<br/>{payoutId, action: 'complete'}
    API->>DB: Update PayoutRequest<br/>{status: 'completed'}
    API->>Email: Send Completion Email
    Email-->>Model: Payout Completed Email
```

---

## 12. Batch Rendering Flow

```mermaid
sequenceDiagram
    participant User as Business User
    participant UI as Frontend
    participant API as API Routes
    participant Queue as Render Queue
    participant Worker as Render Worker
    participant DB as MongoDB
    participant S3 as AWS S3
    participant Fashn as Fashn.ai API

    %% Step 1: Initiate Batch
    User->>UI: Upload Multiple Garments
    User->>UI: Select Avatar
    User->>UI: Click Batch Generate
    UI->>API: POST /api/render/batch<br/>{garmentUrls[], avatarId}
    
    %% Step 2: Validation
    API->>DB: Check Credits<br/>(aiCreditsRemaining >= count)
    alt Insufficient Credits
        API-->>UI: Error: Insufficient Credits
    else Credits Available
        %% Step 3: Create Batch
        API->>DB: Create Batch Record<br/>{batchId, status: 'processing'}
        API->>Queue: Add Items to Queue
        
        loop For Each Garment
            API->>Queue: Queue Item<br/>{garmentUrl, avatarId, batchId}
        end
        
        API-->>UI: Return Batch ID<br/>{batchId, status: 'processing'}
        
        %% Step 4: Process Queue (Worker)
        Worker->>Queue: Poll Queue Items
        Queue-->>Worker: Next Item
        
        loop For Each Item
            Worker->>DB: Fetch Item Details
            Worker->>S3: Fetch Garment Image
            Worker->>S3: Fetch Avatar Image
            Worker->>Fashn: Call Try-On API
            Fashn-->>Worker: Generated Image
            Worker->>S3: Store Generated Image
            Worker->>DB: Update Item Status<br/>{status: 'completed'}
        end
        
        %% Step 5: Complete Batch
        Worker->>DB: Check All Items Complete
        Worker->>DB: Update Batch Status<br/>{status: 'completed'}
        Worker->>DB: Deduct Credits (Total Count)
        Worker->>Email: Send Batch Completion Email
        
        %% Step 6: User Checks Status
        User->>UI: View Batch Status
        UI->>API: GET /api/render/batch/[batchId]
        API->>DB: Fetch Batch Status
        DB-->>API: Batch Status + Items
        API-->>UI: Return Status
    end
```

---

## Data Flow Summary

### Key Data Flows:

1. **Image Upload Flow:** Client → API → S3 (Pre-signed URL) → Direct Upload
2. **Render Generation Flow:** Client → API → Credit Check → Fashn.ai → S3 → DB Update
3. **Payment Flow:** Client → API → Lemon Squeezy → Webhook → DB Update → Email
4. **Consent Flow:** Business → API → DB → Email → Model → API → DB Update
5. **Watermarking Flow:** Client → API → S3 Fetch → Apply Watermark → Return
6. **Credit Reset Flow:** Cron → API → DB Query → DB Update → Email (optional)

### Data Storage Locations:

- **MongoDB:** User data, profiles, renders, generations, consent, invoices, purchases, transactions
- **AWS S3:** All images (garments, generated, model references, avatars)
- **CloudFront CDN:** Cached images for fast delivery

### Critical Transactions:

- Credit deduction (atomic)
- Subscription updates (atomic)
- Model purchase processing (atomic)
- Consent approval (atomic)
- Payout processing (atomic)

---

**Last Updated:** January 18, 2026
