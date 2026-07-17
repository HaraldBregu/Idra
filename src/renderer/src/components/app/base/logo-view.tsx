import React from 'react';
import sphere from '@resources/icons/icon.png';

export function LogoView(): React.JSX.Element {
	return <img src={sphere} alt="App logo" className="size-32 rounded-3xl object-contain" />;
}
