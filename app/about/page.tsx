"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Heart, Target, Sparkles } from "lucide-react";

const missions = [
  {
    icon: <Heart className="w-8 h-8 text-primary" />,
    title: "Our Mission",
    description:
      "AuraPulse is designed to make emotional support more accessible through AI-powered technology. Our mission is to provide users with a safe and personalized space where they can express their thoughts, reflect on their emotions, track mood patterns, and receive meaningful AI-based support whenever they need it.",
  },
  {
    icon: <Target className="w-8 h-8 text-primary" />,
    title: "Our Vision",
    description:
      "Our vision is to create a future where emotional well-being tools are accessible, private, and personalized. AuraPulse combines conversational AI, mood tracking, and intelligent emotional insights to help users understand their emotional patterns and build better self-awareness.",
  },
  {
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    title: "Our Values",
    description:
      "AuraPulse is built around privacy, empathy, innovation, and trust. We focus on creating technology that respects user information while providing a supportive and engaging experience through responsible AI.",
  },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-24">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-20"
      >
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          About AuraPulse
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
          AuraPulse is an AI-powered emotional wellness platform that helps
          users understand and reflect on their emotional state through
          intelligent conversations, mood tracking, and personalized insights.
        </p>

        <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
          The platform combines modern AI technologies with a user-centered
          approach to create a supportive digital environment. Through
          conversational interaction, emotional analysis, and mood history
          tracking, AuraPulse helps users explore their feelings and maintain
          awareness of their emotional patterns over time.
        </p>

        <p className="text-lg text-muted-foreground max-w-4xl mx-auto mt-4">
          Designed with privacy and accessibility in mind, AuraPulse processes
          emotional interactions responsibly while providing a simple and
          engaging experience for users seeking everyday emotional support and
          self-reflection.
        </p>
      </motion.div>

      {/* Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {missions.map((mission, index) => (
          <motion.div
            key={mission.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="p-6 text-center h-full bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="mb-4 flex justify-center">
                {mission.icon}
              </div>

              <h3 className="text-xl font-semibold mb-3">
                {mission.title}
              </h3>

              <p className="text-muted-foreground">
                {mission.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Additional Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-semibold mb-5">
          Building a More Connected Emotional Experience
        </h2>

        <p className="text-muted-foreground text-lg">
          AuraPulse focuses on combining artificial intelligence with emotional
          awareness to create a more interactive and personalized experience.
          Instead of relying on a single source of information, the platform
          considers different aspects of user interaction to provide more
          meaningful responses and insights while keeping the user in control
          of their experience.
        </p>
      </motion.div>
    </div>
  );
}