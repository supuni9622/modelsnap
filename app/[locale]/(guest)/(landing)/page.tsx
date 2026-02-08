import { HeroModelSnapper } from "@/components/landing/hero/hero-modelsnap";
import { ProblemModelSnapper } from "@/components/landing/problem/problem-modelsnap";
//import { SriLankaModelSnapper } from "@/components/landing/sri-lanka/sri-lanka-1";
import { SolutionModelSnapper } from "@/components/landing/solution/solution-1";
import { GalleryModelSnapper } from "@/components/landing/gallery/gallery-modelsnap";
import { DemoModelSnapper } from "@/components/landing/demo/demo-1";
import { AdvantageModelSnapper } from "@/components/landing/advantage/advantage-1";
import { StatsModelSnapper } from "@/components/landing/stats/stats-modelsnap";
import Pricing from "@/components/landing/pricing/pricing-1";
//import { TractionModelSnapper } from "@/components/landing/traction/traction-1";
//import { RoadmapModelSnapper } from "@/components/landing/roadmap/roadmap-1";
import { TeamModelSnapper } from "@/components/landing/team/team-1";
import { FAQModelSnapper } from "@/components/landing/faq/faq-modelsnap";

export default function LandingPage() {
  return (
    <main className="bg-[#F7F7F7] text-[#1A1A1A]">
      <HeroModelSnapper />
      <ProblemModelSnapper />
      {/* <SriLankaModelSnapper /> */}
      <SolutionModelSnapper />
      <GalleryModelSnapper />
      <DemoModelSnapper />
      <AdvantageModelSnapper />
      <StatsModelSnapper />
      <Pricing />
      {/* <TractionModelSnapper /> */}
      {/* <RoadmapModelSnapper /> */}
      <FAQModelSnapper />
      <TeamModelSnapper />
    </main>
  );
}
