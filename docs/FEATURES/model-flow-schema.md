// models/model-profile.ts
import mongoose from 'mongoose';

const modelProfileSchema = new mongoose.Schema({
  // ============================================
  // BASIC INFORMATION
  // ============================================
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true, 
    index: true 
  },
  
  name: { 
    type: String, 
    required: true 
  },
  
  displayName: { 
    type: String, 
    default: function() { return this.name; } 
  },
  
  bio: { 
    type: String, 
    maxlength: 500 
  },

  // ============================================
  // PROFILE PHOTOS
  // ============================================
  
  // PRIMARY PHOTO (Front-facing, hero shot) - Simple URL
  primaryPhoto: { 
    type: String, 
    required: true 
  },
  
  // ADDITIONAL REFERENCE PHOTOS (3-4 angles) - Array of URLs
  referencePhotos: [{ 
    type: String 
  }],
  
  // DEPRECATED (kept for backward compatibility)
  // Will be removed in future version
  // Auto-synced: primaryPhoto + referencePhotos
  referenceImages: [{ 
    type: String 
  }],

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
      ]
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
      ]
    }],
  },

  // ============================================
  // CONSENT & PERMISSIONS
  // ============================================
  
  // Does this model require consent before purchase?
  requiresConsent: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  
  // Has model signed general consent agreement?
  consentSigned: { 
    type: Boolean, 
    default: false 
  },
  
  // Timestamp of consent agreement
  consentSignedAt: { 
    type: Date 
  },
  
  // List of businesses that have been approved by this model
  approvedBusinesses: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'BusinessProfile',
    index: true 
  }],

  // ============================================
  // PRICING (One-time Purchase Model)
  // ============================================
  
  // One-time purchase price for brand to access model
  pricePerAccess: { 
    type: Number, 
    required: true,
    default: 50,
    min: 10,
    max: 500
  },
  
  currency: { 
    type: String, 
    default: 'usd',
    enum: ['usd', 'lkr', 'eur', 'gbp']
  },

  // ============================================
  // EARNINGS & PAYOUTS
  // ============================================
  
  // Total gross earnings (100% of all purchases)
  totalEarnings: { 
    type: Number, 
    default: 0,
    index: true 
  },
  
  // Platform commission kept (10% of purchases)
  platformCommission: { 
    type: Number, 
    default: 0 
  },
  
  // Available balance for payout (90% of purchases)
  availableBalance: { 
    type: Number, 
    default: 0,
    index: true 
  },
  
  // Total amount paid out to model
  totalPaidOut: { 
    type: Number, 
    default: 0 
  },
  
  // DEPRECATED: No longer used (models earn from purchases, not generations)
  // Kept for backward compatibility
  royaltyBalance: { 
    type: Number, 
    default: 0 
  },
  
  // Pending payout requests
  pendingPayouts: { 
    type: Number, 
    default: 0 
  },
  
  // Last payout date
  lastPayoutAt: { 
    type: Date 
  },

  // ============================================
  // STRIPE CONNECT (For Automated Payouts)
  // ============================================
  
  // Stripe connected account ID
  stripeConnectedAccountId: { 
    type: String,
    index: true 
  },
  
  // Has model completed Stripe onboarding?
  stripeOnboardingComplete: { 
    type: Boolean, 
    default: false 
  },
  
  // Can model receive payouts?
  stripePayoutsEnabled: { 
    type: Boolean, 
    default: false 
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
  // STATISTICS & ANALYTICS
  // ============================================
  
  // Number of businesses that purchased access
  totalPurchases: { 
    type: Number, 
    default: 0,
    index: true 
  },
  
  // Total number of images generated using this model
  totalGenerations: { 
    type: Number, 
    default: 0,
    index: true 
  },
  
  // Profile views in marketplace
  profileViews: { 
    type: Number, 
    default: 0 
  },
  
  // Number of consent requests received
  consentRequestsReceived: { 
    type: Number, 
    default: 0 
  },
  
  // Number of consent requests approved
  consentRequestsApproved: { 
    type: Number, 
    default: 0 
  },
  
  // Average rating from businesses (future feature)
  averageRating: { 
    type: Number, 
    min: 0,
    max: 5 
  },

  // ============================================
  // STATUS & VISIBILITY
  // ============================================
  
  status: { 
    type: String, 
    enum: ['draft', 'active', 'inactive', 'suspended', 'deleted'],
    default: 'draft',
    index: true 
  },
  
  // Is profile visible in marketplace?
  isVisible: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  
  // Featured model badge
  isFeatured: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  
  // Verified model badge
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  
  // Profile completion percentage (0-100)
  profileCompleteness: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },

  // ============================================
  // METADATA & TIMESTAMPS
  // ============================================
  
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // When profile was activated/published
  activatedAt: { 
    type: Date 
  },
  
  // Last time model updated their profile
  lastModifiedAt: { 
    type: Date 
  },
  
  // Admin notes (internal use only)
  adminNotes: { 
    type: String 
  },

}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Compound indexes
modelProfileSchema.index({ status: 1, isVisible: 1 }); // Marketplace queries
modelProfileSchema.index({ requiresConsent: 1, status: 1 }); // Filtering
modelProfileSchema.index({ pricePerAccess: 1, status: 1 }); // Price sorting
modelProfileSchema.index({ totalPurchases: -1, status: 1 }); // Popular models
modelProfileSchema.index({ createdAt: -1, status: 1 }); // Recent models

