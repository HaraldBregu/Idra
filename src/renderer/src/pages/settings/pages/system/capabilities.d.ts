import { type LucideIcon } from 'lucide-react';
export type SystemCapabilityAvailability = 'yes' | 'oftenYes' | 'sometimes' | 'comingSoon';
export interface SystemCapabilityItem {
    readonly id: string;
    readonly titleKey: string;
    readonly noteKey: string;
    readonly availability: SystemCapabilityAvailability;
    readonly icon: LucideIcon;
}
export interface SystemCapabilityGroup {
    readonly id: string;
    readonly titleKey: string;
    readonly descriptionKey: string;
    readonly capabilities: readonly SystemCapabilityItem[];
}
export declare const SYSTEM_CAPABILITY_GROUPS: ({
    id: string;
    titleKey: string;
    descriptionKey: string;
    capabilities: ({
        id: string;
        titleKey: string;
        noteKey: string;
        availability: "yes";
        icon: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    } | {
        id: string;
        titleKey: string;
        noteKey: string;
        availability: "sometimes";
        icon: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    })[];
} | {
    id: string;
    titleKey: string;
    descriptionKey: string;
    capabilities: ({
        id: string;
        titleKey: string;
        noteKey: string;
        availability: "yes";
        icon: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    } | {
        id: string;
        titleKey: string;
        noteKey: string;
        availability: "oftenYes";
        icon: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    })[];
} | {
    id: string;
    titleKey: string;
    descriptionKey: string;
    capabilities: {
        id: string;
        titleKey: string;
        noteKey: string;
        availability: "comingSoon";
        icon: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    }[];
})[];
