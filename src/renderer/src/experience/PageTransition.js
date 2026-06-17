import { jsx as _jsx } from "react/jsx-runtime";
import { motion, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { duration, ease, pageVariants } from './motion';
export function PageTransition({ children }) {
    const location = useLocation();
    const prefersReducedMotion = useReducedMotion();
    // Key on the top-level segment so sub-route changes (e.g. /settings/*) don't trigger a transition
    const topKey = location.pathname.split('/')[1] ?? 'root';
    if (prefersReducedMotion) {
        return _jsx("div", { className: "h-full", children: children });
    }
    return (_jsx(motion.div, { variants: pageVariants, initial: "initial", animate: "animate", transition: { duration: duration.normal, ease: ease.out }, className: "h-full", children: children }, topKey));
}
