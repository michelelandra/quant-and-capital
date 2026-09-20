import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quant & Capital Portfolio Simulator",
    short_name: "Q&C Simulator",
    description:
      "Build and manage a personal virtual investment portfolio with live prices, long and short positions, P/L analytics, and an S&P 500 benchmark.",

    start_url: "/simulator",
    scope: "/",
    display: "standalone",

    background_color: "#ffffff",
    theme_color: "#8b1d1d",

    orientation: "any",

    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    shortcuts: [
      {
        name: "Open Portfolio Simulator",
        short_name: "Simulator",
        description: "Open your personal virtual portfolio",
        url: "/simulator",
      },
    ],
  };
}