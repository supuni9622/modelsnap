"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

// Gallery items from /public/gallery folder
const galleryItems = [
  {
    id: 1,
    garment: "/gallery/hoodie.jpg",
    rendered: "/gallery/hoodie-model.jpg",
    title: "Hoodie",
  },
  {
    id: 2,
    garment: "/gallery/tshirt.png",
    rendered: "/gallery/tshirt-model.png",
    title: "Casual T-Shirt",
  },
  {
    id: 3,
    garment: "/gallery/frock.png",
    rendered: "/gallery/frock-model.png",
    title: "Dress",
  },
  {
    id: 4,
    garment: "/gallery/kurtha.png",
    rendered: "/gallery/kurtha-model.png",
    title: "Kurta",
  },
  {
    id: 5,
    garment: "/gallery/saree.png",
    rendered: "/gallery/saree-model.png",
    title: "Saree",
  },
  {
    id: 6,
    garment: "/gallery/jean.png",
    rendered: "/gallery/jean-model.png",
    title: "Jeans",
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6" style={{ perspective: "1000px" }}>
          {galleryItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              whileHover={{ 
                y: -8,
                transition: { duration: 0.3 }
              }}
              className="relative h-full"
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
                <Card className="overflow-hidden cursor-pointer group relative h-full
                  bg-card/50 backdrop-blur-sm
                  border border-border/50
                  shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                  dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                  hover:shadow-[0_12px_40px_rgb(0,0,0,0.15)]
                  dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.4)]
                  transition-all duration-300">
                  {/* Embedded inset shadow effect */}
                  <div className="absolute inset-0 
                    shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]
                    dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]
                    pointer-events-none z-10" />
                  
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 
                    bg-gradient-to-br from-white/10 via-transparent to-transparent 
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                    pointer-events-none z-10" />
                  
                  <CardContent className="p-0 relative z-0">
                    <div className="relative aspect-square bg-gray-100">
                      <AnimatePresence mode="wait">
                        {hoveredId === item.id ? (
                          <motion.div
                            key="rendered"
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Image
                              src={item.rendered}
                              alt={`${item.title} rendered`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 33vw"
                              unoptimized={item.rendered.endsWith('.svg')}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="garment"
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Image
                              src={item.garment}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 33vw"
                              unoptimized={item.garment.endsWith('.svg')}
                            />
                          </motion.div>
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

