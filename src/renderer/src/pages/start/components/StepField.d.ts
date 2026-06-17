import React from 'react';
type StepFieldProps = {
    readonly id: string;
    readonly label: string;
    readonly children: React.ReactNode;
    readonly className?: string;
};
export declare function StepField({ id, label, children, className }: StepFieldProps): React.JSX.Element;
export {};
