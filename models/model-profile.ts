import mongoose, { Schema } from "mongoose";

/**
 * Model Profile Schema
 * Stores human model profile information and settings
 */
const ModelProfileSchema = new Schema(
  {
    // ============================================
    // BASIC INFORMATION
    // ============================================
    // Link to user
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Public information
    name: {
      type: String,
      required: true,
    },

    // Portfolio fields
    displayName: {
      type: String,
    },

    bio: {
      type: String,
      maxlength: 500,
    },

    // ============================================
    // PROFILE PHOTOS
    // ============================================
    // PRIMARY PHOTO (Front-facing, hero shot) - Simple URL
    primaryPhoto: {
      type: String,
    },

    // ADDITIONAL REFERENCE PHOTOS (3-4 angles) - Array of URLs
    referencePhotos: [{
      type: String,
    }],

    // DEPRECATED (kept for backward compatibility)
    // Will be removed in future version
    // Auto-synced: primaryPhoto + referencePhotos
    referenceImages: [
      {
        type: String, // S3 URLs
      },
    ],

    // ============================================
    // MODELING SPECIALTIES
    // ============================================
    specialties: {
      clothingCategories: [{
        type: String,
        enum: [
          'tops',
          'bottoms',
          'dresses',
          'activewear',
          'outerwear',
          'swimwear',
          'one-pieces',
          'accessories'
        ],
      }],
      modelingStyles: [{
        type: String,
        enum: [
          'lifestyle',
          'e-commerce',
          'editorial',
          'fitness',
          'formal',
          'casual'
        ],
      }],
    },

    // ============================================
    // CONSENT & PERMISSIONS
    // ============================================
    // Does this model require consent before purchase?
    requiresConsent: {
      type: Boolean,
      default: true,
      index: true,
    },

    // DEPRECATED: Keep for backward compatibility
    // Maps to requiresConsent
    consentRequired: {
      type: Boolean,
      default: false,
    },

    // Has model signed general consent agreement?
    consentSigned: {
      type: Boolean,
      default: false,
    },

    // Timestamp of consent agreement
    consentSignedAt: {
      type: Date,
    },

    // List of businesses that have been approved by this model
    approvedBusinesses: [
      {
        type: Schema.Types.ObjectId,
        ref: "BusinessProfile",
        index: true,
      },
    ],

    // ============================================
    // PRICING (One-time Purchase Model)
    // ============================================
    // One-time purchase price for brand to access model
    pricePerAccess: {
      type: Number,
      default: 50,
      min: 10,
      max: 500,
    },

    // DEPRECATED: Keep for backward compatibility
    // Maps to pricePerAccess
    price: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: 'usd',
      enum: ['usd', 'lkr', 'eur', 'gbp'],
    },

    // ============================================
    // EARNINGS & PAYOUTS
    // ============================================
    // Total gross earnings (100% of all purchases)
    totalEarnings: {
      type: Number,
      default: 0,
      index: true,
    },

    // Platform commission kept (10% of purchases)
    platformCommission: {
      type: Number,
      default: 0,
    },

    // Available balance for payout (90% of purchases)
    availableBalance: {
      type: Number,
      default: 0,
      index: true,
    },

    // Total amount paid out to model
    totalPaidOut: {
      type: Number,
      default: 0,
    },

    // DEPRECATED: No longer used (models earn from purchases, not generations)
    // Kept for backward compatibility
    royaltyBalance: {
      type: Number,
      default: 0,
    },

    // Pending payout requests
    pendingPayouts: {
      type: Number,
      default: 0,
    },

    // Last payout date
    lastPayoutAt: {
      type: Date,
    },

    // ============================================
    // STRIPE CONNECT (For Automated Payouts)
    // ============================================
    // Stripe connected account ID
    stripeConnectedAccountId: {
      type: String,
      index: true,
    },

    // Has model completed Stripe onboarding?
    stripeOnboardingComplete: {
      type: Boolean,
      default: false,
    },

    // Can model receive payouts?
    stripePayoutsEnabled: {
      type: Boolean,
      default: false,
    },

    // ============================================
    // MANUAL PAYOUT DETAILS (For Non-Stripe Models)
    // ============================================
    manualPayoutDetails: {
      method: {
        type: String,
        enum: ['bank_transfer', 'paypal', 'wise', 'other'],
      },
      // Bank details (encrypted in production)
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
      swiftCode: String,
      routingNumber: String,
      branchCode: String,
      // PayPal
      paypalEmail: String,
      // Other details
      notes: String,
    },

    // ============================================
    // PERSONAL INFORMATION
    // ============================================
    phoneNumber: {
      type: String,
    },

    // Payment methods preferences
    paymentMethods: {
      preferredMethod: {
        type: String,
        enum: ['stripe_connect', 'paypal', 'bank_transfer', 'manual'],
      },
      stripeConnectedAccountId: String,
      paypalEmail: String,
      bankDetails: {
        bankName: String,
        accountNumber: String,
        accountHolderName: String,
        swiftCode: String,
        routingNumber: String,
        branchCode: String,
      },
    },

    // Activity status (synonym for status)
    activeness: {
      type: String,
      enum: ['active', 'paused', 'inactive'],
    },

    // ============================================
    // STATISTICS & ANALYTICS
    // ============================================
    // Number of businesses that purchased access
    totalPurchases: {
      type: Number,
      default: 0,
      index: true,
    },

    // Total number of images generated using this model
    totalGenerations: {
      type: Number,
      default: 0,
      index: true,
    },

    // Profile views in marketplace
    profileViews: {
      type: Number,
      default: 0,
    },

    // Number of consent requests received
    consentRequestsReceived: {
      type: Number,
      default: 0,
    },

    // Number of consent requests approved
    consentRequestsApproved: {
      type: Number,
      default: 0,
    },

    // Average rating from businesses (future feature)
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
    },

    // ============================================
    // STATUS & VISIBILITY
    // ============================================
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'inactive', 'suspended', 'deleted'],
      default: 'draft',
      index: true,
    },

    // Is profile visible in marketplace?
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Featured model badge
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Verified model badge
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Profile completion percentage (0-100)
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ============================================
    // METADATA & TIMESTAMPS
    // ============================================
    // When profile was activated/published
    activatedAt: {
      type: Date,
    },

    // Last time model updated their profile
    lastModifiedAt: {
      type: Date,
    },

    // Admin notes (internal use only)
    adminNotes: {
      type: String,
    },

    // FASHN model ID if available
    fashnModelId: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Basic indexes
