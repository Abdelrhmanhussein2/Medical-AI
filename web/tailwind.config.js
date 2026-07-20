/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-container-low": "#f0f3ff",
        "border-subtle": "#E8F2F4",
        "status-danger": "#F04438",
        "on-primary": "#ffffff",
        "bg-card": "#FFFFFF",
        "tertiary-fixed-dim": "#51df8e",
        "tertiary-container": "#24bf71",
        "status-warning": "#F79009",
        "primary-light": "#EAFBFD",
        "surface-dim": "#d0daf2",
        "on-error": "#ffffff",
        "inverse-primary": "#14A8B9",
        "inverse-surface": "#F4FBFB", // Swapped from dark #273143 to a beautiful soft light teal background
        "primary-hover": "#14A8B9",
        "secondary": "#4d6074",
        "on-secondary-fixed-variant": "#35495b",
        "on-tertiary-fixed-variant": "#00522c",
        "surface-container-high": "#dfe8ff",
        "tertiary-fixed": "#70fda7",
        "on-primary-fixed-variant": "#004f57",
        "surface-container": "#e8eeff",
        "on-background": "#111c2d",
        "error-container": "#ffdad6",
        "secondary-fixed-dim": "#b4c9e0",
        "on-surface-variant": "#3c494b",
        "on-tertiary-fixed": "#00210e",
        "on-primary-container": "#00444b",
        "on-tertiary-container": "#004725",
        "outline-variant": "#bbc9cb",
        "on-secondary-fixed": "#071d2e",
        "surface-container-lowest": "#ffffff",
        "error": "#ba1a1a",
        "primary-fixed": "#92f1ff",
        "secondary-container": "#cde2f9",
        "surface-bright": "#f9f9ff",
        "on-secondary-container": "#516578",
        "on-surface": "#111c2d",
        "surface-container-highest": "#d9e3fb",
        "primary-container": "#19b8c9",
        "primary": "#006973",
        "outline": "#6c797c",
        "inverse-on-surface": "#111c2d", // Swapped to dark text for the light surface
        "primary-fixed-dim": "#4fd8e9",
        "bg-canvas": "#F7FBFC",
        "on-tertiary": "#ffffff",
        "on-error-container": "#93000a",
        "surface-variant": "#d9e3fb",
        "on-secondary": "#ffffff",
        "surface": "#f9f9ff",
        "secondary-fixed": "#d0e5fc",
        "on-primary-fixed": "#001f23",
        "tertiary": "#006d3c",
        "surface-tint": "#006973",
        "background": "#f9f9ff"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "stack-sm": "8px",
        "margin-desktop": "48px",
        "stack-lg": "32px",
        "container-max": "1440px",
        "baseline": "4px",
        "stack-md": "16px",
        "gutter": "24px"
      },
      fontFamily: {
        "body-md": ["Inter", "sans-serif"],
        "label-caps": ["JetBrains Mono", "monospace"],
        "body-sm": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "display-lg": ["Outfit", "sans-serif"],
        "headline-lg": ["Outfit", "sans-serif"],
        "button": ["Inter", "sans-serif"],
        "headline-md": ["Outfit", "sans-serif"]
      },
      boxShadow: {
        'ambient': '0px 12px 32px rgba(33, 53, 71, 0.04)', // Softened shadow
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
