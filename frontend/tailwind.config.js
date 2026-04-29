export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#05070a',
        surface: '#0c1015',
        'surface-strong': '#11161d',
        primary: '#00ff96',
        secondary: '#00f1fd',
        accent: '#7c5cff',
        danger: '#ff5d6c',
        warn: '#ffb547',
        muted: '#7d8a98',
      },
      boxShadow: {
        hud: '0 0 22px rgba(0, 255, 150, 0.22)',
        'hud-cyan': '0 0 22px rgba(0, 241, 253, 0.22)',
        glass: '0 30px 60px -40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'grid-mesh':
          'linear-gradient(rgba(0,255,150,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,150,0.06) 1px, transparent 1px)',
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
