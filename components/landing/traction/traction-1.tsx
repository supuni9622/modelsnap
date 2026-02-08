"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, TrendingUp, Award } from "lucide-react";

const stats = [
  {
    icon: Instagram,
    value: "20,000+",
    label: "Instagram sellers in Sri Lanka",
    color: "text-[#356DFF]",
  },
  {
    icon: TrendingUp,
    value: "Weekly",
    label: "Collections → repeat revenue",
    color: "text-[#4BE4C1]",
  },
  {
    icon: Award,
    value: "First",
    label: "To-market advantage in Sri Lanka",
    color: "text-[#356DFF]",
  },
];

function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  // Extract number and text parts
  const numberMatch = value.match(/\d+/);
  const number = numberMatch ? parseInt(numberMatch[0]) : 0;
  const prefix = value.replace(/\d+/, "");

  return (
    <span ref={ref}>
      {prefix}
      {isInView && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {number.toLocaleString()}
        </motion.span>
      )}
      {suffix}
    </span>
  );
}

export function TractionModelSnapper() {
  return (
    <section className="py-20 px-4 md:px-24 bg-white text-[#1A1A1A]">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Traction & Market Potential
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
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
                    <div className={`text-4xl font-bold mb-2 ${stat.color}`}>
                      <AnimatedCounter value={stat.value} />
                    </div>
                    <p className="text-muted-foreground">{stat.label}</p>
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

