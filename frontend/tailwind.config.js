export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f5f6f8',
        surface: '#ffffff',
        'surface-strong': '#eef0f3',
        primary: '#10b981',
        secondary: '#0891b2',
        accent: '#7c3aed',
        danger: '#dc2626',
        warn: '#d97706',
        muted: '#71717a',
      },
      boxShadow: {
        hud: '0 4px 18px -6px rgba(16, 185, 129, 0.35)',
        'hud-cyan': '0 4px 18px -6px rgba(8, 145, 178, 0.35)',
        glass: '0 1px 0 rgba(255,255,255,1) inset, 0 12px 28px -18px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'grid-mesh':
          'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
      },
      keyframes: {
        'hud-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'hud-blink': 'hud-blink 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
