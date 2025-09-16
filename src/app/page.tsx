"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Instagram,
  Linkedin,
  BarChart3,
  Brain,
  Calculator,
  Settings,
  Activity,
  LineChart,
  BookOpen,
  Gamepad2,
} from "lucide-react";
import Comments from "./math-studies/components/Comments";

// Tailwind colour for brand accent
const accent = "#8b1d1d";

type Card = {
  href: string;
  title: string;
  desc: string;
  icon: any;
  badge?: string;
};

const cards: Card[] = [
  { href: "/portfolio", title: "Portfolio", desc: "Simulated investments & live performance", icon: BarChart3 },
  { href: "/analyses", title: "Analyses", desc: "Opinions on stocks, ETFs & events", icon: Brain },
  { href: "/math-studies", title: "Math Studies", desc: "Math experiments & quant models", icon: Calculator },
  { href: "/simulator", title: "Simulator", desc: "Try your own portfolio strategies", icon: Settings },

  // NEW sections
  { href: "/scenarios", title: "Scenarios", desc: "Replay historic market regimes (2008, dot-com, Covid crash).", icon: LineChart },
  { href: "/case-studies", title: "Case Studies", desc: "Single-asset deep dives during pivotal moments (e.g. NVIDIA boom).", icon: BookOpen },
  { href: "/trading-games", title: "Trading Games", desc: "Mini trading challenges with leaderboards.", icon: Gamepad2 },

  // Trading Arena (già presente)
  {
    href: "/trading-arena",
    title: "Trading Arena",
    desc:
      "Timed trading drills on scripted price paths to train execution under pressure. Work in progress — coming soon.",
    icon: Activity,
    badge: "Coming soon",
  },
];

export default function HomePage() {
  return (
    <motion.div
      className="container mx-auto px-4 py-10 max-w-5xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <Image
          src="/logo1.png"
          alt="Quant & Capital Logo"
          width={200}
          height={200}
          className="rounded-full shadow-md"
          priority
        />
      </div>

      {/* Hero Section */}
      <header className="text-center mb-12">
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          Welcome to <span style={{ color: accent }}>Quant &amp; Capital</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
          Sharing my journey through quantitative finance, market analyses and mathematical explorations.
        </p>

        {/* Animated CTA */}
        <motion.div className="inline-block mt-8" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/portfolio"
            className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition"
          >
            View Portfolio
          </Link>
        </motion.div>
      </header>

      {/* About Me */}
      <details className="mb-12 border border-gray-200 rounded-xl backdrop-blur-sm bg-white/60 shadow-sm overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 font-semibold select-none text-lg">About Me</summary>
        <div className="px-4 py-3 text-gray-700 leading-relaxed">
          <p className="mb-2">
            Hi, I’m <span className="font-semibold">Michele Landra</span>, an Economics &amp; Finance student at{" "}
            <span className="font-semibold">Bocconi University</span> passionate about data-driven investing and
            quantitative research.
          </p>
          <p className="mb-2">
            This site is my public lab notebook: I track simulated portfolios, publish market commentaries, and share
            mathematical deep-dives that connect theory with real-world markets.
          </p>
          <p>Explore, challenge the ideas, and feel free to reach out with feedback or collaboration proposals!</p>
        </div>
      </details>

      {/* Section Cards */}
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {cards.map(({ href, title, desc, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl p-6 border border-gray-200 hover:shadow-lg transition group bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <Icon className="w-8 h-8 group-hover:scale-105 transition-transform" style={{ color: accent }} />
              {badge && <span className="text-[10px] px-2 py-1 rounded-full border bg-white text-gray-600">{badge}</span>}
            </div>
            <h3 className="text-xl font-semibold mt-3 mb-1 group-hover:underline">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </Link>
        ))}
      </section>

      {/* TEST commenti */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-2">Test Commenti</h2>
        <p className="text-sm text-gray-600 mb-4">
          Se vedi il form qui sotto, le API e il client funzionano correttamente.
        </p>
        <Comments postId="2991dd8d-61bf-4c13-9bee-e793e3caeeab" />
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Quant &amp; Capital — Michele Landra</p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="https://www.instagram.com/yourprofile" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram className="w-6 h-6 hover:text-pink-500 transition-colors" />
          </a>
          <a href="https://www.linkedin.com/in/yourprofile" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <Linkedin className="w-6 h-6 hover:text-blue-700 transition-colors" />
          </a>
        </div>
      </footer>
    </motion.div>
  );
}
