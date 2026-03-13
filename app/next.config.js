/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
            };
        }
        return config;
    },
    experimental: {
        serverComponentsExternalPackages: [
            "@coral-xyz/anchor",
            "@solana/web3.js",
        ],
    },
};

module.exports = nextConfig;
