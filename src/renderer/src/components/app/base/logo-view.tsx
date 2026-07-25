import React from 'react';
import sphere from '@resources/icons/icon.png';

export function LogoView({
	className = 'size-20 rounded-2xl',
}: {
	readonly className?: string;
}): React.JSX.Element {
	return <img src={sphere} alt="App logo" className={`object-contain ${className}`} />;
}
