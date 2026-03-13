import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                surface: {
                    50: "hsl(var(--surface-50))",
                    100: "hsl(var(--surface-100))",
                    200: "hsl(var(--surface-200))",
                    300: "hsl(var(--surface-300))",
                    400: "hsl(var(--surface-400))",
                    500: "hsl(var(--surface-500))",
                    600: "hsl(var(--surface-600))",
                    700: "hsl(var(--surface-700))",
                    800: "hsl(var(--surface-800))",
                    900: "hsl(var(--surface-900))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    hover: "hsl(var(--accent-hover))",
                    muted: "hsl(var(--accent-muted))",
                },
                profit: "hsl(var(--profit))",
                loss: "hsl(var(--loss))",
                neutral: "hsl(var(--neutral))",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.4s ease-out",
                "pulse-slow": "pulse 3s ease-in-out infinite",
                "count-up": "countUp 1.5s ease-out",
                shimmer: "shimmer 2s linear infinite",
                glow: "glow 2s ease-in-out infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                countUp: {
                    "0%": { opacity: "0", transform: "scale(0.5)" },
                    "50%": { transform: "scale(1.1)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                glow: {
                    "0%, 100%": { boxShadow: "0 0 20px hsl(var(--accent) / 0.2)" },
                    "50%": { boxShadow: "0 0 40px hsl(var(--accent) / 0.4)" },
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "grid-pattern":
                    "linear-gradient(hsl(var(--surface-300) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--surface-300) / 0.1) 1px, transparent 1px)",
            },
            backgroundSize: {
                grid: "40px 40px",
            },
        },
    },
    plugins: [],
};

export default config;
