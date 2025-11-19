"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatItem {
  value: number;
  prefix?: string;
  suffix?: string;
  multiplier?: boolean;
  label: string;
  description: string;
}

const stats: StatItem[] = [
  {
    value: 90,
    prefix: "-",
    suffix: "%",
    label: "Lower photoshoot costs",
    description: "No studios, no photographers, no model bookings.",
  },
  {
    value: 10,
    multiplier: true,
    label: "Faster product launch speed",
    description: "Generate on-model photos in minutes, not weeks.",
  },
  {
    value: 15,
    prefix: "+",
    suffix: "%",
    label: "Higher conversion rates",
    description: "Studio-quality model images boost trust and sales.",
  },
  {
    value: 20,
    prefix: "+",
    suffix: "%",
    label: "Increase in average order value",
    description: "Better visuals = more confident buyers.",
  },
  {
    value: 35,
    prefix: "+",
    suffix: "%",
    label: "Higher ad performance",
    description: "Realistic on-model images improve click-through and engagement.",
  },
];

function AnimatedStatCounter({
  value,
  prefix = "",
  suffix = "",
  multiplier = false,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  multiplier?: boolean;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, amount: 0.5 });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: 2000,
    bounce: 0,
    stiffness: 80,
    damping: 15,
  });

  useEffect(() => {
    if (inView) {
      motionValue.set(value);
    }
  }, [inView, motionValue, value]);

  useEffect(() => {
    if (!nodeRef.current) return;

    const unsubscribe = springValue.on("change", (latest) => {
      if (nodeRef.current) {
        const displayValue = Math.round(latest);
        if (multiplier) {
          nodeRef.current.textContent = `${displayValue}×`;
        } else {
          nodeRef.current.textContent = `${prefix}${displayValue}${suffix}`;
        }
      }
    });

    return unsubscribe;
  }, [springValue, prefix, suffix, multiplier]);

  return (
    <span ref={nodeRef} className="text-5xl md:text-6xl lg:text-7xl font-bold block text-[#356DFF]">
      {multiplier ? "0×" : `${prefix}0${suffix}`}
    </span>
  );
}

export function StatsModelSnap() {
  return (
    <section className="py-20 px-4 md:px-24 bg-[#F7F7F7] dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-white">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          What Brands Achieve With ModelSnap
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-12" style={{ perspective: "1000px" }}>
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
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
                <Card className="h-full text-center relative overflow-hidden 
                  bg-card/50 backdrop-blur-sm
                  border border-border/50
                  shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                  dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                  hover:shadow-[0_12px_40px_rgb(0,0,0,0.15)]
                  dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.4)]
                  transition-all duration-300
                  group">
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
                  
                  <CardContent className="p-6 flex flex-col items-center relative z-10">
                    <div className="mb-4">
                      <AnimatedStatCounter
                        value={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                        multiplier={stat.multiplier}
                      />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold mb-2">{stat.label}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{stat.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

