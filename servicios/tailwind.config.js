/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ============================================
      // SISTEMA DE COLORES
      // ============================================
      colors: {
        // Colores de Marca (Brand)
        primary: {
          DEFAULT: '#6b9fd4',
          50: '#e8f1f9',
          100: '#d1e4f3',
          200: '#a3c9e7',
          300: '#8bb4dd',
          400: '#7daad8',
          500: '#6b9fd4',
          600: '#5a8ec3',
          700: '#4a7db2',
          800: '#3b6ea0',
          900: '#2e5580',
        },
        secondary: {
          DEFAULT: '#5B9BD5',
          50: '#e8f2fa',
          100: '#d1e5f5',
          200: '#a4cbeb',
          300: '#8bb9e2',
          400: '#73a7dc',
          500: '#5B9BD5',
          600: '#4a8cc2',
          700: '#3a7cb0',
          800: '#2c6d9e',
          900: '#205982',
        },
        success: {
          DEFAULT: '#16a34a',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        error: {
          DEFAULT: '#dc2626',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        info: {
          DEFAULT: '#2563eb',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        text: {
          primary: '#1f2937',
          secondary: '#4b5563',
          light: '#6b7280',
          inverse: '#ffffff',
          muted: '#9ca3af',
        },
        background: {
          DEFAULT: '#F5F6F8',
          light: '#f3f4f6',
          card: '#FFFFFF',
          elevated: '#ffffff',
          muted: '#f9fafb',
        },
        border: {
          DEFAULT: '#e5e7eb',
          light: '#f3f4f6',
          dark: '#d1d5db',
          focus: '#6b9fd4',
        },
        header: {
          DEFAULT: '#6b9fd4',
          hover: '#5a8ec3',
        },
        sidenav: {
          DEFAULT: '#f0f0f0',
          hover: '#ddd',
        },
        logout: {
          DEFAULT: '#ff4d4d',
          hover: '#ff3333',
        },
        table: {
          header: '#6b9fd4',
          odd: '#f2f2f2',
          even: '#ffffff',
          border: '#ddd',
        },
        // Glassmorphism gradient colors
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          light: 'rgba(255, 255, 255, 0.15)',
          dark: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.18)',
        },
        gradient: {
          blue: '#6366f1',
          purple: '#a855f7',
          pink: '#ec4899',
          cyan: '#06b6d4',
        },
        // Shadcn UI Compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      // ============================================
      // TIPOGRAFÍA
      // ============================================
      fontFamily: {
        sans: [
          'Roboto',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'system-ui',
          'sans-serif'
        ],
        display: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'sm': ['14px', { lineHeight: '20px', letterSpacing: '0.01em' }],
        'base': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
        'lg': ['18px', { lineHeight: '28px', letterSpacing: '0' }],
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        '5xl': ['48px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'header-title': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'card-title': ['1.1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'button': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'input': ['14px', { lineHeight: '1.5' }],
      },

      // ============================================
      // ESPACIADO
      // ============================================
      spacing: {
        'header': '70px',
        'sidenav-collapsed': '60px',
        'sidenav-expanded': '250px',
      },

      // ============================================
      // BORDES Y RADIOS
      // ============================================
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'button': '4px',
        'card': '10px',
        'input': '4px',
        'modal': '8px',
      },

      // ============================================
      // SOMBRAS
      // ============================================
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 6px 12px rgba(0, 0, 0, 0.3)',
        'header': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        // Glassmorphism shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-hover': '0 12px 48px 0 rgba(31, 38, 135, 0.25)',
        'glass-inner': 'inset 0 1px 1px rgba(255, 255, 255, 0.5)',
        // Category-specific glows
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)',
        'glow-yellow': '0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)',
        'glow-gray': '0 0 20px rgba(156, 163, 175, 0.3), 0 0 40px rgba(156, 163, 175, 0.15)',
      },

      // ============================================
      // ANIMACIONES
      // ============================================
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(107, 159, 212, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(107, 159, 212, 0.6)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.5s ease-out",
        "accordion-up": "accordion-up 0.5s ease-out",
        "pulse-slow": "pulse-slow 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
      },

      // ============================================
      // Z-INDEX
      // ============================================
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
        'sidenav': '1000',
        'notification': '1100',
      },

      // ============================================
      // MAX WIDTH
      // ============================================
      maxWidth: {
        'form': '300px',
        'content': '600px',
        'dashboard': '1400px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
