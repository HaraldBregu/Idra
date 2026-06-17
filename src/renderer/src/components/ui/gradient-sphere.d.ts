export type GradientSphereState = "active" | "stopped";
type GradientSphereProps = {
    size?: number;
    className?: string;
    mode?: "webgl" | "css";
    state?: GradientSphereState;
};
export declare function GradientSphere({ size, className, mode, state, }: GradientSphereProps): import("react/jsx-runtime").JSX.Element;
export {};
