/* eslint-disable @next/next/no-head-element */
import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

const GA_MEASUREMENT_ID = 'G-SSZKYRDJ7N';

export const metadata: Metadata = {
  title: 'Mio Sito Portfolio',
  description: 'Portafoglio, simulatore, analisi e studi matematici',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        {/* Google Analytics 4 */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-black">
        <header className="w-full border-b p-4 flex gap-4 text-sm">
          <Link href="/"> Home</Link>
          <Link href="/portfolio"> Portfolio</Link>
          <Link href="/analyses"> Analyses</Link>
          <Link href="/math-studies"> Math Studies</Link>
          <Link href="/simulator"> Simulator</Link>
        </header>
        <main className="p-6 max-w-4xl mx-auto">{children}</main>
      </body>
    </html>
  );
}

