"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Shirt, Download, Shield } from "lucide-react";

const advantages = [
  {
    icon: Palette,
    title: "Local skin tones",
    description: "AI models with Sri Lankan skin tones and body types",
    color: "text-[#4BE4C1]",
  },
  {
    icon: Shirt,
    title: "Modest wear poses",
    description: "Kurti, Saree, Linen - poses relevant to local fashion",
    color: "text-[#356DFF]",
  },
  {
    icon: Download,
    title: "Easy download",
    description: "Download high-resolution images instantly, ready for your store",
    color: "text-[#4BE4C1]",
  },
  {
    icon: Shield,
    title: "Ethical workflow",
    description: "Human model consent + royalty workflow for real models",
    color: "text-[#356DFF]",
  },
];

export function AdvantageModelSnap() {
  return (
    <section className="py-20 px-4 md:px-24 bg-[#F7F7F7] text-[#1A1A1A]">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Unique Sri Lankan Advantage
        </motion.h2>

        <motion.p
          className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Compared to global tools, we understand local fashion needs
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ perspective: "1000px" }}>
          {advantages.map((advantage, i) => {
            const Icon = advantage.icon;
            return (
              <motion.div
                key={advantage.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
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
                  <Card className="h-full relative overflow-hidden
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
                    
                    <CardHeader className="relative z-10">
                      <div className={`${advantage.color} mb-2`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <CardTitle>{advantage.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-muted-foreground text-sm">{advantage.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

