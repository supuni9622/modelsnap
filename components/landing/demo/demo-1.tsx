"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useRef, useEffect } from "react";

export function DemoModelSnap() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Try to play the video when component mounts
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
        } catch (error) {
          // Autoplay was prevented, user interaction required
          console.log("Video autoplay prevented:", error);
        }
      }
    };
    playVideo();
  }, []);

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
         <h2 className="text-3xl md:text-4xl font-bold mb-4">See It In Action</h2>
<p className="text-gray-300 max-w-2xl mx-auto">
  Watch how you can create stunning fashion photos in just minutes
</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ perspective: "1000px" }}
        >
          <motion.div
            whileHover={{
              rotateY: 2,
              rotateX: -2,
              scale: 1.01,
            }}
            transition={{ duration: 0.3 }}
            style={{ transformStyle: "preserve-3d" }}
            className="group"
          >
            <Card className="bg-white/5 border-white/10 overflow-hidden relative
              shadow-[0_8px_30px_rgb(0,0,0,0.3)]
              hover:shadow-[0_12px_40px_rgb(0,0,0,0.4)]
              transition-all duration-300">
              {/* Embedded inset shadow effect */}
              <div className="absolute inset-0 
                shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]
                pointer-events-none z-10" />
              
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 
                bg-gradient-to-br from-white/10 via-transparent to-transparent 
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                pointer-events-none z-10" />
              
              <CardContent className="p-0 relative z-0">
                <div className="aspect-video relative bg-gradient-to-br from-[#356DFF]/20 to-[#4BE4C1]/20">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  muted
                  loop
                  autoPlay
                  preload="auto"
                  onError={(e) => {
                    console.error("Video error:", e);
                  }}
                >
                  <source src="/demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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

