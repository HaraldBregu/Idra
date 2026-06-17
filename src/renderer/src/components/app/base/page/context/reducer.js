export function pageReducer(state, action) {
    switch (action.type) {
        case 'SIDEBAR_SHOWN':
            return { ...state, isSidebarVisible: true };
        case 'SIDEBAR_HIDDEN':
            return { ...state, isSidebarVisible: false };
        case 'SIDEBAR_TOGGLED':
            return { ...state, isSidebarVisible: !state.isSidebarVisible };
        case 'SIDEBAR_SIDE_SET':
            return { ...state, sidebarSide: action.side };
        case 'HEADER_SHOWN':
            return { ...state, isHeaderVisible: true };
        case 'HEADER_HIDDEN':
            return { ...state, isHeaderVisible: false };
        case 'HEADER_TOGGLED':
            return { ...state, isHeaderVisible: !state.isHeaderVisible };
        case 'SIDEBAR_OPEN_SET':
            return { ...state, sidebarOpen: action.open };
        case 'SIDEBAR_OPEN_TOGGLED':
            return { ...state, sidebarOpen: !state.sidebarOpen };
        case 'SIDEBAR_OPEN_MOBILE_SET':
            return { ...state, sidebarOpenMobile: action.open };
        case 'SIDEBAR_OPEN_MOBILE_TOGGLED':
            return { ...state, sidebarOpenMobile: !state.sidebarOpenMobile };
        default: {
            const _exhaustive = action;
            return _exhaustive;
        }
    }
}
