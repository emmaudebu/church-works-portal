import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        screens: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
        },
        extend: {
            colors: {
                primary: {
                    50: '#FDF2F3',
                    500: 'rgb(var(--primary-500) / <alpha-value>)',
                    700: 'rgb(var(--primary-700) / <alpha-value>)',
                    900: 'rgb(var(--primary-900) / <alpha-value>)',
                },
                gold: {
                    50: '#FBF6E6',
                    300: '#E3C76A',
                    500: 'rgb(var(--gold-500) / <alpha-value>)',
                },
                silver: {
                    300: '#C0C0C0',
                    500: '#8C9095',
                },
                charcoal: {
                    900: '#1A1A1A',
                },
                neutral: {
                    50: '#F8F7F5',
                    200: '#E7E4DF',
                    600: '#57534E',
                    900: '#1A1A1A',
                },
                success: '#15803D',
                warning: '#B45309',
                danger: '#B91C1C',
            },
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
                serif: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
            },
            boxShadow: {
                soft: '0 1px 3px rgba(0,0,0,.06), 0 8px 24px rgba(122,18,16,.06)',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-14px)' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translate(0, 0) rotate(45deg)' },
                    '50%': { transform: 'translate(8px, -20px) rotate(70deg)' },
                },
                'ken-burns': {
                    from: { transform: 'scale(1)' },
                    to: { transform: 'scale(1.1)' },
                },
                'fade-up': {
                    from: { opacity: 0, transform: 'translateY(22px)' },
                    to: { opacity: 1, transform: 'none' },
                },
                'page-in': {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                },
                'popup-zoom': {
                    from: { opacity: 0, transform: 'scale(0.7)' },
                    to: { opacity: 1, transform: 'none' },
                },
                'popup-slide-up': {
                    from: { opacity: 0, transform: 'translateY(90px)' },
                    to: { opacity: 1, transform: 'none' },
                },
                'popup-slide-down': {
                    from: { opacity: 0, transform: 'translateY(-90px)' },
                    to: { opacity: 1, transform: 'none' },
                },
                'popup-bounce': {
                    '0%': { opacity: 0, transform: 'scale(0.4)' },
                    '60%': { opacity: 1, transform: 'scale(1.06)' },
                    '80%': { transform: 'scale(0.97)' },
                    '100%': { transform: 'none' },
                },
                'popup-flip': {
                    from: { opacity: 0, transform: 'perspective(1200px) rotateX(-70deg)' },
                    to: { opacity: 1, transform: 'none' },
                },
                pulse: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--gold-500) / 0.45)' },
                    '50%': { boxShadow: '0 0 0 14px rgb(var(--gold-500) / 0)' },
                },
            },
            animation: {
                float: 'float 6s ease-in-out infinite',
                'float-slow': 'float-slow 9s ease-in-out infinite',
                'ken-burns': 'ken-burns 12s ease-out forwards',
                'fade-up': 'fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
                'page-in': 'page-in 0.45s ease-out both',
                'popup-fade': 'page-in 0.6s ease-out both',
                'popup-zoom': 'popup-zoom 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
                'popup-slide-up': 'popup-slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
                'popup-slide-down': 'popup-slide-down 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
                'popup-bounce': 'popup-bounce 0.8s ease-out both',
                'popup-flip': 'popup-flip 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
                pulse: 'pulse 2.8s ease-out infinite',
            },
            transitionTimingFunction: {
                DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)',
            },
            transitionDuration: {
                DEFAULT: '150ms',
            },
        },
    },

    plugins: [forms],
};
