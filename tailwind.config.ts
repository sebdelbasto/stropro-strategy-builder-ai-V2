import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: { colors: { stroBlue: '#007bff' } }
  },
  plugins: []
} satisfies Config
