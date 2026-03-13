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
        // Fix pino-pretty import from WalletConnect
        config.resolve.alias = {
            ...config.resolve.alias,
            "pino-pretty": false,
        };
        config.externals = [...(config.externals || []), "pino-pretty"];
        return config;
    },
    typescript: {
        // We handle type checking separately
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;