ModelProfileSchema.index({ userId: 1 });
ModelProfileSchema.index({ status: 1 });
ModelProfileSchema.index({ royaltyBalance: -1 }); // For sorting by earnings

// Compound indexes
ModelProfileSchema.index({ status: 1, isVisible: 1 }); // Marketplace queries
ModelProfileSchema.index({ requiresConsent: 1, status: 1 }); // Filtering
ModelProfileSchema.index({ pricePerAccess: 1, status: 1 }); // Price sorting
ModelProfileSchema.index({ totalPurchases: -1, status: 1 }); // Popular models
ModelProfileSchema.index({ createdAt: -1, status: 1 }); // Recent models

// Text search index
ModelProfileSchema.index({
  name: 'text',
  displayName: 'text',
  bio: 'text',
});

// ============================================
// VIRTUAL FIELDS
// ============================================

// Calculate conversion rate (purchases / views)
ModelProfileSchema.virtual('conversionRate').get(function() {
  if (this.profileViews === 0) return 0;
  return (this.totalPurchases / this.profileViews) * 100;
});

// Calculate average generation per purchase
ModelProfileSchema.virtual('avgGenerationsPerPurchase').get(function() {
  if (this.totalPurchases === 0) return 0;
  return Math.round(this.totalGenerations / this.totalPurchases);
});

// Check if model can receive payouts
ModelProfileSchema.virtual('canReceivePayout').get(function() {
  const MIN_PAYOUT = 20;
  return this.availableBalance >= MIN_PAYOUT &&
    (this.stripePayoutsEnabled || this.manualPayoutDetails?.method || this.paymentMethods?.preferredMethod);
});

