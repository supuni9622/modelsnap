"use client";

import { GenerateForm } from "@/components/dashboard/business/generate-form";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
         <h1 className="text-3xl font-bold tracking-tight">Create Model Photos for Your Product</h1>
        <p className="text-muted-foreground mt-2">
          Follow the steps below. Choosing the right garment type and photo style helps the AI produce better try-on results.
        </p>
      </div>

      <GenerateForm />
    </div>
  );
}

