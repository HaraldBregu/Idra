import React from 'react';
import sphere from '@resources/svgs/logo.svg';

export function LogoView(): React.JSX.Element {
	return <img src={sphere} alt="App logo" className="size-32 object-contain" />;
}
