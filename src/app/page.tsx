'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Linkedin, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ---------- dati card ---------- */
const cards = [
  {
    href: '/portfolio',
    title: 'Portfolio',
    desc: 'Simulated investments & live performance',
    grad: 'from-red-500 to-pink-600',
    icon: '📈',
  },
  {
    href: '/analyses',
    title: 'Analyses',
    desc: 'Opinions on stocks, ETFs & events',
    grad: 'from-blue-500 to-indigo-600',
    icon: '🧠',
  },
  {
    href: '/math-studies',
    title: 'Math Studies',
    desc: 'Math experiments & quant models',
    grad: 'from-teal-500 to-emerald-600',
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

export default function HomePage() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* ---------------------------------------------------------------- NAV */}
      <header className="shadow-sm sticky top-0 z-30 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* logo mini --------------------------------------------------- */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo1.png"
              alt="Quant & Capital"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-bold hidden sm:inline">Quant & Capital</span>
          </Link>

          {/* desktop menu ------------------------------------------------ */}
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            {cards.map(c => (
              <Link key={c.href} href={c.href} className="hover:text-rose-600">
                {c.title}
              </Link>
            ))}
          </nav>

          {/* hamburger mobile ------------------------------------------- */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* mobile dropdown --------------------------------------------- */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t overflow-hidden bg-white"
            >
              <ul className="flex flex-col px-6 py-4 gap-3 text-sm font-medium">
                {cards.map(c => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-1 hover:text-rose-600"
                    >
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* ---------------------------------------------------------- HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* logo grande */}
          <Image
            src="/logo1.png"
            alt="Quant & Capital Logo"
            width={280}
            height={140}
            priority
            className="mx-auto"
          />

          {/* headline */}
          <h1 className="text-4xl md:text-5xl font-extrabold">
            Welcome to{' '}
            <span className="text-rose-600 drop-shadow-sm">Quant&nbsp;&amp;&nbsp;Capital</span>
          </h1>
          <p className="max-w-xl mx-auto text-gray-600 text-lg">
            Sharing my journey through quantitative finance, market analyses and mathematical
            explorations.
          </p>

          {/* CTA */}
          <Link
            href="/portfolio"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold shadow"
          >
            View Portfolio
          </Link>
        </motion.div>
      </section>

      {/* -------------------------------------------------- ABOUT ME COLLAPSE */}
      <section className="max-w-3xl mx-auto w-full px-4 pb-14">
        <button
          onClick={() => setAboutOpen(!aboutOpen)}
          className="w-full flex items-center justify-between bg-gray-100 rounded-md px-4 py-3 text-lg font-medium focus:outline-none"
        >
          {aboutOpen ? 'Hide' : 'About Me'}
          <motion.span
            animate={{ rotate: aboutOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronIcon />
          </motion.span>
        </button>

        <AnimatePresence>
          {aboutOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-gray-50 border border-gray-200 rounded-b-md p-4 space-y-2 text-gray-700"
            >
              <p>
                I’m <strong>Michele Landra</strong>, finance &amp; math enthusiast studying at
                <strong> Bocconi University</strong>. This site is my public lab for portfolio
                tracking, analytical write-ups and quantitative models.
              </p>
              <p>
                Interests: quantitative equity, ETF strategies, factor modelling, derivatives,
                macro research, mathematical models and risky assets.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* -------------------------------------------------- CARD GRID */}
      <section className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto px-4 pb-20">
        {cards.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-xl p-6 text-white shadow-md bg-gradient-to-br ${c.grad} hover:scale-[1.03] transition-transform`}
          >
            <span className="text-4xl">{c.icon}</span>
            <h3 className="text-2xl font-semibold mt-2">{c.title}</h3>
            <p className="mt-1 text-sm/relaxed opacity-90">{c.desc}</p>
          </Link>
        ))}
      </section>

      {/* ------------------------------------------------------- FOOTER */}
      <footer className="text-center text-sm text-gray-500 py-6 border-t">
        <div className="flex justify-center gap-4 mb-2 text-gray-600">
          <a
            href="https://www.linkedin.com/in/tuo-linkedin/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-rose-600"
            aria-label="LinkedIn"
          >
            <Linkedin size={20} />
          </a>
          <a
            href="https://www.instagram.com/tuo-instagram/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-rose-600"
            aria-label="Instagram"
          >
            <Instagram size={20} />
          </a>
          <a href="mailto:michele.landra@gmail.com" className="hover:text-rose-600">
            📧
          </a>
        </div>

        © 2025 Quant&nbsp;&amp;&nbsp;Capital
      </footer>
    </main>
  );
}

/* ---------- icona ▼ semplice ---------- */
function ChevronIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block"
    >
      <polyline points="6 8 10 12 14 8" />
    </svg>
  );
}


