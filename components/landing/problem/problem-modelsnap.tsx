"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Image, DollarSign, UserX, TrendingUp } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Delayed product launches",
    description: "Waiting weeks for photoshoots delays your product drops",
  },
  {
    icon: Image,
    title: "Inconsistent visuals",
    description: "Different photographers, different styles, no brand consistency",
  },
  {
    icon: DollarSign,
    title: "High photoshoot costs",
    description: "LKR 25,000–50,000 per session adds up quickly",
  },
  {
    icon: UserX,
    title: "No access to models",
    description: "Finding available models for weekly drops is nearly impossible",
  },
  {
    icon: TrendingUp,
    title: "Fast-fashion cycle",
    description: "Weekly drops require constant visuals, but photoshoots are slow",
  },
];

export function ProblemModelSnap() {
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
          The Hair-on-Fire Problem
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem, i) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
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
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

