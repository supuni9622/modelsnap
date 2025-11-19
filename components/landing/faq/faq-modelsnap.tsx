"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is ModelSnap?",
    answer:
      "ModelSnap lets you create studio-quality on-model photos in minutes using AI models or real human models — without doing a photoshoot.",
  },
  {
    question: "How does the waitlist work?",
    answer:
      "Joining the waitlist gives you early access, priority onboarding, and exclusive early-user pricing when the platform goes live.",
  },
  {
    question: "When will I get access?",
    answer:
      "We are onboarding users in batches. Once your turn comes, you'll receive an email with your login link and setup instructions.",
  },
  {
    question: "Where do ModelSnap's AI and Human models come from?",
    answer:
      "Our AI models are created using ethically trained fashion datasets. Human models join through our verified Model Marketplace and provide full consent.",
  },
  {
    question: "Can I upload my clothing photos and get instant on-model images?",
    answer:
      "Yes. Just upload a clear photo of your product — ModelSnap will generate on-model photos in minutes using AI or Human models.",
  },
  {
    question: "Can I choose the model's body type, skin tone, or look?",
    answer:
      "Yes. You can select from multiple AI models or pick a real human model based on their appearance.",
  },
];

export function FAQModelSnap() {
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
          Frequently Asked Questions
        </motion.h2>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <AccordionItem value={`item-${index}`} className="border-b border-border">
                  <AccordionTrigger className="text-left text-lg font-medium py-4 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

