import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
interface SettingsPageShellProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare function SettingsPageShell({ children, className, }: SettingsPageShellProps): React.JSX.Element;
interface SettingsPageHeaderProps {
    readonly title: ReactNode;
    readonly description?: ReactNode;
    readonly icon?: LucideIcon;
    readonly iconNode?: ReactNode;
    readonly action?: ReactNode;
}
export declare function SettingsPageHeader({ title, description, icon: Icon, iconNode, action, }: SettingsPageHeaderProps): React.JSX.Element;
interface SettingsSectionProps {
    readonly title: ReactNode;
    readonly description?: ReactNode;
    readonly action?: ReactNode;
    readonly children: ReactNode;
    readonly className?: string;
    readonly hideTitle?: boolean;
}
export declare function SettingsSection({ title, description, action, children, className, hideTitle, }: SettingsSectionProps): React.JSX.Element;
interface SettingsPanelProps {
    readonly children: ReactNode;
    readonly className?: string;
}
export declare function SettingsPanel({ children, className }: SettingsPanelProps): React.JSX.Element;
interface SettingsRowProps {
    readonly title: ReactNode;
    readonly description?: ReactNode;
    readonly icon?: LucideIcon;
    readonly media?: ReactNode;
    readonly actions?: ReactNode;
    readonly children?: ReactNode;
    readonly className?: string;
    readonly contentClassName?: string;
    readonly actionClassName?: string;
}
export declare function SettingsRow({ title, description, icon: Icon, media, actions, children, className, contentClassName, actionClassName, }: SettingsRowProps): React.JSX.Element;
interface SettingsValueProps {
    readonly children: ReactNode;
    readonly mono?: boolean;
    readonly className?: string;
}
export declare function SettingsValue({ children, mono, className, }: SettingsValueProps): React.JSX.Element;
interface SettingsNoticeProps {
    readonly children: ReactNode;
    readonly icon?: LucideIcon;
    readonly variant?: 'default' | 'destructive';
    readonly className?: string;
}
export declare function SettingsNotice({ children, icon: Icon, variant, className, }: SettingsNoticeProps): React.JSX.Element;
interface SettingsEmptyStateProps {
    readonly icon?: LucideIcon;
    readonly title: ReactNode;
    readonly description?: ReactNode;
    readonly children?: ReactNode;
    readonly className?: string;
}
export declare function SettingsEmptyState({ icon: Icon, title, description, children, className, }: SettingsEmptyStateProps): React.JSX.Element;
interface SettingsLoadingRowsProps {
    readonly rows?: number;
    readonly className?: string;
}
export declare function SettingsLoadingRows({ rows, className, }: SettingsLoadingRowsProps): React.JSX.Element;
export declare function SettingsPageSkeleton(): React.JSX.Element;
interface SettingsFieldProps {
    readonly id: string;
    readonly label: ReactNode;
    readonly description?: ReactNode;
    readonly children: ReactNode;
    readonly className?: string;
}
export declare function SettingsField({ id, label, description, children, className, }: SettingsFieldProps): React.JSX.Element;
export {};
