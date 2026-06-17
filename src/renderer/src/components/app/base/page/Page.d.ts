import React, { type ReactNode } from 'react';
import type { PageState } from './context/state';
interface PageContainerProps {
    readonly children: ReactNode;
    readonly className?: string;
    readonly initialState?: Partial<PageState>;
}
export declare const PageContainer: React.NamedExoticComponent<PageContainerProps>;
interface PageHeaderProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare const PageHeader: React.NamedExoticComponent<PageHeaderProps>;
interface PageHeaderTitleProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare const PageHeaderTitle: React.NamedExoticComponent<PageHeaderTitleProps>;
interface PageHeaderDescriptionProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare const PageHeaderDescription: React.NamedExoticComponent<PageHeaderDescriptionProps>;
interface PageBodyProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare const PageBody: React.NamedExoticComponent<PageBodyProps>;
interface PageSidebarProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare const PageSidebar: React.NamedExoticComponent<PageSidebarProps>;
interface PageSidebarInsetProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare const PageSidebarInset: React.NamedExoticComponent<PageSidebarInsetProps>;
export {};
