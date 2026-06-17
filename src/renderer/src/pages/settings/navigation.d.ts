import { type LucideIcon } from 'lucide-react';
import { type AgentId } from '@/lib/compat';
export interface SettingsNavigationItem {
    readonly path: string;
    readonly labelKey: string;
    readonly descriptionKey: string;
    readonly icon: LucideIcon;
}
export interface SettingsDetailItem {
    readonly path: string;
    readonly labelKey: string;
    readonly descriptionKey?: string;
    readonly keywords?: string;
    readonly icon?: LucideIcon;
}
export interface SettingsModelServiceItem {
    readonly id: AgentId;
    readonly path: string;
    readonly labelKey: string;
    readonly descriptionKey: string;
    readonly keywords: string;
    readonly icon: LucideIcon;
    readonly comingSoon?: boolean;
}
export declare const SETTINGS_MODEL_SERVICE_ITEMS: readonly SettingsModelServiceItem[];
export declare const SETTINGS_DETAIL_ITEMS: readonly SettingsDetailItem[];
export declare const SETTINGS_NAVIGATION: {
    path: string;
    labelKey: string;
    descriptionKey: string;
    icon: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
}[];
