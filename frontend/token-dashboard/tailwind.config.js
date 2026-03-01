/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === OAEAS Design Tokens (DESIGN_SPEC_V2.md §13.1) ===
        void:    '#050810',    // 主背景：深空黑
        surface: '#0d1117',    // 卡片背景
        elevated:'#161b22',    // 悬浮层
        border:  '#1e293b',    // 边框
        'tech-blue':    '#2563eb',  // 主色调：科技蓝
        'cyber-purple': '#7c3aed',  // 副色：赛博紫
        'neon-green':   '#00ff88',  // 强调：Master 等级
        'oaeas-gold':   '#f59e0b',  // 金色：Master 徽章
        'text-primary': '#f8fafc',  // 主文字
        'text-muted':   '#94a3b8',  // 次要文字
        // Level colors
        'level-master':    '#f59e0b',
        'level-expert':    '#7c3aed',
        'level-proficient':'#2563eb',
        'level-novice':    '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      spacing: {
        'xs':  '4px',
        'sm':  '8px',
        'md':  '16px',
        'lg':  '24px',
        'xl':  '48px',
        '2xl': '96px',
      },
      animation: {
        'fade-in':   'fadeIn 0.5s ease forwards',
        'slide-up':  'slideUp 0.4s ease forwards',
        'pulse-slow':'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow':      'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from:{ opacity:0 }, to:{ opacity:1 } },
        slideUp: { from:{ opacity:0, transform:'translateY(20px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        glow:    { from:{ boxShadow:'0 0 10px rgba(37,99,235,0.3)' }, to:{ boxShadow:'0 0 25px rgba(37,99,235,0.6)' } },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e293b' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
