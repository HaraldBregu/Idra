import React, { type ReactNode } from 'react';
interface FieldProps {
    readonly children: ReactNode;
    readonly orientation?: 'horizontal' | 'vertical';
    readonly className?: string;
}
declare function Field({ children, orientation, className }: FieldProps): React.JSX.Element;
export { Field };
