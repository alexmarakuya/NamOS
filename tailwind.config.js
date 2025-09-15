/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',  // Ultra-wide screens
        '4xl': '2560px',  // 4K and ultra-wide monitors
      },
      colors: {
        // Dark theme neutral palette - force dark colors
        neutral: {
          50: '#171717',  // dark background (was light)
          100: '#262626', // dark component bg (was light)
          200: '#404040', // dark borders (was light)
          300: '#525252', // medium dark text
          400: '#6b6b6b', // medium gray text
          500: '#9a9a9a', // medium light text
          600: '#c4c4c4', // light text
          700: '#404040', // dark borders/dividers
          800: '#262626', // dark card backgrounds
          900: '#171717', // darkest background
        },
        accent: {
          500: '#92B590', // Medium sage green
          600: '#7a9a78',
          700: '#6b8669',
        },
        braun: {
          orange: '#ff6b35',
          'warm-white': '#f5f5f5',
          'warm-black': '#0a0a0a',
        }
      },
      fontFamily: {
        'sans': ['Akzidenz-Grotesk', 'Helvetica', 'Arial', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      letterSpacing: {
        'tighter': '-0.05em',
        'tight': '-0.025em',
      },
    },
  },
  plugins: [],
}
