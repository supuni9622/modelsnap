import { HeroModelSnap } from "@/components/landing/hero/hero-modelsnap";
import { ProblemModelSnap } from "@/components/landing/problem/problem-modelsnap";
//import { SriLankaModelSnap } from "@/components/landing/sri-lanka/sri-lanka-1";
import { SolutionModelSnap } from "@/components/landing/solution/solution-1";
import { GalleryModelSnap } from "@/components/landing/gallery/gallery-modelsnap";
import { DemoModelSnap } from "@/components/landing/demo/demo-1";
import { AdvantageModelSnap } from "@/components/landing/advantage/advantage-1";
import { StatsModelSnap } from "@/components/landing/stats/stats-modelsnap";
import Pricing from "@/components/landing/pricing/pricing-1";
//import { TractionModelSnap } from "@/components/landing/traction/traction-1";
//import { RoadmapModelSnap } from "@/components/landing/roadmap/roadmap-1";
import { TeamModelSnap } from "@/components/landing/team/team-1";
import { FAQModelSnap } from "@/components/landing/faq/faq-modelsnap";

export default function LandingPage() {
  return (
    <main className="bg-[#F7F7F7] text-[#1A1A1A]">
      <HeroModelSnap />
      <ProblemModelSnap />
      {/* <SriLankaModelSnap /> */}
      <SolutionModelSnap />
      <GalleryModelSnap />
      <DemoModelSnap />
      <AdvantageModelSnap />
      <StatsModelSnap />
      <Pricing />
      {/* <TractionModelSnap /> */}
      {/* <RoadmapModelSnap /> */}
      <FAQModelSnap />
      <TeamModelSnap />
    </main>
  );
}
