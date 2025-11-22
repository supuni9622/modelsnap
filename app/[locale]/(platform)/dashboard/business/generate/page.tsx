"use client";

import { Metadata } from "next";
import { GenerateForm } from "@/components/dashboard/business/generate-form";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate Fashion Photos</h1>
        <p className="text-muted-foreground mt-2">
          Upload your product images and render them on AI avatars or human models
        </p>
      </div>
      <GenerateForm />
    </div>
  );
}

