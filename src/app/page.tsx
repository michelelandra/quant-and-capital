'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, Brain, Calculator, Settings } from 'lucide-react';

export default function HomePage() {
  const [aboutOpen, setAboutOpen] = useState(false);

  const cards = [
    {
      href: '/portfolio',
      title: 'Portfolio',
      desc: 'Simulated investments & performance',
      icon: <BarChart3 size={36} />, color: 'bg-neutral-100'
    },
    {
      href: '/analyses',
      title: 'Analyses',
      desc: 'Opinions on stocks, ETFs & events',
      icon: <Brain size={36} />, color: 'bg-neutral-100'
    },
    {
      href: '/math-studies',
      title: 'Math Studies',
      desc: 'Math experiments & quant models',
      icon: <Calculator size={36} />, color: 'bg-neutral-100'
    },
    {
      href: '/simulator',
      title: 'Simulator',
      desc: 'Try your own portfolio strategies',
      icon: <Settings size={36} />, color: 'bg-neutral-100'
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center justify-center py-10"
      >
        <Image src="/logo1.png" alt="Quant & Capital Logo" width={280} height={140} />
        <h1 className="text-4xl md:text-5xl font-extrabold mt-6">
          Welcome to <span className="text-[#b5121b]">Quant & Capital</span>
        </h1>
        <p className="text-lg md:text-xl text-center text-gray-600 max-w-2xl mt-4">
          A lab where i show my journey through quantitative finance, market analyses and mathematical explorations.
        </p>
        <Link href="/portfolio">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded mt-6">
            View Portfolio
          </button>
        </Link>
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <button
          onClick={() => setAboutOpen(!aboutOpen)}
          className="w-full flex items-center justify-between bg-gray-100 rounded-md px-4 py-3 text-lg font-medium"
        >
          About Me
          <span className={`transition-transform ${aboutOpen ? '' : 'rotate-180'}`}>
            ▼
          </span>
        </button>
        {aboutOpen && (
          <div className="bg-gray-50 border border-gray-200 rounded-b-md p-4 space-y-2 text-gray-700">
            <p>
              I’m <strong>Michele Landra</strong>, a finance & math enthusiast currently studying
              at <strong>Bocconi University</strong>. I use this site to document ideas, analyses,
              and quantitative experiments – and bringing finance closer to students and curious minds.
            </p>
            <p>
              Interests: quantitative equity, ETF strategies, factor modelling, derivatives,
              macro research, mathematical models, and risky assets.
            </p>
          </div>
        )}
      </div>

      <section className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto px-4 py-12">
        {cards.map(({ href, title, desc, icon, color }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-lg p-6 shadow-sm border hover:shadow-md transition-all ${color}`}
          >
            <div className="text-[#b5121b] mb-2">{icon}</div>
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{desc}</p>
          </Link>
        ))}
      </section>

      <footer className="text-center text-sm text-gray-500 py-6 border-t">
        <p>© 2025 Quant & Capital — michele.landra@gmail.com</p>
        <div className="flex justify-center gap-4 mt-2">
          <a
            href="https://www.linkedin.com/in/michelelandra"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-[#0A66C2]"
          >
            LinkedIn
          </a>
          <a
            href="https://www.instagram.com/michelelandra"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-pink-600"
          >
            Instagram
          </a>
        </div>
      </footer>
    </main>
  );
}
