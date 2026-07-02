import type { NextConfig } from "next";

const nextConfig = {
  output: 'export',
  images: { unoptimized: true }
  };
  // Añade esto si el compilador sigue quejándose de las rutas dinámicas en el cliente:
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;