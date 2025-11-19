"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export function DemoModelSnap() {
  return (
    <section className="py-20 px-4 md:px-24 bg-[#1A1A1A] text-white">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Demo</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            See how easy it is to create professional fashion photos in minutes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video relative bg-gradient-to-br from-[#356DFF]/20 to-[#4BE4C1]/20 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    size="lg"
                    className="bg-[#356DFF] hover:bg-[#356DFF]/90 text-white rounded-full w-20 h-20"
                  >
                    <Play className="h-8 w-8 ml-1" />
                  </Button>
                </motion.div>
                <p className="absolute bottom-4 left-4 text-white/60 text-sm">
                  Demo video coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            asChild
          >
            <Link href="/app">Try Demo</Link>
          </Button>
        </motion.div> */}
      </div>
    </section>
  );
}

