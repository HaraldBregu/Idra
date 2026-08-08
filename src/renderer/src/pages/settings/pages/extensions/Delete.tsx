import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { Extension } from '../../../../../../shared/extension_types';

interface DeleteProps {
	readonly extension: Extension | null;
	readonly deleting: boolean;
	readonly onCancel: () => void;
	readonly onConfirm: () => Promise<void>;
}

export default function Delete({
	extension,
	deleting,
	onCancel,
	onConfirm,
}: DeleteProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Dialog
			open={extension !== null}
			disablePointerDismissal
			onOpenChange={(open) => {
				if (!open && !deleting) onCancel();
			}}
		>
			<DialogContent role="alertdialog" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>{t('settings.extensions.deleteTitle')}</DialogTitle>
					<DialogDescription>
						{t('settings.extensions.deleteDescription', { name: extension?.title ?? '' })}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel} disabled={deleting}>
						{t('common.cancel')}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => void onConfirm()}
						disabled={deleting}
					>
						{deleting ? t('settings.extensions.deleting') : t('common.delete')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
