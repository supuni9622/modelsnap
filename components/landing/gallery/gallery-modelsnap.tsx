"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder gallery items - in production, these would come from actual renders
const galleryItems = [
  {
    id: 1,
    garment: "/placeholder.svg",
    rendered: "/placeholder.svg",
    title: "Casual T-Shirt",
  },
  {
    id: 2,
    garment: "/placeholder.svg",
    rendered: "/placeholder.svg",
    title: "Summer Dress",
  },
  {
    id: 3,
    garment: "/placeholder.svg",
    rendered: "/placeholder.svg",
    title: "Hoodie",
  },
  {
    id: 4,
    garment: "/placeholder.svg",
    rendered: "/placeholder.svg",
    title: "Kurta",
  },
  {
    id: 5,
    garment: "/placeholder.svg",
    rendered: "/placeholder.svg",
    title: "Jeans",
  },
  {
    id: 6,
    garment: "/placeholder.svg",
    rendered: "/placeholder.svg",
    title: "Blouse",
  },
];

export function GalleryModelSnap() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

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
          See It In Action
        </motion.h2>

        <motion.p
          className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Hover over any image to see the try-on preview
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative"
            >
              <Card className="overflow-hidden cursor-pointer group">
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    <AnimatePresence mode="wait">
                      {hoveredId === item.id ? (
                        <motion.img
                          key="rendered"
                          src={item.rendered}
                          alt={`${item.title} rendered`}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      ) : (
                        <motion.img
                          key="garment"
                          src={item.garment}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-semibold">{item.title}</p>
                        <p className="text-white/80 text-sm">Hover to see try-on</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

