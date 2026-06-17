import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AlertCircle } from 'lucide-react';
import i18next from 'i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent, } from '@/components/ui/empty';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }
    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };
    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }
        if (this.props.fallback) {
            return this.props.fallback;
        }
        const { level = 'feature' } = this.props;
        const t = (key) => i18next.t(key);
        if (level === 'root') {
            return (_jsx("div", { className: "app-translucent-window flex h-screen w-full items-center justify-center", children: _jsxs(Empty, { children: [_jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { children: _jsx(AlertCircle, { className: "h-12 w-12 text-destructive" }) }), _jsx(EmptyTitle, { children: t('errorBoundary.rootTitle') }), _jsx(EmptyDescription, { children: t('errorBoundary.rootMessage') })] }), _jsxs(EmptyContent, { children: [_jsx("p", { className: "text-xs text-muted-foreground/60 font-mono break-all", children: this.state.error?.message }), _jsx("button", { type: "button", onClick: () => window.location.reload(), className: "px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors", children: t('errorBoundary.restartApp') })] })] }) }));
        }
        if (level === 'route') {
            return (_jsx("div", { className: "flex h-full w-full flex-1 items-center justify-center", children: _jsxs(Empty, { children: [_jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { children: _jsx(AlertCircle, { className: "h-10 w-10 text-destructive" }) }), _jsx(EmptyTitle, { children: t('errorBoundary.routeTitle') }), _jsx(EmptyDescription, { children: t('errorBoundary.routeMessage') })] }), _jsxs(EmptyContent, { children: [_jsx("p", { className: "text-xs text-muted-foreground/60 font-mono break-all", children: this.state.error?.message }), _jsxs("div", { className: "flex gap-2 justify-center", children: [_jsx("button", { type: "button", onClick: this.handleReset, className: "px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors", children: t('errorBoundary.tryAgainButton') }), _jsx("button", { type: "button", onClick: () => {
                                                window.location.hash = '#/home';
                                            }, className: "px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors", children: t('errorBoundary.goHome') })] })] })] }) }));
        }
        // feature level
        return (_jsxs(Empty, { className: "rounded-lg border border-destructive/30 bg-destructive/10 p-4", children: [_jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { children: _jsx(AlertCircle, { className: "h-4 w-4 text-destructive" }) }), _jsx(EmptyTitle, { className: "text-destructive", children: t('errorBoundary.featureTitle') })] }), _jsxs(EmptyContent, { children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono break-all", children: this.state.error?.message }), _jsx("button", { type: "button", onClick: this.handleReset, className: "text-xs text-primary hover:text-primary/80 transition-colors", children: t('errorBoundary.tryAgain') })] })] }));
    }
}
export function RouteErrorElement() {
    const error = useRouteError();
    const t = (key) => i18next.t(key);
    let title;
    let message;
    let detail;
    if (isRouteErrorResponse(error)) {
        title =
            error.status === 404
                ? t('errorBoundary.notFoundTitle')
                : t('errorBoundary.routeTitle');
        message =
            error.status === 404
                ? t('errorBoundary.notFoundMessage')
                : t('errorBoundary.routeMessage');
        detail = `${error.status} ${error.statusText}${typeof error.data === 'string' ? ` — ${error.data}` : ''}`;
    }
    else if (error instanceof Error) {
        title = t('errorBoundary.routeTitle');
        message = t('errorBoundary.routeMessage');
        detail = error.message;
    }
    else {
        title = t('errorBoundary.routeTitle');
        message = t('errorBoundary.routeMessage');
        detail = String(error);
    }
    return (_jsx("div", { className: "flex h-full w-full flex-1 items-center justify-center", children: _jsxs(Empty, { children: [_jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { children: _jsx(AlertCircle, { className: "h-10 w-10 text-destructive" }) }), _jsx(EmptyTitle, { children: title }), _jsx(EmptyDescription, { children: message })] }), _jsxs(EmptyContent, { children: [_jsx("p", { className: "text-xs text-muted-foreground/60 font-mono break-all", children: detail }), _jsx("button", { type: "button", onClick: () => {
                                window.location.hash = '#/home';
                            }, className: "px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors", children: t('errorBoundary.goHome') })] })] }) }));
}
