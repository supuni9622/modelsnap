"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, TrendingUp } from "lucide-react";

const team = [
  {
    name: "Supuni",
    role: "Tech Builder",
    icon: Code,
    description1: "🌟 Turning crazy ideas into real features.",
    description2: "💻 Building the tech that powers every ModelSnap render.",
    url:'https://www.linkedin.com/in/supuni-manamperi-bb5baa176/'
  },
  {
    name: "Hoshini",
    role: "Fashion & Community",
    icon: TrendingUp,
    description1: "👗 Talking to fashion sellers every day.",
    description2: "🚀 Making sure ModelSnap solves real fashion problems.",
    url:'https://www.linkedin.com/in/hoshiniperera/'
  },
];

export function TeamModelSnap() {
  return (
    <section className="py-20 px-4 md:px-24 bg-white text-[#1A1A1A]">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Meet the Team Behind the Magic ✨
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {team.map((member, i) => {
            const Icon = member.icon;
            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
              >
                <Card 
                  className="h-full hover:shadow-lg transition-shadow group cursor-pointer"
                  onClick={() => window.open(member.url, "_blank", "noopener,noreferrer")}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="rounded-full bg-[#356DFF]/10 p-4 group-hover:bg-[#356DFF]/20 transition-colors">
                        <Icon className="h-8 w-8 text-[#356DFF]" />
                      </div>
                      <div>
                        <CardTitle>{member.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-2">{member.description1}</p>
                    <p className="text-muted-foreground">{member.description2}</p>
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

