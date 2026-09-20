/* eslint-disable @next/next/no-head-element */

import "./globals.css";
import type { Metadata } from "next";
import TopNav from "./components/TopNav";

const GA_MEASUREMENT_ID = "G-SSZKYRDJ7N";

export const metadata: Metadata = {
  title: "Quant & Capital",
  description:
    "Portfolio, financial analysis, quantitative studies and trading tools",
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
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];

              function gtag(){
                dataLayer.push(arguments);
              }

              gtag('js', new Date());

              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname
              });
            `,
          }}
        />
      </head>

      <body className="min-h-screen bg-white text-black">
        <TopNav />

        <main className="p-6 max-w-5xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}