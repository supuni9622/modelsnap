/**
 * Placeholder data for development when APIs are not available
 */

export const placeholderAvatars = [
  {
    id: "avatar-1",
    name: "Avatar 1",
    imageUrl: "/avatars/avatar-1.jpg",
    gender: "female",
    ethnicity: "sri-lankan",
  },
  {
    id: "avatar-2",
    name: "Avatar 2",
    imageUrl: "/avatars/avatar-2.jpg",
    gender: "male",
    ethnicity: "sri-lankan",
  },
];

export const placeholderModels = [
  {
    _id: "model-1",
    name: "Sarah Johnson",
    referenceImages: [
      "/placeholder/model-1-1.jpg",
      "/placeholder/model-1-2.jpg",
      "/placeholder/model-1-3.jpg",
    ],
    status: "active",
    royaltyBalance: 150.0,
  },
  {
    _id: "model-2",
    name: "Emma Williams",
    referenceImages: [
      "/placeholder/model-2-1.jpg",
      "/placeholder/model-2-2.jpg",
      "/placeholder/model-2-3.jpg",
    ],
    status: "active",
    royaltyBalance: 200.0,
  },
];

export const placeholderGenerations = [
  {
    _id: "gen-1",
    modelType: "AI_AVATAR",
    garmentImageUrl: "/placeholder/garment-1.jpg",
    outputS3Url: "/placeholder/output-1.jpg",
    status: "completed",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "gen-2",
    modelType: "HUMAN_MODEL",
    garmentImageUrl: "/placeholder/garment-2.jpg",
    outputS3Url: "/placeholder/output-2.jpg",
    status: "completed",
    createdAt: new Date().toISOString(),
  },
];

export const placeholderConsentRequests = [
  {
    _id: "consent-1",
    businessId: {
      businessName: "Fashion Brand Co",
      userId: {
        firstName: "John",
        lastName: "Doe",
      },
    },
    status: "PENDING",
    requestedAt: new Date().toISOString(),
    message: "We'd love to work with you!",
  },
];

export const placeholderEarnings = [
  {
    _id: "earn-1",
    amount: 2.0,
    createdAt: new Date().toISOString(),
    status: "completed",
  },
  {
    _id: "earn-2",
    amount: 2.0,
    createdAt: new Date().toISOString(),
    status: "completed",
  },
];

