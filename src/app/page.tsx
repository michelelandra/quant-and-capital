'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronUp } from 'lucide-react';

export default function HomePage() {
  const [aboutOpen, setAboutOpen] = useState(false);

  /* ---- card data ---- */
  const cards = [
    {
      href: '/portfolio',
      title: 'Portfolio',
      desc: 'Simulated investments & live performance',
      grad: 'from-red-500 to-pink-500',
      icon: '📈',
    },
    {
      href: '/analyses',
      title: 'Analyses',
      desc: 'Opinions on stocks, ETFs & events',
      grad: 'from-blue-500 to-indigo-500',
      icon: '🧠',
    },
    {
      href: '/math-studies',
      title: 'Math Studies',
      desc: 'Math experiments & quant models',
      grad: 'from-teal-500 to-emerald-500',
      icon: '🧮',
    },
    {
      href: '/simulator',
      title: 'Simulator',
      desc: 'Try your own portfolio strategies',
      grad: 'from-amber-400 to-orange-600',
      icon: '⚙️',
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Logo + headline */}
      <div className="flex flex-col items-center justify-center py-10">
        <Image src="/logo1.png" alt="Quant & Capital Logo" width={320} height={160} />
        <h1 className="text-4xl md:text-5xl font-bold mt-6">Quant&nbsp;&amp;&nbsp;Capital</h1>
        <p className="text-lg md:text-xl text-center text-gray-600 max-w-2xl mt-4">
          A personal lab where I track portfolios, share market analyses, and explore quantitative finance&nbsp;&amp; math models.
        </p>
      </div>

      {/* About-me collapsible */}
      <section className="max-w-3xl mx-auto px-4">
        <button
          onClick={() => setAboutOpen(!aboutOpen)}
          className="w-full flex items-center justify-between bg-gray-100 rounded-md px-4 py-3 text-lg font-medium focus:outline-none"
        >
          About Me
          <ChevronUp
            className={`h-5 w-5 transition-transform ${
              aboutOpen ? 'rotate-0' : 'rotate-180'
            }`}
          />
        </button>

        {aboutOpen && (
          <div className="bg-gray-50 border border-gray-200 rounded-b-md p-4 space-y-2 text-gray-700">
            <p>
              I’m <strong>Michele Landra</strong>, a finance &amp; math enthusiast currently studying
              at <strong>Bocconi University</strong>. I use this site to document ideas, analyses,
              and quantitative experiments – and bringing finance closer to students and curious minds
            </p>
            <p>
              Interests: quantitative equity, ETF strategies, factor modelling, derivatives,
              macro research, mathematical models, and risky assets.
            </p>
          </div>
        )}
      </section>

      {/* Cards grid */}
      <section className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto px-4 py-10">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-xl p-6 text-white shadow-lg bg-gradient-to-br ${c.grad} hover:scale-[1.03] transition-transform`}
          >
            <span className="text-4xl">{c.icon}</span>
            <h3 className="text-2xl font-semibold mt-2">{c.title}</h3>
            <p className="mt-1 text-sm opacity-90">{c.desc}</p>
          </Link>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 py-6 border-t">
        © 2025 Quant &amp;&nbsp;Capital —{' '}
        <a href="mailto:your.email@example.com" className="underline hover:text-gray-700">
          michele.landra@gmail.com
        </a>
      </footer>
    </main>
  );
}



