import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { ImagePlus, Upload } from 'lucide-react';

type ImageSource = 'url' | 'upload';

function fileToDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				resolve(result);
			} else {
				reject(new Error('Failed to read file'));
			}
		};
		reader.readAsDataURL(file);
	});
}

interface InsertImageResult {
	src: string;
	alt: string;
	title: string;
}

interface InsertImageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInsert: (result: InsertImageResult) => void;
}

const MAX_PREVIEW_HEIGHT = 160;

export function InsertImageDialog({
	open,
	onOpenChange,
	onInsert,
}: InsertImageDialogProps): React.JSX.Element {
	const { t } = useTranslation();
	const [source, setSource] = useState<ImageSource>('url');
	const [url, setUrl] = useState('');
	const [alt, setAlt] = useState('');
	const [title, setTitle] = useState('');
	const [preview, setPreview] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const reset = useCallback(() => {
		setSource('url');
		setUrl('');
		setAlt('');
		setTitle('');
		setPreview(null);
		setError(null);
	}, []);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) reset();
			onOpenChange(nextOpen);
		},
		[onOpenChange, reset]
	);

	const handleSourceChange = useCallback((value: string | null) => {
		if (value === null) return;
		setSource(value as ImageSource);
		setUrl('');
		setPreview(null);
		setError(null);
	}, []);

	const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setUrl(value);
		setError(null);
		setPreview(value.trim() || null);
	}, []);

	const handleFileSelect = useCallback(async () => {
		const input = fileInputRef.current;
		if (!input) return;
		input.click();
	}, []);

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			try {
				const dataUri = await fileToDataUri(file);
				setUrl(dataUri);
				setPreview(dataUri);
				setError(null);
				if (!alt) {
					setAlt(file.name.replace(/\.[^.]+$/, ''));
				}
			} catch {
				setError('Failed to read the selected file.');
			}

			// Reset file input so the same file can be re-selected
			e.target.value = '';
		},
		[alt]
	);

	const handleInsert = useCallback(() => {
		const trimmedUrl = url.trim();
		if (!trimmedUrl) {
			setError('Please provide an image URL or upload a file.');
			return;
		}
		onInsert({ src: trimmedUrl, alt: alt.trim(), title: title.trim() });
		reset();
		onOpenChange(false);
	}, [url, alt, title, onInsert, reset, onOpenChange]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleInsert();
			}
		},
		[handleInsert]
	);

	const canInsert = url.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ImagePlus className="h-5 w-5" />
						{t('insertImageDialog.title')}
					</DialogTitle>
					<DialogDescription>{t('insertImageDialog.description')}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					{/* Source select */}
					<div className="grid gap-2">
						<Label htmlFor="image-source">{t('insertImageDialog.source')}</Label>
						<Select value={source} onValueChange={handleSourceChange}>
							<SelectTrigger id="image-source">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="url">{t('insertImageDialog.url')}</SelectItem>
								<SelectItem value="upload">{t('insertImageDialog.uploadFromComputer')}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* URL input or Upload button */}
					{source === 'url' ? (
						<div className="grid gap-2">
							<Label htmlFor="image-url">{t('insertImageDialog.imageUrl')}</Label>
							<Input
								id="image-url"
								placeholder="https://example.com/image.png"
								value={url}
								onChange={handleUrlChange}
								autoFocus
							/>
						</div>
					) : (
						<div className="grid gap-2">
							<Label>{t('insertImageDialog.file')}</Label>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
								className="hidden"
								onChange={handleFileChange}
							/>
							<Button
								type="button"
								variant="outline"
								className="justify-start gap-2"
								onClick={handleFileSelect}
							>
								<Upload className="h-4 w-4" />
								{preview ? t('insertImageDialog.changeFile') : t('insertImageDialog.chooseFile')}
							</Button>
						</div>
					)}

					{/* Alt text */}
					<div className="grid gap-2">
						<Label htmlFor="image-alt">{t('insertImageDialog.altText')}</Label>
						<Input
							id="image-alt"
							placeholder={t('insertImageDialog.altTextPlaceholder')}
							value={alt}
							onChange={(e) => setAlt(e.target.value)}
						/>
					</div>

					{/* Title (optional) */}
					<div className="grid gap-2">
						<Label htmlFor="image-title">{t('insertImageDialog.titleOptional')}</Label>
						<Input
							id="image-title"
							placeholder={t('insertImageDialog.titlePlaceholder')}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>

					{/* Preview */}
					{preview && (
						<div className="grid gap-2">
							<Label>{t('common.preview')}</Label>
							<div className="overflow-hidden rounded-md border border-border bg-muted/50 p-2">
								<img
									src={preview}
									alt={alt || 'Preview'}
									className="mx-auto block rounded"
									style={{ maxHeight: MAX_PREVIEW_HEIGHT, maxWidth: '100%', objectFit: 'contain' }}
									onError={() => setError(t('insertImageDialog.previewError'))}
								/>
							</div>
						</div>
					)}

					{/* Error message */}
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						{t('common.cancel')}
					</Button>
					<Button onClick={handleInsert} disabled={!canInsert}>
						{t('insertImageDialog.insert')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
