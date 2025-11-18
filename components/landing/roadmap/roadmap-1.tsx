"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const milestones = [
  {
    phase: "MVP (3 days)",
    status: "current",
    items: ["AI renders", "Auth", "Model selection"],
  },
  {
    phase: "Phase 2",
    status: "upcoming",
    items: ["Human model marketplace"],
  },
  {
    phase: "Phase 3",
    status: "upcoming",
    items: ["Background presets", "Batch upload", "Brand kits"],
  },
  {
    phase: "Phase 4",
    status: "upcoming",
    items: ["Pose packs", "Custom avatars"],
  },
  {
    phase: "Phase 5",
    status: "upcoming",
    items: ["International expansion"],
  },
];

export function RoadmapModelSnap() {
  return (
    <section className="py-20 px-4 md:px-24 bg-[#F7F7F7] text-[#1A1A1A]">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Roadmap
        </motion.h2>

        <motion.p
          className="text-center text-muted-foreground mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Our journey to revolutionize fashion photography in Sri Lanka
        </motion.p>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-8">
            {milestones.map((milestone, i) => (
              <motion.div
                key={milestone.phase}
                className="relative pl-20"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute left-6 top-2 w-4 h-4 rounded-full border-4 z-10",
                    milestone.status === "current"
                      ? "bg-[#4BE4C1] border-[#4BE4C1]"
                      : "bg-background border-border"
                  )}
                />

                <Card
                  className={cn(
                    milestone.status === "current" && "border-[#4BE4C1] shadow-lg"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {milestone.status === "current" ? (
                        <CheckCircle2 className="h-6 w-6 text-[#4BE4C1] flex-shrink-0 mt-1" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{milestone.phase}</h3>
                        <ul className="space-y-1">
                          {milestone.items.map((item, j) => (
                            <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

