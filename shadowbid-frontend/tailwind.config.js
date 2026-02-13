/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary Colors
                primary: {
                    purple: '#8B5CF6',
                    blue: '#3B82F6',
                },

                // Backgrounds
                background: {
                    main: '#0F172A',
                    card: '#1E293B',
                    elevated: '#334155',
                    input: '#1E293B',
                },

                // Text
                text: {
                    primary: '#F1F5F9',
                    secondary: '#94A3B8',
                    muted: '#64748B',
                    disabled: '#475569',
                },

                // Status Colors
                status: {
                    success: '#10B981',
                    warning: '#F59E0B',
                    error: '#EF4444',
                    info: '#3B82F6',
                    live: '#22C55E',
                },

                // Playful Accents
                accent: {
                    pink: '#EC4899',
                    cyan: '#06B6D4',
                    yellow: '#FBBF24',
                    orange: '#F97316',
                },

                // Functional
                border: '#334155',
            },

            boxShadow: {
                'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
                'glow-purple-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
                'card': '0 4px 6px rgba(139, 92, 246, 0.1)',
                'card-hover': '0 8px 32px rgba(139, 92, 246, 0.2)',
            },

            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s infinite',
            },

            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
        },
    },
    plugins: [],
}