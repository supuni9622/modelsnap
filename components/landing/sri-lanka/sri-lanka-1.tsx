"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, Facebook, Camera, Zap } from "lucide-react";

const stats = [
  {
    icon: Instagram,
    value: "80%",
    label: "of online fashion sellers operate on Facebook/Instagram",
    color: "text-[#356DFF]",
  },
  {
    icon: Camera,
    value: "LKR 25,000–50,000",
    label: "per professional photoshoot session",
    color: "text-[#356DFF]",
  },
  {
    icon: Zap,
    value: "Fast",
    label: "Sellers need fast, cheap, consistent content for weekly drops",
    color: "text-[#4BE4C1]",
  },
];

export function SriLankaModelSnapper() {
  return (
    <section className="py-20 px-4 md:px-24 bg-white text-[#1A1A1A]">
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
          Why Sri Lanka Needs This
        </motion.h2>

        <motion.p
          className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Most fashion sellers rely on mannequins or low-quality images. Professional photoshoots
          are expensive and slow.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
              >
                <Card className="h-full text-center">
                  <CardContent className="p-8">
                    <div className="flex justify-center mb-4">
                      <div className="rounded-full bg-[#356DFF]/10 p-4">
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </div>
                    <motion.div
                      className={`text-4xl font-bold mb-2 ${stat.color}`}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 + i * 0.2, type: "spring" }}
                    >
                      {stat.value}
                    </motion.div>
                    <p className="text-muted-foreground">{stat.label}</p>
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