// Get all photo URLs (primary + reference)
ModelProfileSchema.virtual('allPhotos').get(function() {
  const photos = [];
  if (this.primaryPhoto) photos.push(this.primaryPhoto);
  if (this.referencePhotos) photos.push(...this.referencePhotos);
  return photos.filter(Boolean);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a business has access to this model (purchased or approved)
 */
ModelProfileSchema.methods.hasBusinessAccess = function(businessId: string): boolean {
  if (!this.requiresConsent) {
    // No consent required - check if purchased
    // This will be checked against BusinessProfile.purchasedModels
    return true; // Additional check needed in business service
  }

  // Consent required - check if approved
  return this.approvedBusinesses.some(
    (id: any) => id.toString() === businessId.toString()
  );
};

/**
 * Approve a business for this model
 */
ModelProfileSchema.methods.approveBusiness = async function(businessId: string) {
  if (!this.approvedBusinesses.includes(businessId)) {
    this.approvedBusinesses.push(businessId);
    this.consentRequestsApproved += 1;
    await this.save();
  }
};

/**
 * Remove business approval
 */
ModelProfileSchema.methods.revokeBusiness = async function(businessId: string) {
  this.approvedBusinesses = this.approvedBusinesses.filter(
    (id: any) => id.toString() !== businessId.toString()
  );
  await this.save();
};

/**
 * Record a purchase
 */
ModelProfileSchema.methods.recordPurchase = async function(amount: number) {
  const platformFee = amount * 0.10;
  const modelEarnings = amount * 0.90;

  this.totalPurchases += 1;
  this.totalEarnings += amount;
  this.platformCommission += platformFee;
  this.availableBalance += modelEarnings;

  await this.save();
};

/**
 * Record a generation
 */
ModelProfileSchema.methods.recordGeneration = async function() {
  this.totalGenerations += 1;
  await this.save();
};

/**
 * Record a payout
 */
ModelProfileSchema.methods.recordPayout = async function(amount: number) {
  this.availableBalance -= amount;
  this.totalPaidOut += amount;
  this.lastPayoutAt = new Date();

  await this.save();
};

/**
 * Calculate profile completeness
 */
ModelProfileSchema.methods.calculateCompleteness = function(): number {
  let score = 0;
  const checks = [
    { field: 'name', weight: 10 },
    { field: 'bio', weight: 10 },
    { field: 'primaryPhoto', weight: 25 },
    { field: 'referencePhotos', weight: 20, min: 3 },
    { field: 'pricePerAccess', weight: 10 },
    { field: 'specialties.clothingCategories', weight: 10, min: 1 },
    { field: 'consentSigned', weight: 15 },
  ];

  checks.forEach(check => {
    const value = this.get(check.field);

    if (Array.isArray(value)) {
      const minLength = check.min || 1;
      if (value.length >= minLength) {
        score += check.weight;
      }
    } else if (typeof value === 'boolean') {
      if (value) score += check.weight;
    } else if (value) {
      score += check.weight;
    }
  });

  return Math.min(score, 100);
};

/**
 * Update profile completeness score
 */
ModelProfileSchema.methods.updateCompleteness = async function() {
  this.profileCompleteness = this.calculateCompleteness();
  await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get models available in marketplace
 */
ModelProfileSchema.statics.getMarketplaceModels = function(filters = {}) {
  return this.find({
    status: 'active',
    isVisible: true,
    ...filters,
  })
    .select('-adminNotes -manualPayoutDetails')
    .sort({ isFeatured: -1, totalPurchases: -1 });
};

/**
 * Search models by text
 */
ModelProfileSchema.statics.searchModels = function(searchText: string) {
  return this.find({
    $text: { $search: searchText },
    status: 'active',
    isVisible: true,
  })
    .select('-adminNotes -manualPayoutDetails')
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Get top earning models
 */
ModelProfileSchema.statics.getTopEarners = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ totalEarnings: -1 })
    .limit(limit)
    .select('name displayName totalEarnings totalPurchases primaryPhoto');
};

// ============================================
// MIDDLEWARE HOOKS
// ============================================

// Update timestamp on save and sync backward compatibility fields
ModelProfileSchema.pre('save', function(next) {
  // Safety check - ensure document exists
  if (!this) {
    return next();
  }

  this.updatedAt = new Date();

  // Set displayName default to name if not provided
  if (!this.displayName && this.name && typeof this.name === 'string' && this.name.trim()) {
    this.displayName = this.name;
  }

  // Update lastModifiedAt if any field changed (except stats)
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
  }

  // Activate profile if status changed to active
  if (this.isModified('status') && this.status === 'active' && !this.activatedAt) {
    this.activatedAt = new Date();
  }

  // Sync referenceImages with primaryPhoto + referencePhotos (backward compatibility)
  if (this.primaryPhoto || this.referencePhotos) {
    const allUrls = [];
    if (this.primaryPhoto) allUrls.push(this.primaryPhoto);
    if (this.referencePhotos && this.referencePhotos.length > 0) {
      allUrls.push(...this.referencePhotos);
    }
    this.referenceImages = allUrls.filter(Boolean);
  }

  // Sync price with pricePerAccess (backward compatibility)
  if (this.pricePerAccess && !this.price) {
    this.price = this.pricePerAccess;
  } else if (this.price && !this.pricePerAccess) {
    this.pricePerAccess = this.price;
  }

  // Sync consentRequired with requiresConsent (backward compatibility)
  if (this.requiresConsent !== undefined) {
    this.consentRequired = this.requiresConsent;
  } else if (this.consentRequired !== undefined) {
    this.requiresConsent = this.consentRequired;
  }

  // Sync activeness with status (backward compatibility)
  // Only sync if status is one of the valid activeness values
  if (this.activeness && !this.status) {
    this.status = this.activeness as any;
  } else if (this.status && !this.activeness) {
    const validActivenessValues: string[] = ['active', 'paused', 'inactive'];
    if (validActivenessValues.includes(this.status)) {
      (this as any).activeness = this.status;
    }
  }

  next();
});

// Update profile completeness after save
ModelProfileSchema.post('save', async function(doc) {
  const modelDoc = doc as any;
  if (modelDoc.calculateCompleteness) {
    const newCompleteness = modelDoc.calculateCompleteness();
    if (modelDoc.profileCompleteness !== newCompleteness) {
      await modelDoc.updateOne({ profileCompleteness: newCompleteness });
    }
  }
});

// ============================================
// EXPORT MODEL
// ============================================

const ModelProfile =
  mongoose.models.ModelProfile ||
  mongoose.model("ModelProfile", ModelProfileSchema);

export default ModelProfile;

