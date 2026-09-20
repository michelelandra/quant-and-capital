"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/analyses", label: "Analyses" },
  { href: "/math-studies", label: "Math Studies" },
  { href: "/simulator", label: "Simulator" },
  { href: "/trading-arena", label: "Trading Arena" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/quant-lab", label: "Quant Lab" },
  { href: "/trading-games", label: "Trading Games" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-gray-900"
        >
          Quant & Capital
        </Link>

        <nav className="flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
                    active
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-black",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}