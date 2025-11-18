"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

interface Avatar {
  _id: string;
  gender: string;
  bodyType: string;
  skinTone: string;
  imageUrl: string;
}

export function HeroModelSnap() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch a few sample avatars for the hero preview
    // Only runs on client to avoid hydration mismatch
    const fetchAvatars = async () => {
      try {
        const response = await fetch("/api/avatars");
        if (response.ok) {
          const data = await response.json();
          const allAvatars = data.data || [];
          if (allAvatars.length > 0) {
            // Use deterministic selection instead of Math.random() to avoid hydration issues
            // Select first 3 female and first 3 male avatars for consistent display
            const femaleAvatars = allAvatars.filter((a: Avatar) => a.gender === "female").slice(0, 3);
            const maleAvatars = allAvatars.filter((a: Avatar) => a.gender === "male").slice(0, 3);
            const selected = [...femaleAvatars, ...maleAvatars].slice(0, 6);
            setAvatars(selected);
          }
        }
      } catch (error) {
        console.error("Failed to fetch avatars:", error);
        // Fallback: Use static avatar paths if API fails
        const fallbackAvatars: Avatar[] = [
          { _id: "1", gender: "female", bodyType: "slim", skinTone: "SL-01", imageUrl: "/avatars/female/slim/SL-01.jpg" },
          { _id: "2", gender: "female", bodyType: "curvy", skinTone: "SL-02", imageUrl: "/avatars/female/curvy/SL-02.jpg" },
          { _id: "3", gender: "male", bodyType: "athletic", skinTone: "SL-01", imageUrl: "/avatars/male/athletic/SL-01.jpg" },
          { _id: "4", gender: "male", bodyType: "slim", skinTone: "SL-03", imageUrl: "/avatars/male/slim/SL-03.jpg" },
          { _id: "5", gender: "female", bodyType: "athletic", skinTone: "SL-03", imageUrl: "/avatars/female/athletic/SL-03.jpg" },
          { _id: "6", gender: "male", bodyType: "dad-bod", skinTone: "SL-02", imageUrl: "/avatars/male/dad-bod/SL-02.jpg" },
        ];
        setAvatars(fallbackAvatars);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch on client side
    if (typeof window !== "undefined") {
      fetchAvatars();
    }
  }, []);
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#1A1A1A] text-white">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A] via-[#1A1A1A] to-[#2A2A2A]" />
      
      {/* Animated background elements */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#356DFF]/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#4BE4C1]/10 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="container relative z-10 px-4 md:px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[#356DFF]/20 border border-[#356DFF]/30 px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-[#4BE4C1]" />
              <span className="text-[#4BE4C1]">AI-Powered Fashion Photography</span>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="block">ModelSnap.ai</span>
            <span className="block mt-2 text-[#4BE4C1]">
              Sri Lankan AI Models.
            </span>
            <span className="block mt-2">
              Realistic Fits. Zero Photoshoots.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Upload clothing → Choose AI/Human model → Get studio-quality photos in minutes
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link href="#pricing">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  className="bg-[#356DFF] hover:bg-[#356DFF]/90 text-white font-semibold px-8 py-6 text-lg gap-2"
                >
                  Get Early Access
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <Link href="#demo">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
                >
                  Try Demo
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-[#1A1A1A] bg-[#356DFF]"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.9 + i * 0.1 }}
                  />
                ))}
              </div>
              <span>Trusted by 500+ fashion brands</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.svg
                  key={i}
                  className="h-4 w-4 fill-[#4BE4C1]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 1.2 + i * 0.1 }}
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </motion.svg>
              ))}
              <span className="ml-1">5.0 rating</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Image/Preview - AI Model Gallery */}
        <motion.div
          className="mt-16 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            {loading ? (
              <div className="aspect-video rounded-lg bg-gradient-to-br from-[#356DFF]/20 to-[#4BE4C1]/20 flex items-center justify-center">
                <p className="text-gray-400">Loading AI Models...</p>
              </div>
            ) : avatars.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {avatars.map((avatar, index) => (
                  <motion.div
                    key={avatar._id}
                    className="relative aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-white/5"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                    whileHover={{ scale: 1.05, zIndex: 10 }}
                  >
                    <Image
                      src={avatar.imageUrl}
                      alt={`${avatar.gender} ${avatar.bodyType} ${avatar.skinTone}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 16vw"
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-gradient-to-br from-[#356DFF]/20 to-[#4BE4C1]/20 flex items-center justify-center">
                <p className="text-gray-400">AI Model Preview</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

