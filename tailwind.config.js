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
                    500: '#E52521',
                    700: '#B81C19',
                    900: '#7A1210',
                },
                gold: {
                    50: '#FBF6E6',
                    300: '#E3C76A',
                    500: '#D4AF37',
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