// Text search index
modelProfileSchema.index({ 
  name: 'text', 
  displayName: 'text', 
  bio: 'text' 
});

// ============================================
// VIRTUAL FIELDS
// ============================================

// Calculate conversion rate (purchases / views)
modelProfileSchema.virtual('conversionRate').get(function() {
  if (this.profileViews === 0) return 0;
  return (this.totalPurchases / this.profileViews) * 100;
});

// Calculate average generation per purchase
modelProfileSchema.virtual('avgGenerationsPerPurchase').get(function() {
  if (this.totalPurchases === 0) return 0;
  return Math.round(this.totalGenerations / this.totalPurchases);
});

// Check if model can receive payouts
modelProfileSchema.virtual('canReceivePayout').get(function() {
  const MIN_PAYOUT = 20;
  return this.availableBalance >= MIN_PAYOUT && 
         (this.stripePayoutsEnabled || this.manualPayoutDetails.method);
});

// Get all photo URLs (primary + reference)
modelProfileSchema.virtual('allPhotos').get(function() {
  const photos = [this.primaryPhoto];
  photos.push(...this.referencePhotos);
  return photos.filter(Boolean);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a business has access to this model (purchased or approved)
 */
modelProfileSchema.methods.hasBusinessAccess = function(businessId: string): boolean {
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
modelProfileSchema.methods.approveBusiness = async function(businessId: string) {
  if (!this.approvedBusinesses.includes(businessId)) {
    this.approvedBusinesses.push(businessId);
    this.consentRequestsApproved += 1;
    await this.save();
  }
};

/**
 * Remove business approval
 */
modelProfileSchema.methods.revokeBusiness = async function(businessId: string) {
  this.approvedBusinesses = this.approvedBusinesses.filter(
    (id: any) => id.toString() !== businessId.toString()
  );
  await this.save();
};

/**
 * Record a purchase
 */
modelProfileSchema.methods.recordPurchase = async function(amount: number) {
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
modelProfileSchema.methods.recordGeneration = async function() {
  this.totalGenerations += 1;
  await this.save();
};

/**
 * Record a payout
 */
modelProfileSchema.methods.recordPayout = async function(amount: number) {
  this.availableBalance -= amount;
  this.totalPaidOut += amount;
  this.lastPayoutAt = new Date();
  
  await this.save();
};

/**
 * Calculate profile completeness
 */
modelProfileSchema.methods.calculateCompleteness = function(): number {
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
modelProfileSchema.methods.updateCompleteness = async function() {
  this.profileCompleteness = this.calculateCompleteness();
  await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get models available in marketplace
 */
modelProfileSchema.statics.getMarketplaceModels = function(filters = {}) {
  return this.find({
    status: 'active',
    isVisible: true,
    ...filters
  })
  .select('-adminNotes -manualPayoutDetails')
  .sort({ isFeatured: -1, totalPurchases: -1 });
};

/**
 * Search models by text
 */
modelProfileSchema.statics.searchModels = function(searchText: string) {
  return this.find({
    $text: { $search: searchText },
    status: 'active',
    isVisible: true
  })
  .select('-adminNotes -manualPayoutDetails')
  .sort({ score: { $meta: 'textScore' } });
};

/**
 * Get top earning models
 */
modelProfileSchema.statics.getTopEarners = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ totalEarnings: -1 })
    .limit(limit)
    .select('name displayName totalEarnings totalPurchases primaryPhoto');
};

// ============================================
// MIDDLEWARE HOOKS
// ============================================

// Update timestamp on save
modelProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update lastModifiedAt if any field changed (except stats)
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
  }
  
  // Activate profile if status changed to active
  if (this.isModified('status') && this.status === 'active' && !this.activatedAt) {
    this.activatedAt = new Date();
  }
  
  // Sync referenceImages with primaryPhoto + referencePhotos
  const allUrls = [this.primaryPhoto];
  allUrls.push(...this.referencePhotos);
  this.referenceImages = allUrls.filter(Boolean);
  
  next();
});

// Update profile completeness after save
modelProfileSchema.post('save', async function(doc) {
  const newCompleteness = doc.calculateCompleteness();
  if (doc.profileCompleteness !== newCompleteness) {
    await doc.updateOne({ profileCompleteness: newCompleteness });
  }
});

// ============================================
// EXPORT MODEL
// ============================================

export const ModelProfile = mongoose.models.ModelProfile || 
  mongoose.model('ModelProfile', modelProfileSchema);

export default ModelProfile;
