import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavHistory } from '../hooks/useNavHistory';
import { NavButton } from './NavButton';
export function NavigationButtons() {
    const { t } = useTranslation();
    const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();
    return (_jsxs("div", { className: "ml-2 flex items-center", children: [_jsx(NavButton, { ghost: true, onClick: goBack, disabled: !canGoBack, title: t('titleBar.navigateBack'), children: _jsx(ArrowLeft, { className: "h-[15px] w-[15px]", strokeWidth: 1.5 }) }), _jsx(NavButton, { ghost: true, onClick: goForward, disabled: !canGoForward, title: t('titleBar.navigateForward'), children: _jsx(ArrowRight, { className: "h-[15px] w-[15px]", strokeWidth: 1.5 }) })] }));
}
