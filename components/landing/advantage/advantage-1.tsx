"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Shirt, MessageCircle, Shield } from "lucide-react";

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
    icon: MessageCircle,
    title: "WhatsApp delivery",
    description: "Get your renders delivered via WhatsApp for convenience",
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((advantage, i) => {
            const Icon = advantage.icon;
            return (
              <motion.div
                key={advantage.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`${advantage.color} mb-2`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle>{advantage.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{advantage.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

