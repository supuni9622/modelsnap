"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, User, Shield, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type UserRole = "BUSINESS" | "MODEL" | "ADMIN";

export default function RoleSwitcher() {
  const { userId } = useAuth();
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchCurrentRole = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/role");
      const data = await response.json();

      if (data.status === "success") {
        setCurrentRole(data.data.role || "BUSINESS");
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCurrentRole();
  }, [fetchCurrentRole]);

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === currentRole || !userId) return;

    setIsSwitching(true);

    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setCurrentRole(newRole);
        toast.success(`Switched to ${newRole === "BUSINESS" ? "Business" : newRole === "MODEL" ? "Model" : "Admin"} role`);
        
        // Redirect based on role
        if (newRole === "MODEL") {
          // Check if model profile exists
          const profileResponse = await fetch("/api/models?userId=" + userId);
          const profileData = await profileResponse.json();
          
          if (profileData.status === "success" && profileData.data.models?.length > 0) {
            router.push("/app/model/dashboard");
          } else {
            router.push("/app/model/create");
          }
        } else if (newRole === "BUSINESS") {
          router.push("/app");
        } else if (newRole === "ADMIN") {
          router.push("/app/admin");
        }
        
        // Refresh the page to update UI
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        toast.error(data.message || "Failed to switch role");
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("Failed to switch role");
    } finally {
      setIsSwitching(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "BUSINESS":
        return <Building2 className="h-4 w-4" />;
      case "MODEL":
        return <User className="h-4 w-4" />;
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "BUSINESS":
        return "Business";
      case "MODEL":
        return "Model";
      case "ADMIN":
        return "Admin";
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!currentRole) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isSwitching}>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {getRoleIcon(currentRole)}
              <span className="ml-2 hidden md:inline">{getRoleLabel(currentRole)}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleRoleSwitch("BUSINESS")}
          disabled={isSwitching || currentRole === "BUSINESS"}
          className="cursor-pointer"
        >
          <Building2 className="h-4 w-4 mr-2" />
          <span>Business</span>
          {currentRole === "BUSINESS" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRoleSwitch("MODEL")}
          disabled={isSwitching || currentRole === "MODEL"}
          className="cursor-pointer"
        >
          <User className="h-4 w-4 mr-2" />
          <span>Model</span>
          {currentRole === "MODEL" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRoleSwitch("ADMIN")}
          disabled={isSwitching || currentRole === "ADMIN"}
          className="cursor-pointer"
        >
          <Shield className="h-4 w-4 mr-2" />
          <span>Admin</span>
          {currentRole === "ADMIN" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

