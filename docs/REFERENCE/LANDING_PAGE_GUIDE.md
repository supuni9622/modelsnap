ModelSnapper.ai Landing Page Guidance
1. Brand Identity & Theme

Colors

Deep Charcoal → #1A1A1A (premium/studio feel)

Electric Blue → #356DFF (trust, clarity, AI “pop”)

Soft White → #F7F7F7 (clean UI for images)

Cool Gray → #D2D6DB (neutral elements)

Accent Mint → #4BE4C1 (fresh, modern accent)

Font: Inter / Poppins / Roboto

Tone: Friendly, confident, conversion-focused, approachable

Style: Modern tech + fashion minimalism, premium SaaS feel

Motion / Interactivity: Framer Motion for fade-ins, scroll animations, hover effects

2. Core Messaging

Short, punchy copy:

“Sri Lankan AI Models. Realistic Fits. Zero Photoshoots.”

“Try clothes on AI-generated models instantly.”

“Perfect for fashion brands, creators, and boutiques.”

Emphasize:

Simplicity: 3–4 clicks from upload → download

Ethical workflow: human model consent, royalties

Sri Lankan context: local skin tones, modest wear, LKR pricing

3. Landing Page Sections
3.1 Hero Section

Content

ModelSnapper.ai
AI-powered model photos for small fashion brands
Upload clothing → Choose AI/Human model → Get studio-quality photos in minutes
CTA: “Get Early Access”


Design / UX

Background: Deep Charcoal / Hero image of AI-generated model

Animation: Text fade-in + CTA button hover motion

Quick conversion hook (first impression)

3.2 The Problem / Hair-on-Fire Section

Content

Small fashion brands struggle:
- Delayed product launches
- Inconsistent visuals
- High photoshoot costs
- No access to models
Fast-fashion cycle → weekly drops → constant visuals needed


Design / UX

Icons for each pain point

Motion: staggered fade-in of bullet points

Interactive: hover to reveal more info

3.3 Why Sri Lanka Needs This

Content

- 80% of online fashion sellers operate on Facebook/Instagram
- Most rely on mannequins or low-quality images
- Professional photoshoots cost LKR 25,000–50,000/session
- Sellers need fast, cheap, consistent content


Design / UX

Use Electric Blue for cost emphasis

Animated counter or stats visualization

Motion: scroll-triggered reveal

3.4 The Solution

Content

ModelSnapper.ai makes fashion photography simple:
1. Upload clothing photo
2. Select AI or consented human model
3. Generate studio-quality images in minutes
- Local skin tones & modest fashion poses
- Optional human model consent workflow
- No models, no studio, no logistics


Design / UX

Animated 3-step flow (Upload → Select → Generate → Download)

Accent Mint highlights actions

Motion: micro-interactions for step progress

3.5 Live Demo

Content

Upload → Select → Generate → Download


Design / UX

Live preview GIF or small interactive demo

Motion: real-time feedback on upload and generate actions

CTA: “Try Demo”

3.6 Unique Sri Lankan Advantage

Content

Compared to global tools:
- Local body types & skin tones
- Modest wear poses (Kurti, Saree, Linen)
- LKR-based pricing
- Human model consent + royalty workflow
- WhatsApp delivery for convenience


Design / UX

Card-based advantages

Motion: staggered slide-in on scroll

Small illustration/icon per point

3.7 Business Model

Content

Subscription + Pay-per-render
- Free: 10 watermarked renders
- Starter: LKR 2,000/mo → 50 renders
- Growth: LKR 4,500/mo → 150 renders
- Human model render: LKR 1,000/image (includes royalty)

Payment methods:
- Stripe (cards)
- Bank transfer (manual approval)


Design / UX

Pricing table with interactive hover

Motion: card lift and shadow effect

3.8 Traction & Market Potential

Content

- 20,000+ Instagram sellers in Sri Lanka
- Weekly collections → repeat revenue
- First-to-market advantage
- Ethical angle attracts human models


Design / UX

Graphs or counters

Motion: number counting animation

3.9 Roadmap

Content

- MVP (3 days): AI renders, auth, model selection
- Phase 2: Human model marketplace
- Phase 3: Background presets, batch upload, brand kits
- Phase 4: Pose packs, custom avatars
- Phase 5: International expansion


Design / UX

Vertical timeline with scroll animation

Highlight current stage dynamically

3.10 Team

Content

- Suu — Senior Engineer
- Hoshini — Marketing + Fashion Insight


Design / UX

Professional headshots or illustrated avatars

Motion: bio reveal on hover

4. Tactics & Conversion Strategies

Emotional hook: highlight small fashion brands’ pain points

Demonstrate speed & simplicity visually

Motion for interactivity: hover, scroll, progress animations

Ethical narrative: human model consent + royalties

Subtle Sri Lankan differentiation: skin tones, modest wear, LKR pricing

