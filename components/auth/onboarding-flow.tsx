"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function OnboardingFlow() {
  const router = useRouter();
  const { userId } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"BUSINESS" | "MODEL" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelection = async (role: "BUSINESS" | "MODEL") => {
    if (!userId) {
      toast.error("Please sign in first");
      router.push("/sign-in");
      return;
    }

    setSelectedRole(role);
    setIsSubmitting(true);

    try {
      // Update user role in database
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(`Welcome as a ${role === "BUSINESS" ? "Business" : "Model"}!`);
        
        // Redirect based on role
        if (role === "MODEL") {
          // Check if model profile exists
          const profileResponse = await fetch("/api/models?userId=" + userId);
          const profileData = await profileResponse.json();
          
          if (profileData.status === "success" && profileData.data.models?.length > 0) {
            // Model profile exists, go to dashboard
            router.push("/dashboard/model/profile");
          } else {
            // No profile, redirect to create profile
            router.push("/dashboard/model/profile");
          }
        } else {
          // Business user - go to main dashboard
          router.push("/dashboard/business/generate");
        }
      } else {
        toast.error(data.message || "Failed to set role");
        setIsSubmitting(false);
        setSelectedRole(null);
      }
    } catch (error) {
      console.error("Error setting role:", error);
      toast.error("Failed to set role. Please try again.");
      setIsSubmitting(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">Welcome to ModelSnapper.ai!</CardTitle>
            <CardDescription className="text-lg">
              Let's get started. Choose your role to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "BUSINESS"
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => !isSubmitting && handleRoleSelection("BUSINESS")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">I'm a Business</h3>
                      <p className="text-sm text-muted-foreground">
                        Create fashion images using AI avatars or human models. Upload your
                        products and generate professional on-model photos.
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <li>• Upload product images</li>
                        <li>• Generate AI fashion photos</li>
                        <li>• Access human model marketplace</li>
                        <li>• Download high-quality images</li>
                      </ul>
                    </div>
                    {selectedRole === "BUSINESS" && isSubmitting && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Model Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "MODEL"
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => !isSubmitting && handleRoleSelection("MODEL")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">I'm a Model</h3>
                      <p className="text-sm text-muted-foreground">
                        Create your profile and earn royalties when businesses use your digital
                        likeness for fashion photography.
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <li>• Create your model profile</li>
                        <li>• Upload reference images</li>
                        <li>• Earn $2.00 per generation</li>
                        <li>• Manage consent requests</li>
                      </ul>
                    </div>
                    {selectedRole === "MODEL" && isSubmitting && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              You can change your role later in your account settings
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

