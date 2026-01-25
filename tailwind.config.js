/** @type {import('tailwindcss').Config} */
const tailwindcssAnimate = require("tailwindcss-animate")

module.exports = {
    darkMode: ["class"],
    content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx,html}"
  ],
  theme: {
  	extend: {
  		screens: {
  			xs: '320px',
  			sm: '640px',
  			md: '768px',
  			lg: '1024px',
  			xl: '1280px'
  		},
		colors: {
			background: 'var(--background)',
			foreground: 'var(--foreground)',
			card: {
				DEFAULT: 'var(--card)',
				foreground: 'var(--card-foreground)'
			},
			popover: {
				DEFAULT: 'var(--popover)',
				foreground: 'var(--popover-foreground)'
			},
			primary: {
				DEFAULT: 'var(--primary)',
				foreground: 'var(--primary-foreground)'
			},
			secondary: {
				DEFAULT: 'var(--secondary)',
				foreground: 'var(--secondary-foreground)'
			},
			muted: {
				DEFAULT: 'var(--muted)',
				foreground: 'var(--muted-foreground)'
			},
			accent: {
				DEFAULT: 'var(--accent)',
				foreground: 'var(--accent-foreground)'
			},
			destructive: {
				DEFAULT: 'var(--destructive)',
				foreground: 'var(--destructive-foreground)'
			},
			border: 'var(--border)',
			input: 'var(--input)',
			ring: 'var(--ring)',
			base: {
  				'50': 'var(--color-base-50)',
  				'100': 'var(--color-base-100)',
  				'200': 'var(--color-base-200)',
  				'300': 'var(--color-base-300)',
  				'400': 'var(--color-base-400)',
  				'500': 'var(--color-base-500)',
  				'600': 'var(--color-base-600)',
  				'700': 'var(--color-base-700)',
  				'800': 'var(--color-base-800)',
  				'900': 'var(--color-base-900)',
  				'950': 'var(--color-base-950)'
  			},
  			accent: {
  				'50': 'var(--color-accent-50)',
  				'100': 'var(--color-accent-100)',
  				'200': 'var(--color-accent-200)',
  				'300': 'var(--color-accent-300)',
  				'400': 'var(--color-accent-400)',
  				'500': 'var(--color-accent-500)',
  				'600': 'var(--color-accent-600)',
  				'700': 'var(--color-accent-700)',
  				'800': 'var(--color-accent-800)',
  				'900': 'var(--color-accent-900)',
  				'950': 'var(--color-accent-950)'
  			},
  			text: {
  				primary: 'var(--color-text-primary)',
  				secondary: 'var(--color-text-secondary)',
  				tertiary: 'var(--color-text-tertiary)',
  				inverse: 'var(--color-text-inverse)',
  				disabled: 'var(--color-text-disabled)'
  			},
  			bg: {
  				primary: 'var(--color-bg-primary)',
  				secondary: 'var(--color-bg-secondary)',
  				tertiary: 'var(--color-bg-tertiary)',
  				inverse: 'var(--color-bg-inverse)',
  				disabled: 'var(--color-bg-disabled)'
  			},
  			border: {
  				primary: 'var(--color-border-primary)',
  				secondary: 'var(--color-border-secondary)',
  				focus: 'var(--color-border-focus)',
  				error: 'var(--color-border-error)',
  				success: 'var(--color-border-success)',
  				warning: 'var(--color-border-warning)'
  			},
  			success: {
  				'50': 'var(--color-success-50)',
  				'100': 'var(--color-success-100)',
  				'500': 'var(--color-success-500)',
  				'600': 'var(--color-success-600)',
  				'700': 'var(--color-success-700)'
  			},
  			error: {
  				'50': 'var(--color-error-50)',
  				'100': 'var(--color-error-100)',
  				'500': 'var(--color-error-500)',
  				'600': 'var(--color-error-600)',
  				'700': 'var(--color-error-700)'
  			},
  			warning: {
  				'50': 'var(--color-warning-50)',
  				'100': 'var(--color-warning-100)',
  				'500': 'var(--color-warning-500)',
  				'600': 'var(--color-warning-600)',
  				'700': 'var(--color-warning-700)'
  			},
  			info: {
  				'50': 'var(--color-info-50)',
  				'100': 'var(--color-info-100)',
  				'500': 'var(--color-info-500)',
  				'600': 'var(--color-info-600)',
  				'700': 'var(--color-info-700)'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		spacing: {
  			'0': 'var(--space-0)',
  			'1': 'var(--space-1)',
  			'2': 'var(--space-2)',
  			'3': 'var(--space-3)',
  			'4': 'var(--space-4)',
  			'5': 'var(--space-5)',
  			'6': 'var(--space-6)',
  			'8': 'var(--space-8)',
  			'10': 'var(--space-10)',
  			'12': 'var(--space-12)',
  			'16': 'var(--space-16)',
  			'20': 'var(--space-20)',
  			'24': 'var(--space-24)'
  		},
  		fontSize: {
  			xs: 'var(--font-size-xs)',
  			sm: 'var(--font-size-sm)',
  			base: 'var(--font-size-base)',
  			lg: 'var(--font-size-lg)',
  			xl: 'var(--font-size-xl)',
  			'2xl': 'var(--font-size-2xl)',
  			'3xl': 'var(--font-size-3xl)',
  			'4xl': 'var(--font-size-4xl)',
  			'5xl': 'var(--font-size-5xl)'
  		},
  		fontWeight: {
  			normal: 'var(--font-weight-normal)',
  			medium: 'var(--font-weight-medium)',
  			semibold: 'var(--font-weight-semibold)',
  			bold: 'var(--font-weight-bold)'
  		},
  		lineHeight: {
  			tight: 'var(--line-height-tight)',
  			normal: 'var(--line-height-normal)',
  			relaxed: 'var(--line-height-relaxed)'
  		},
  		borderRadius: {
  			none: 'var(--radius-none)',
  			sm: 'var(--radius-sm)',
  			base: 'var(--radius-base)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			xl: 'var(--radius-xl)',
  			'2xl': 'var(--radius-2xl)',
  			full: 'var(--radius-full)'
  		},
  		zIndex: {
  			'0': 'var(--z-0)',
  			'10': 'var(--z-10)',
  			'20': 'var(--z-20)',
  			'30': 'var(--z-30)',
  			'40': 'var(--z-40)',
  			'50': 'var(--z-50)',
  			auto: 'var(--z-auto)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
}
