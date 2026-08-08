import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Extension } from '../../../../../../shared/extension_types';

interface DeleteProps {
	readonly extension: Extension;
	readonly disabled: boolean;
	readonly onDeleted: (extensionId: string) => void;
}

export default function Delete({
	extension,
	disabled,
	onDeleted,
}: DeleteProps): React.JSX.Element {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	return (
		<AlertDialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (deleting) return;
				setOpen(nextOpen);
				if (nextOpen) setErrorMessage('');
			}}
		>
			<AlertDialog.Trigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="mr-3 flex-none text-muted-foreground hover:text-destructive"
						aria-label={t('settings.extensions.deleteAction', { name: extension.title })}
						title={t('settings.extensions.deleteAction', { name: extension.title })}
						disabled={disabled}
					>
						<Trash2 className="size-3" />
					</Button>
				}
			/>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
				<AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
					<div className="flex flex-col gap-2">
						<AlertDialog.Title className="cn-font-heading text-base leading-none font-medium">
							{t('settings.extensions.deleteTitle')}
						</AlertDialog.Title>
						<AlertDialog.Description className="text-sm text-muted-foreground">
							{t('settings.extensions.deleteDescription', { name: extension.title })}
						</AlertDialog.Description>
						{errorMessage && (
							<p role="alert" className="text-sm text-destructive">
								{errorMessage}
							</p>
						)}
					</div>
					<div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
						<AlertDialog.Close
							render={
								<Button type="button" variant="outline" disabled={deleting}>
									{t('common.cancel')}
								</Button>
							}
						/>
						<Button
							type="button"
							variant="destructive"
							onClick={() => {
								setDeleting(true);
								setErrorMessage('');
								void window.extensions
									.delete(extension.id)
									.then(() => {
										onDeleted(extension.id);
										setOpen(false);
									})
									.catch((error: unknown) => {
										setErrorMessage(
											error instanceof Error && error.message.trim().length > 0
												? error.message
												: t('settings.extensions.deleteError')
										);
									})
									.finally(() => setDeleting(false));
							}}
							disabled={deleting}
						>
							{deleting ? t('settings.extensions.deleting') : t('common.delete')}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
