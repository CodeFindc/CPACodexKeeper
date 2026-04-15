export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#131313',
        surface: '#1c1b1b',
        'surface-strong': '#2a2a2a',
        primary: '#00ff41',
        secondary: '#00f1fd',
        danger: '#ff6b6b',
        muted: '#9bb39b',
      },
      boxShadow: {
        hud: '0 0 18px rgba(0, 255, 65, 0.22)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
