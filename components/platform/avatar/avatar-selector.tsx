"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Avatar {
  _id: string;
  id: string;
  gender: "male" | "female";
  bodyType: string;
  skinTone: string;
  imageUrl: string;
}

interface AvatarSelectorProps {
  onSelect?: (avatar: Avatar) => void;
  selectedAvatarId?: string;
  className?: string;
}

export function AvatarSelector({ onSelect, selectedAvatarId, className }: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [filteredAvatars, setFilteredAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedBodyType, setSelectedBodyType] = useState<string>("all");
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>("all");

  // Fetch avatars
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (selectedGender !== "all") params.append("gender", selectedGender);
        if (selectedBodyType !== "all") params.append("bodyType", selectedBodyType);
        if (selectedSkinTone !== "all") params.append("skinTone", selectedSkinTone);

        const response = await fetch(`/api/avatars?${params.toString()}`);
        const data = await response.json();

        if (data.status === "success") {
          setAvatars(data.data);
          setFilteredAvatars(data.data);
        } else {
          setError(data.message || "Failed to fetch avatars");
        }
      } catch (err) {
        setError((err as Error).message || "Failed to fetch avatars");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatars();
  }, [selectedGender, selectedBodyType, selectedSkinTone]);

  // Get unique values for filters
  const genders = Array.from(new Set(avatars.map((a) => a.gender)));
  const bodyTypes = Array.from(new Set(avatars.map((a) => a.bodyType))).sort();
  const skinTones = Array.from(new Set(avatars.map((a) => a.skinTone))).sort();

  const handleAvatarClick = useCallback(
    (avatar: Avatar) => {
      onSelect?.(avatar);
    },
    [onSelect]
  );

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-12">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Select Avatar</CardTitle>
        <CardDescription>Choose an AI model to try on your clothing</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Gender</label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger>
                <SelectValue placeholder="All genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                {genders.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Body Type</label>
            <Select value={selectedBodyType} onValueChange={setSelectedBodyType}>
              <SelectTrigger>
                <SelectValue placeholder="All body types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All body types</SelectItem>
                {bodyTypes.map((bodyType) => (
                  <SelectItem key={bodyType} value={bodyType}>
                    {bodyType.charAt(0).toUpperCase() + bodyType.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Skin Tone</label>
            <Select value={selectedSkinTone} onValueChange={setSelectedSkinTone}>
              <SelectTrigger>
                <SelectValue placeholder="All skin tones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All skin tones</SelectItem>
                {skinTones.map((skinTone) => (
                  <SelectItem key={skinTone} value={skinTone}>
                    {skinTone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Avatar Grid */}
        {filteredAvatars.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No avatars found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAvatars.map((avatar) => (
              <div
                key={avatar._id || avatar.id}
                onClick={() => handleAvatarClick(avatar)}
                className={cn(
                  "relative cursor-pointer rounded-lg border-2 transition-all hover:border-primary hover:shadow-md",
                  selectedAvatarId === (avatar._id || avatar.id)
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-muted"
                )}
              >
                <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                  <img
                    src={avatar.imageUrl}
                    alt={`${avatar.gender} ${avatar.bodyType} ${avatar.skinTone}`}
                    className="w-full h-full object-contain"
                  />
                  {selectedAvatarId === (avatar._id || avatar.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Badge variant="default" className="absolute top-2 right-2">
                        Selected
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {avatar.gender}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {avatar.bodyType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{avatar.skinTone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

