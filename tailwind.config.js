/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            fontFamily: {
                fredoka: ['Fredoka', 'sans-serif'],
            },
            colors: {
                'toon-yellow': '#fefce8',
            },
        },
    },
    plugins: [],
}
