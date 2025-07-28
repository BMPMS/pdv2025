import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
    reactStrictMode: false,
    images: {
        unoptimized: true, // Required for static export on GitHub Pages
    },
    assetPrefix: isProd ? '/pdv2025/' : '',
    basePath: isProd ? '/pdv2025' : '',
    output: 'export',
};

export default nextConfig;
