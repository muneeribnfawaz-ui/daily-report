import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./models/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)"
        },
        primaryDark: "rgb(var(--color-primary-dark-rgb) / <alpha-value>)",
        sidebar: "rgb(var(--color-sidebar-rgb) / <alpha-value>)",
        sidebarText: "rgb(var(--color-sidebar-text-rgb) / <alpha-value>)",
        navbar: "rgb(var(--color-navbar-rgb) / <alpha-value>)",
        success: "rgb(var(--color-success-rgb) / <alpha-value>)",
        warning: "rgb(var(--color-warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--color-danger-rgb) / <alpha-value>)",
        textPrimary: "rgb(var(--color-text-primary-rgb) / <alpha-value>)",
        textSecondary: "rgb(var(--color-text-secondary-rgb) / <alpha-value>)",
        cardBorder: "rgb(var(--color-card-border-rgb) / <alpha-value>)",
        cardSurface: "rgb(var(--color-card-rgb) / <alpha-value>)",
        bgSurface: "rgb(var(--color-bg-rgb) / <alpha-value>)",
        borderSurface: "rgb(var(--color-border-rgb) / <alpha-value>)",
        sidebarSurface: "rgb(var(--color-sidebar-rgb) / <alpha-value>)",
        navbarSurface: "rgb(var(--color-navbar-rgb) / <alpha-value>)",
        sidebarForeground: "rgb(var(--color-sidebar-text-rgb) / <alpha-value>)",
        navbarForeground: "rgb(var(--color-text-primary-rgb) / <alpha-value>)",
        cardForeground: "rgb(var(--color-text-primary-rgb) / <alpha-value>)",
        mutedForeground: "rgb(var(--color-text-secondary-rgb) / <alpha-value>)",
        accentForeground: "rgb(var(--color-primary-dark-rgb) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)"
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)"
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)"
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)"
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)"
        }
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem"
      },
      boxShadow: {
        soft: "0 12px 32px rgb(15 23 42 / 0.08)"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, rgb(var(--color-primary-rgb) / 0.18), transparent 35%), radial-gradient(circle at top right, rgb(var(--color-primary-dark-rgb) / 0.12), transparent 30%), linear-gradient(180deg, rgb(var(--color-bg-rgb) / 0.18), rgb(var(--color-bg-rgb) / 0))"
      }
    }
  },
  plugins: []
};

export default config;
