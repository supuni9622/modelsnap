"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { LogOutIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountButton() {
  const { user, isLoaded } = useUser();
  return (
    <>
      {!isLoaded ? (
        <div className="flex items-center space-x-2">
          <Skeleton className="w-[35px] h-[35px] rounded-full" />
          <Skeleton className="w-[90px] h-[15px] rounded-full" />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger className=" py-2 px-2 rounded-md">
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage src={user?.imageUrl} />
              </Avatar>
              <p className="text-sm font-medium opacity-80 md:block hidden">
                {user?.firstName}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[200px]">
            <SignOutButton>
              <DropdownMenuItem>
                <LogOutIcon /> Logout
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
