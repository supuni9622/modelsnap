"use client";

import { GenerateForm } from "@/components/dashboard/business/generate-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/business/generate">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Image Generation</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate Product Images</h1>
        <p className="text-muted-foreground mt-2">
          Follow the steps below. Choosing the right garment type and photo style helps the AI produce better try-on results.
        </p>
      </div>

      <GenerateForm />
    </div>
  );
}

