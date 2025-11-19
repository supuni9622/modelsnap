"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, Sparkles, Download } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Upload,
    title: "Upload clothing photo",
    description: "Simply drag and drop or select your garment image",
    color: "bg-[#356DFF]",
  },
  {
    number: 2,
    icon: Users,
    title: "Select AI or human model",
    description: "Choose from our Sri Lankan AI avatars or human models",
    color: "bg-[#4BE4C1]",
  },
  {
    number: 3,
    icon: Sparkles,
    title: "Generate in minutes",
    description: "Get studio-quality images powered by AI",
    color: "bg-[#356DFF]",
  },
  {
    number: 4,
    icon: Download,
    title: "Download & use",
    description: "Download high-resolution images ready for your store",
    color: "bg-[#4BE4C1]",
  },
];

export function SolutionModelSnap() {
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
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          How ModelSnap.ai Works
        </motion.h2>

        <motion.p
          className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          ModelSnap.ai makes fashion photography simple. No models, no studio, no logistics.
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ perspective: "1000px" }}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
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
                  style={{ transformStyle: "preserve-3d" }}
                  className="h-full"
                >
                  <Card className="h-full relative overflow-hidden
                    bg-card/50 backdrop-blur-sm
                    border border-border/50
                    shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                    dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                    hover:shadow-[0_12px_40px_rgb(0,0,0,0.15)]
                    dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.4)]
                    transition-all duration-300
                    group">
                    <div className={`absolute top-0 right-0 w-32 h-32 ${step.color} opacity-10 blur-3xl`} />
                    {/* Embedded inset shadow effect */}
                    <div className="absolute inset-0 
                      shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]
                      dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]
                      pointer-events-none" />
                    
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 
                      bg-gradient-to-br from-white/10 via-transparent to-transparent 
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-300
                      pointer-events-none" />
                    
                    <CardHeader className="relative z-10">
                      <div className="flex items-center gap-4 mb-2">
                        <div className={`${step.color} text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg`}>
                          {step.number}
                        </div>
                        <div className={`${step.color} text-white rounded-lg p-2`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                      <CardTitle>{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-[#4BE4C1]">Local skin tones</span> & modest fashion
            poses • <span className="font-semibold text-[#4BE4C1]">Optional human model</span>{" "}
            consent workflow
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

