export const duration = {
	instant: 0.05,
	fast: 0.12,
	normal: 0.18,
	slow: 0.3,
} as const;

// cubic-bezier easing arrays for motion
export const ease = {
	out: [0, 0, 0.2, 1] as [number, number, number, number],
	in: [0.4, 0, 1, 1] as [number, number, number, number],
	inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

export const pageVariants = {
	initial: { opacity: 0, y: 5 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -3 },
} as const;

export const messageVariants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
} as const;

export const fadeVariants = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
} as const;
