import { type ReactElement } from 'react';
export declare function SubmitButton({ isLoading, canSubmit, disabled, onAction, }: {
    readonly isLoading: boolean;
    readonly canSubmit: boolean;
    readonly disabled?: boolean;
    readonly onAction: () => void;
}): ReactElement | null;