Social proof: early adopters, testimonials (optional)

Strong CTAs: “Get Early Access”, “Try Demo”

5. Technical Guidance for Cursor

Next.js App Router: use optimal server vs client components

Tailwind: responsive design

Motion: Framer Motion for animations

Component-based structure: reusable UI components

Playwright: test each interactive component

Type-safe: TypeScript patterns

CI/CD: GitHub → Vercel

Maintain roadmap tracking file for updates

Strictly adhere to package.json versions

6. Page Flow Summary

Hero / CTA

Problem / Hair-on-Fire

Sri Lanka Market Context

Solution / How it Works

Demo / Interactive

Unique Sri Lankan Advantage

Pricing / Business Model

Traction / Market Potential

Roadmap / Future Plans

Team / Co-founders

# Folder structure suggestion
```

components/
  Hero.tsx
  ProblemSection.tsx
  SriLankaNeed.tsx
  SolutionSection.tsx
  DemoSection.tsx
  AdvantageSection.tsx
  PricingSection.tsx
  TractionSection.tsx
  RoadmapSection.tsx
  TeamSection.tsx
pages/
  index.tsx

```

pages/index.tsx
```
import Hero from "../components/Hero";
import ProblemSection from "../components/ProblemSection";
import SriLankaNeed from "../components/SriLankaNeed";
import SolutionSection from "../components/SolutionSection";
import DemoSection from "../components/DemoSection";
import AdvantageSection from "../components/AdvantageSection";
import PricingSection from "../components/PricingSection";
import TractionSection from "../components/TractionSection";
import RoadmapSection from "../components/RoadmapSection";
import TeamSection from "../components/TeamSection";

export default function Home() {
  return (
    <main className="bg-[#F7F7F7] text-[#1A1A1A] font-inter">
      <Hero />
      <ProblemSection />
      <SriLankaNeed />
      <SolutionSection />
      <DemoSection />
      <AdvantageSection />
      <PricingSection />
      <TractionSection />
      <RoadmapSection />
      <TeamSection />
    </main>
  );
}

```

Example Component: components/Hero.tsx

```
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="bg-[#1A1A1A] text-white h-screen flex flex-col justify-center items-center text-center px-6">
      <motion.h1
        className="text-5xl md:text-6xl font-bold mb-4"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        ModelSnapper.ai
      </motion.h1>
      <motion.p
        className="text-xl md:text-2xl mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        AI-powered model photos for small fashion brands
      </motion.p>
      <motion.button
        className="bg-[#356DFF] hover:bg-[#4BE4C1] text-white font-semibold px-6 py-3 rounded-lg"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        Get Early Access
      </motion.button>
    </section>
  );
}

```

Example Component: components/ProblemSection.tsx
```
import { motion } from "framer-motion";

export default function ProblemSection() {
  const problems = [
    "Delayed product launches",
    "Inconsistent visuals",
    "High photoshoot costs",
    "No access to models",
    "Fast-fashion cycle → weekly drops → constant need for visuals",
  ];

  return (
    <section className="py-20 px-6 md:px-24 bg-[#F7F7F7] text-[#1A1A1A]">
      <motion.h2
        className="text-3xl font-bold mb-8 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        The Hair-on-Fire Problem
      </motion.h2>
      <div className="grid md:grid-cols-2 gap-6">
        {problems.map((p, i) => (
          <motion.div
            key={i}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.2 }}
          >
            {p}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

```

Guidance for Remaining Sections

SriLankaNeed.tsx – Stats, local pain points, highlight LKR pricing and fast content delivery.

SolutionSection.tsx – 3–4 step interactive flow (Upload → Select → Generate → Download), Motion: progress bar animation.

DemoSection.tsx – Embed a GIF / small interactive preview, live upload feedback, micro animations on hover.

AdvantageSection.tsx – Cards with icons: Local skin tones, modest wear, WhatsApp delivery, ethical model workflow.

PricingSection.tsx – Interactive subscription table, hover effects, highlight pay-per-render.

TractionSection.tsx – Counter animations, stats on Instagram sellers, first-to-market advantage.

RoadmapSection.tsx – Vertical scroll timeline, motion for each milestone.

TeamSection.tsx – Co-founder bios, hover reveal, or small Framer Motion card flip.

Tips for Cursor Implementation

Reusability: Create Card, Button, SectionWrapper components to reduce repetition.

Animations: Use Framer Motion for scroll-triggered reveals, hover interactions, button micro animations.

Responsive Design: Tailwind responsive classes (md:, lg:) for all sections.

Accessibility: All buttons, inputs, and images should have alt and proper ARIA labels.

Type Safety: TypeScript types for props in all components.

Assets: Placeholder avatars, clothing images, and motion GIFs for MVP.

CI/CD: Set up automatic deployment to Vercel from GitHub.