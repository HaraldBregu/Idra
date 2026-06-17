import type { SidebarSide } from './state';
export type PageAction = {
    type: 'SIDEBAR_SHOWN';
} | {
    type: 'SIDEBAR_HIDDEN';
} | {
    type: 'SIDEBAR_TOGGLED';
} | {
    type: 'SIDEBAR_SIDE_SET';
    side: SidebarSide;
} | {
    type: 'HEADER_SHOWN';
} | {
    type: 'HEADER_HIDDEN';
} | {
    type: 'HEADER_TOGGLED';
} | {
    type: 'SIDEBAR_OPEN_SET';
    open: boolean;
} | {
    type: 'SIDEBAR_OPEN_TOGGLED';
} | {
    type: 'SIDEBAR_OPEN_MOBILE_SET';
    open: boolean;
} | {
    type: 'SIDEBAR_OPEN_MOBILE_TOGGLED';
};
