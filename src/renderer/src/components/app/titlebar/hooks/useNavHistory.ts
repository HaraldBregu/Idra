import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useNavHistory() {
	const navigate = useNavigate();
	const location = useLocation();

	const [navState, setNavState] = useState<{ stack: string[]; index: number }>(() => ({
		stack: [location.pathname],
		index: 0,
	}));
	const isProgNav = useRef(false);

	useEffect(() => {
		if (isProgNav.current) {
			isProgNav.current = false;
			return;
		}
		setNavState(prev => {
			if (prev.stack[prev.index] === location.pathname) return prev;
			const newStack = [...prev.stack.slice(0, prev.index + 1), location.pathname];
			return { stack: newStack, index: newStack.length - 1 };
		});
	}, [location.pathname]);

	const canGoBack = navState.index > 0;
	const canGoForward = navState.index < navState.stack.length - 1;

	const goBack = () => {
		if (!canGoBack) return;
		isProgNav.current = true;
		const newIndex = navState.index - 1;
		setNavState(prev => ({ ...prev, index: newIndex }));
		navigate(navState.stack[newIndex]);
	};

	const goForward = () => {
		if (!canGoForward) return;
		isProgNav.current = true;
		const newIndex = navState.index + 1;
		setNavState(prev => ({ ...prev, index: newIndex }));
		navigate(navState.stack[newIndex]);
	};

	return { canGoBack, canGoForward, goBack, goForward };
}
