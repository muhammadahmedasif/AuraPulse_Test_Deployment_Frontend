"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Brain,
  Shield,
  Activity,
  Bot,
  LineChart,
  Heart,
  Camera,
  MessageCircle,
  Mic,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: <Bot className="w-10 h-10 text-primary" />,
    title: "AI Therapy Assistant",
    description:
      "A conversational AI companion that provides personalized emotional support through natural conversations and understands your unique needs over time.",
  },

  {
    icon: <Brain className="w-10 h-10 text-primary" />,
    title: "Multimodal Emotion Understanding",
    description:
      "Combines conversational context, mood patterns, and emotional signals to create a deeper understanding of your current emotional state.",
  },

  {
    icon: <Camera className="w-10 h-10 text-primary" />,
    title: "Facial Mood Detection",
    description:
      "Optional camera-based emotion analysis helps track mood changes while processing facial data locally to prioritize user privacy.",
  },

  {
    icon: <MessageCircle className="w-10 h-10 text-primary" />,
    title: "Personalized Conversations",
    description:
      "The AI adapts conversations based on your previous interactions, emotional patterns, and ongoing mental wellness journey.",
  },

  {
    icon: <Activity className="w-10 h-10 text-primary" />,
    title: "Crisis Awareness & Support",
    description:
      "Monitors conversations for signs of emotional distress and provides appropriate support pathways during critical situations.",
  },

  {
    icon: <LineChart className="w-10 h-10 text-primary" />,
    title: "Mood Tracking & Insights",
    description:
      "Track emotional patterns over time with visual insights that help you understand changes in your mood and wellbeing.",
  },

  {
    icon: <Mic className="w-10 h-10 text-primary" />,
    title: "Voice Interaction",
    description:
      "Interact naturally with the AI through voice-based communication for a more accessible and human-like experience.",
  },

  {
    icon: <Shield className="w-10 h-10 text-primary" />,
    title: "Privacy Focused Design",
    description:
      "Your emotional data is handled with privacy in mind, keeping sensitive information protected while enabling personalized support.",
  },

  {
    icon: <Sparkles className="w-10 h-10 text-primary" />,
    title: "Continuous Personalization",
    description:
      "The system learns from your interactions and emotional patterns to provide more relevant and meaningful support.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-24">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Platform Features
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          AuraPulse combines artificial intelligence, emotional understanding,
          and personalized interaction to provide accessible mental wellness
          support through a secure and intelligent platform.
        </p>
      </motion.div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        {features.map((feature, index) => (

          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
            }}
          >

            <Card
              className="
              p-6 
              h-full 
              hover:shadow-lg 
              transition-shadow 
              duration-300 
              bg-card/50 
              backdrop-blur 
              supports-[backdrop-filter]:bg-background/60
              "
            >

              <div className="mb-4">
                {feature.icon}
              </div>


              <h3 className="text-xl font-semibold mb-2">
                {feature.title}
              </h3>


              <p className="text-muted-foreground">
                {feature.description}
              </p>


            </Card>

          </motion.div>

        ))}

      </div>



      <motion.div

        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}

        transition={{
          duration: 0.5,
          delay: 0.8,
        }}

        className="text-center mt-16"

      >

        <h2 className="text-2xl font-semibold mb-4">
          Ready to Begin Your Journey?
        </h2>


        <p className="text-muted-foreground mb-8">
          Experience personalized AI-powered emotional support designed around
          your mental wellness needs.
        </p>


        <a
          href="/dashboard"
          className="
          inline-flex 
          items-center 
          px-6 
          py-3 
          rounded-lg 
          bg-primary 
          text-primary-foreground 
          hover:bg-primary/90 
          transition-colors
          "
        >

          Start Your Journey

          <Heart className="ml-2 w-5 h-5" />

        </a>


      </motion.div>


    </div>
  );
}