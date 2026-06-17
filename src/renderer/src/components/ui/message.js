import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "./tooltip";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
const Message = ({ children, className, ...props }) => (_jsx("div", { className: cn("flex min-w-0 gap-3", className), ...props, children: children }));
const MessageAvatar = ({ src, alt, fallback, delayMs, className, }) => {
    return (_jsxs(Avatar, { className: cn("h-8 w-8 shrink-0", className), children: [_jsx(AvatarImage, { src: src, alt: alt }), fallback && (_jsx(AvatarFallback, { delayMs: delayMs, children: fallback }))] }));
};
const MessageContent = ({ children, markdown = false, className, ...props }) => {
    const classNames = cn("rounded-lg p-2 text-foreground bg-secondary prose max-w-none break-words whitespace-normal", className);
    return markdown ? (_jsx(Markdown, { className: classNames, ...props, children: children })) : (_jsx("div", { className: classNames, ...props, children: children }));
};
const MessageActions = ({ children, className, ...props }) => (_jsx("div", { className: cn("text-muted-foreground flex items-center gap-2", className), ...props, children: children }));
const MessageAction = ({ tooltip, children, className, side = "top", ...props }) => {
    return (_jsx(TooltipProvider, { children: _jsxs(Tooltip, { ...props, children: [_jsx(TooltipTrigger, { render: children }), _jsx(TooltipContent, { side: side, className: className, children: tooltip })] }) }));
};
export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction };
