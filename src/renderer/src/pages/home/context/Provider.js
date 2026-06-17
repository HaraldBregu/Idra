import { jsx as _jsx } from "react/jsx-runtime";
import { useReducer } from 'react';
import { agentChatReducer } from './reducer';
import { initialAgentChatState } from './state';
import { HomeAgentContext } from './context';
export function Provider({ children, }) {
    const [chatState, dispatchChat] = useReducer(agentChatReducer, initialAgentChatState);
    return (_jsx(HomeAgentContext.Provider, { value: { chatState, dispatchChat }, children: children }));
}
