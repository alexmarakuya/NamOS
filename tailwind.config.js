/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Darker mode Braun design palette - deeper warm grays and orange
        neutral: {
          50: '#0f0f0f',  // deep black (main background)
          100: '#1a1a1a', // very dark warm gray (component backgrounds)
          200: '#2a2a2a', // dark warm gray (borders)
          300: '#3d3d3d', // medium dark
          400: '#525252', // medium gray
          500: '#6b6b6b', // medium light
          600: '#9a9a9a', // light gray (secondary text)
          700: '#c4c4c4', // lighter
          800: '#e0e0e0', // very light
          900: '#f5f5f5', // off-white (primary text)
        },
        accent: {
          500: '#ff6b35', // Classic Braun orange
          600: '#e55a2b',
          700: '#cc4916',
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
