import { Metadata } from "next";
import { RenderInterface } from "@/components/platform/render/render-interface";
import { RenderHistory } from "@/components/platform/history/render-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, History } from "lucide-react";

export const metadata: Metadata = {
  title: "Render Clothing | ModelSnap.ai",
  description: "Upload clothing and render it on AI models",
};

export default function AppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Render Clothing</h1>
        <p className="text-muted-foreground mt-2">
          Upload your clothing and see it rendered on AI-generated Sri Lankan models
        </p>
      </div>

      <Tabs defaultValue="render" className="w-full">
        <TabsList>
          <TabsTrigger value="render">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Render
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="render" className="mt-6">
          <RenderInterface />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RenderHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
