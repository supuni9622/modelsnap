"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Image, DollarSign, UserX, TrendingUp } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Photoshoots take too long",
    description: "Waiting weeks for model photos slows down your product drops.",
  },
  {
    icon: Image,
    title: "Hard to find the right models",
    description: "Finding models who match your brand's look or size is stressful and time-consuming.",
  },
  {
    icon: DollarSign,
    title: "Photoshoots are expensive",
    description: "Studios, photographers, models, and editing add up quickly — even for small collections.",
  },
  {
    icon: UserX,
    title: "Visuals look inconsistent",
    description: "Different lighting, styles, and poses make your website and Instagram look mismatched.",
  },
  {
    icon: TrendingUp,
    title: "Can't keep up with weekly drops",
    description: "Fast-fashion cycles need fast visuals — but traditional photoshoots are too slow.",
  },
];

export function ProblemModelSnapper() {
  return (
    <section className="py-20 px-4 md:px-24 bg-[#F7F7F7] text-[#1A1A1A]">
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Challenges Fashion Brands Deal With Every Day
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: "1000px" }}>
          {problems.map((problem, i) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ 
                  y: -8,
                  transition: { duration: 0.3 }
                }}
                className="h-full"
              >
                <motion.div
                  whileHover={{
                    rotateY: 5,
                    rotateX: -5,
                    scale: 1.02,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ transformStyle: "preserve-3d", willChange: "transform" }}
                  className="h-full"
                >
                  <Card className="h-full cursor-pointer relative overflow-hidden
                    bg-card
                    border border-border/50
                    shadow-lg
                    hover:shadow-xl
                    transition-all duration-300
                    group">
                    {/* Embedded inset shadow effect */}
                    <div className="absolute inset-0 
                      shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]
                      dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]
                      pointer-events-none" />
                    
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 
                      bg-gradient-to-br from-white/5 via-transparent to-transparent 
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-300
                      pointer-events-none" />
                    
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-[#356DFF]/10 p-3 flex-shrink-0">
                          <Icon className="h-6 w-6 text-[#356DFF]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{problem.title}</h3>
                          <p className="text-muted-foreground text-sm">{problem.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

