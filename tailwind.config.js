/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                dark: {
                    base: '#0B0E14',      // Strict dark mode background
                    surface: '#101522',   // Sidebar and containers
                    card: '#161D2E',      // Message bubble background (received)
                    sent: '#0D2B16',      // Sent message bubble background
                    border: 'rgba(255, 255, 255, 0.08)',
                    hover: '#1B2438',
                    muted: '#6B7A99'
                },
                neon: {
                    green: '#39FF14',     // Positive actions, send, online, read receipts
                    greenHover: '#32e012',
                    red: '#FF3131',       // Alerts, errors, destructive actions, disconnect
                    redHover: '#e02828'
                }
            },
            boxShadow: {
                'neon-green': '0 0 15px rgba(57, 255, 20, 0.35), 0 0 30px rgba(57, 255, 20, 0.15)',
                'neon-red': '0 0 15px rgba(255, 49, 49, 0.35), 0 0 30px rgba(255, 49, 49, 0.15)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            },
            backdropBlur: {
                xs: '2px',
                glass: '16px'
            },
            animation: {
                'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow-green': 'glowGreen 2s ease-in-out infinite alternate',
                'glow-red': 'glowRed 2s ease-in-out infinite alternate'
            },
            keyframes: {
                glowGreen: {
                    '0%': { boxShadow: '0 0 5px rgba(57, 255, 20, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(57, 255, 20, 0.6)' }
                },
                glowRed: {
                    '0%': { boxShadow: '0 0 5px rgba(255, 49, 49, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(255, 49, 49, 0.6)' }
                }
            }
        },
    },
    plugins: [],
}
