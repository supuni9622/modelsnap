# ModelSnap User Flow Diagrams (Business & Model)

Below are the full user flow diagrams in Markdown format, covering both roles:
- **Business Flow** (AI Avatar & Human Model usage)
- **Model Flow** (consent, approvals, royalties)

All flows respect the rule:
> **A business must request consent once per model. After approval, the business can use the human model anytime.**

---

# 🧩 **Business User Flow**

## **1. Signup & Setup**
```mermaid
graph TD
A[Business Sign Up via Clerk] --> B[Create Business Profile]
B --> C[Select Package / Free Tier]
C --> D[Receive AI Credits]
```

---

## **2. Choose Image Creation Path**
```mermaid
graph TD
A[Dashboard] --> B{Choose Model Type}
B --> C[AI Avatar]
B --> D[Human Model]
```

---

## **3A. AI Avatar Workflow**
```mermaid
graph TD
A[Choose AI Avatar] --> B[Upload Garment Image]
B --> C[Generate Preview]
C --> D[Consumes AI Credits]
D --> E[Deliver Final Image]
```

---

## **3B. Human Model Workflow**

### **Step 1 — Model Browsing**
```mermaid
graph TB
A[Browse Human Model Marketplace] --> B[View Model Profile]
B --> C{Do We Have Consent?}
C -- Yes --> D[Upload Garment]
C -- No --> E[Request Consent]
```

### **Step 2 — Consent Request**
```mermaid
graph TD
E[Request Consent] --> F[Model Receives Notification]
F --> G[Wait for Model Response]
G -->|Approved| H[Consent Stored]
G -->|Rejected| I[Stop - Cannot Use Model]
```

### **Step 3 — Post-Consent Flow**
```mermaid
graph TD
H[Consent Approved Once] --> J[Upload Garment]
J --> K[Generate Image]
K --> L[Pays Royalty to Model]
L --> M[Final Image Delivered]
```

> **Consent is one-time per business per model.** After that, the business can continue using the model without asking again.

---

# 🧩 **Model User Flow**

## **1. Signup & Profile Creation**
```mermaid
graph TD
A[Model Sign Up] --> B[Create Model Profile]
B --> C[Upload 3-4 Reference Images]
C --> D[Enable Digital Likeness Use]
```

---

## **2. Receiving Consent Requests**
```mermaid
graph TD
A[Business Requests Consent] --> B[Model Dashboard Notification]
B --> C[Review Business Profile]
C --> D{Approve or Reject?}
D -- Approve --> E[Consent Saved]
E --> F[Business Added to 'Approved Businesses']
D -- Reject --> G[Request Closed]
```

---

## **3. Human Model Usage → Earning Royalties**
```mermaid
graph TD
A[Business Uses Approved Model] --> B[Image Generation]
B --> C[Royalty Added]
C --> D[Royalty Balance Updates]
```

---

## **4. Payout Flow**
```mermaid
graph TD
A[Model Requests Payout] --> B[Admin Review]
B --> C[Transfer via Stripe/Bank]
C --> D[Royalty Balance = 0]
```

---

# ✅ Summary
This diagram set maps the entire ecosystem:
- Business onboarding → choosing between AI avatar or human model
- Automatic logic for consent checks
- One-time consent rule
- Royalty flow for human models
- Model approval, balance management, and payout

If you want, I can now generate **system sequence diagrams**, **API workflow diagrams**, or a **full architecture diagram** in Markdown + Mermaid.


## API Sequence Diagrams

```mermaid
sequenceDiagram
    participant UI as Frontend (Next.js)
    participant API as Backend API Routes
    participant FASHN as Fashn AI API
    participant S3 as AWS S3
    participant DB as MongoDB

    UI->>API: Upload product photo
    API->>S3: Store original image
    S3-->>API: Return S3 URL
    API->>DB: Save product metadata
    API-->>UI: Confirm upload

    UI->>API: Generate AI Model Image
    API->>FASHN: Send product + model params
    FASHN-->>API: Generated image URL
    API->>S3: Store generated image
    API->>DB: Log generation record
    API-->>UI: Return final image URL
```

---

## System Architecture Diagram

```mermaid
flowchart LR
    subgraph Client
        A[Next.js Frontend]
    end

    subgraph Backend
        B[Next.js Server Components / API Routes]
        C[Auth - Clerk]
        D[Payments - Stripe]
        E[AI Generation - Fashn API]
    end

    subgraph Storage
        F[S3 - Images]
        G[MongoDB - Collections]
    end

    A -->|Auth, Sessions| C
    A -->|API Calls| B
    B --> G
    B --> F
    B --> D
    B --> E
    D --> B
    E --> B
```

---

## Frontend Component & Route Flow

```mermaid
flowchart TB
    A[Landing Page]
    A --> B[Login / Sign Up]

    B -->|Business Role| C[Business Dashboard]
    B -->|Model Role| M[Model Dashboard]

    C --> C1[Upload Product]
    C --> C2[Choose AI Model]
    C --> C3[Choose Human Model]
    C --> C4[View My Generations]
    C --> C5[Billing & Subscription]

    M --> M1[Edit Profile]
    M --> M2[Consent Requests]
    M --> M3[Earnings & Payout]
```

---

## Consent Logic State Machine

```mermaid
stateDiagram-v2
    [*] --> NoRequest

    NoRequest --> Pending : Business Sends Request
    Pending --> Approved : Model Accepts
    Pending --> Rejected : Model Rejects

    Approved --> ActiveConsent
    Rejected --> NoRequest

    ActiveConsent --> Revoked : Model Revokes
    Revoked --> NoRequest
```

---

## Credit Usage Flow Diagram

```mermaid
flowchart LR
    A[Generation Request]
    A --> B{AI or Human Model?}

    B -->|AI Avatar| C[Check AI Credits]
    C -->|Credits Available| D[Generate]
    C -->|No Credits| E[Show Upgrade]

    B -->|Human Model| F[Check Consent]
    F -->|No Consent| G[Send Consent Request]
    F -->|Consent Approved| H[Charge $2]
    H --> D[Generate]

    D --> I[Store in S3]
    D --> J[Log in DB]
```

