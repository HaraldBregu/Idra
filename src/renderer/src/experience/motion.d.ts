export declare const duration: {
    readonly instant: 0.05;
    readonly fast: 0.12;
    readonly normal: 0.18;
    readonly slow: 0.3;
};
export declare const ease: {
    readonly out: [number, number, number, number];
    readonly in: [number, number, number, number];
    readonly inOut: [number, number, number, number];
};
export declare const pageVariants: {
    readonly initial: {
        readonly opacity: 0;
        readonly y: 5;
    };
    readonly animate: {
        readonly opacity: 1;
        readonly y: 0;
    };
    readonly exit: {
        readonly opacity: 0;
        readonly y: -3;
    };
};
export declare const messageVariants: {
    readonly initial: {
        readonly opacity: 0;
        readonly y: 8;
    };
    readonly animate: {
        readonly opacity: 1;
        readonly y: 0;
    };
};
export declare const fadeVariants: {
    readonly initial: {
        readonly opacity: 0;
    };
    readonly animate: {
        readonly opacity: 1;
    };
    readonly exit: {
        readonly opacity: 0;
    };
};
