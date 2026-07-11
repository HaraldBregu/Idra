import React from 'react';

const ORBIT_STYLE: React.CSSProperties = {
	background:
		'radial-gradient(ellipse at center, #180a35 0%, #180a35 65%, #ffbd74 67%, #ff9a63 72%, #4c176a 74%, #ff6a55 78%, #ed3b66 83%, #8b1d7b 86%, #cc2477 90%, #ff9a63 95%, #4c176a 100%)',
	mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
	maskComposite: 'exclude',
	WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
	WebkitMaskComposite: 'xor',
};

const ORBITS = [
	{ width: 350, height: 92, padding: 18, opacity: 1 },
	{ width: 430, height: 120, padding: 9, opacity: 0.45 },
] as const;

export function LogoView(): React.JSX.Element {
	return (
		<div
			className="relative flex size-[260px] items-center justify-center"
			role="img"
			aria-label="Magenta and orange planet with glowing horizontal rings"
		>
			{ORBITS.map((orbit) => (
				<React.Fragment key={orbit.width}>
					<div
						className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] drop-shadow-[0_0_8px_rgba(244,63,94,0.65)]"
						style={{ ...ORBIT_STYLE, ...orbit }}
					/>
					<div
						className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-[50%] drop-shadow-[0_0_8px_rgba(251,113,133,0.6)] [clip-path:inset(50%_0_0_0)]"
						style={{ ...ORBIT_STYLE, ...orbit }}
					/>
				</React.Fragment>
			))}
			<div className="relative z-10 size-[210px] rounded-full bg-[radial-gradient(circle_at_68%_32%,#ffbd74_0%,#ff9a63_14%,#ff6a55_30%,#ed3b66_45%,#cc2477_58%,#8b1d7b_72%,#4c176a_86%,#180a35_100%)] shadow-[inset_-20px_-24px_35px_rgba(14,4,38,0.48),0_0_28px_rgba(225,39,116,0.28)]" />
		</div>
	);
}
