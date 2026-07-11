import React from 'react';
import icon from '@resources/icons/icon.png';

export function LogoView(): React.JSX.Element {
	return <img src={icon} alt="App logo" className="size-[260px] object-contain" />;
}
