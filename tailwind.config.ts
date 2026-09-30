import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        houseye: {
          primary: '#1e40af',
          secondary: '#0ea5e9',
          accent: '#f59e0b',
          danger: '#ef4444',
          success: '#22c55e',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
