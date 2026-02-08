# ModelSnapper Database Schemas

Below is the complete, structured MongoDB schema documentation for all collections.

---

## 📌 **users**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique ID for the user document. |
| clerkId | String | Foreign Key | Unique | Links to the Clerk user ID (critical for auth). |
| email | String |  | Unique | User's primary email. |
| role | String |  | Single | `'BUSINESS'`, `'MODEL'`, or `'ADMIN'`. |
| createdAt | Date |  |  | Timestamp of creation. |

---

## 📌 **business_profiles**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique profile ID. |
| userId | ObjectId | Foreign Key | Unique | Links to user in **users**. |
| businessName | String |  |  | Name of the boutique/company. |
| aiCredits | Number |  |  | Remaining AI photo credits. **CRITICAL**. |
| subscriptionStatus | String |  |  | `'STARTER'`, `'GROWTER'`, `'FREE'`, etc. |
| approvedModels | Array<ObjectId> | Foreign Key |  | Whitelist of Human Model IDs (refs `model_profiles._id`). |
| stripeCustomerId | String |  | Single | Stripe customer ID. |
| packageId | ObjectId | Foreign Key |  | Ref to **packages** collection. |

---

## 📌 **model_profiles**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique model profile ID. |
| userId | ObjectId | Foreign Key | Unique | Links to user in **users**. |
| name | String |  |  | Public display name. |
| royaltyBalance | Number |  |  | Accumulated earnings. **CRITICAL**. |
| referenceImages | Array<String> (S3 URLs) |  |  | 3–4 likeness reference images. |
| approvedBusinesses | Array<ObjectId> | Foreign Key |  | Allowed business IDs (refs `business_profiles.userId`). |
| consentSigned | Boolean |  |  | Confirms digital likeness release. |

---

## 📌 **consent_requests**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique request ID. |
| businessId | ObjectId | Foreign Key | Compound | Business requesting consent (refs `users._id`). |
| modelId | ObjectId | Foreign Key | Compound | Model being asked (refs `users._id`). |
| status | String |  | Compound | `'PENDING'`, `'APPROVED'`, `'REJECTED'`. |
| requestedAt | Date |  | Single | Created timestamp. |
| **Combined Index** | N/A |  | Compound Index | `(businessId, modelId)` for quick lookup. |

---

## 📌 **generations**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique generation ID. |
| userId | ObjectId | Foreign Key | Compound | Business user (refs `users._id`). |
| modelId | ObjectId | Foreign Key | Compound | Human model used (refs `users._id`) or `null` for AI avatar. |
| modelType | String |  |  | `'AI_AVATAR'` or `'HUMAN_MODEL'`. |
| outputS3Url | String |  |  | Final generated image S3 URL. |
| royaltyPaid | Number |  |  | `$1.00` if human model, `$0` otherwise. |
| generatedAt | Date |  | Compound | Timestamp. |
| **Index** | N/A |  | Compound Index | `(userId, generatedAt)` — history lookup. |
| **Index** | N/A |  | Compound Index | `(modelId, generatedAt)` — royalty tracking. |

---

## 📌 **packages**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique package ID. |
| stripePriceId | String |  | Unique | Direct Stripe pricing object link. **CRITICAL**. |
| name | String |  |  | E.g., `'STARTER TIER'`. |
| aiCreditsGranted | Number |  |  | Credits per purchase. |
| humanModelAccess | Boolean |  |  | Enables Human Model marketplace. |
| isActive | Boolean |  | Single | Display/hide package. |

---

## 📌 **ai_avatars**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique AI avatar ID. |
| name | String |  |  | Display name (e.g., *AI Model Sophia*). |
| s3Url | String |  |  | Canonical reference image in S3. |
| isActive | Boolean |  | Single | Show/hide avatar. |

---

## 📌 **invoices**
| Field Name | Data Type | Key Type | Indexing | Description |
|-----------|-----------|----------|----------|-------------|
| _id | ObjectId | Primary Key | Default | Unique invoice ID. |
| userId | ObjectId | Foreign Key | Single | Business owner (refs `users._id`). |
| stripeInvoiceId | String |  | Unique | Stripe invoice ID (e.g., `in_...`). |
| invoiceNumber | String |  | Single | Human-readable invoice number. |
| amountDue | Number |  |  | Final payable amount. |
| currency | String |  |  | e.g., `'USD'`. |
| status | String |  | Single | `'draft'`, `'open'`, `'paid'`, `'uncollectible'`. |
| pdfUrl | String |  |  | Stripe-hosted PDF. **CRITICAL**. |
| hostedInvoiceUrl | String |  |  | Stripe-hosted invoice page. |
| periodStart | Date |  |  | Start of billing cycle. |
| periodEnd | Date |  |  | End of billing cycle. |
| lineItems | Array (Embedded) |  |  | Optional snapshot of line items. |
| paidAt | Date \| null |  |  | When payment was confirmed. |

---

If you want, I can also generate **Mongoose models**, **Zod schemas**, or a **Prisma schema equivalent**.

