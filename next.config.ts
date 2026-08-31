import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    // Mídia de terceiros (Instagram/CDN) nunca é rehospedada pelo Cérebro.
    // Ela aparece como referência de triagem, sempre creditada.
    remotePatterns: [{ protocol: "https", hostname: "**.cdninstagram.com" }, { protocol: "https", hostname: "**.fbcdn.net" }],
  },
};

export default config;
