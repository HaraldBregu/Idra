import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertTriangle,
	Image as ImageIcon,
	LayoutGrid,
	List as ListIcon,
	Music,
	Video as VideoIcon,
} from 'lucide-react';
import type { LibraryFile, LibraryFileType } from '../../../../../../shared/library_types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

type LibraryViewMode = 'collection' | 'list';

function localResourceUrl(filePath: string): string {
	const posixPath = filePath.replace(/\\/g, '/');
	const absolutePath = posixPath.startsWith('/') ? posixPath : `/${posixPath}`;
	return `local-resource://file${encodeURI(absolutePath)}`;
}

function showContextMenu(file: LibraryFile): void {
	if (file.type === 'image') void window.app.showImageContextMenu(file.path);
	else if (file.type === 'video') void window.app.showVideoContextMenu(file.path);
	else void window.app.showAudioContextMenu(file.path);
}

function LibraryItemPlayer({ file }: { readonly file: LibraryFile }): React.JSX.Element {
	const url = localResourceUrl(file.path);
	if (file.type === 'image') {
		return <img src={url} alt={file.name} className="h-full w-full object-cover" />;
	}
	if (file.type === 'video') {
		return <video src={url} controls className="h-full w-full object-contain" />;
	}
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2">
			<Music className="size-6 text-muted-foreground" />
			<audio src={url} controls className="w-full" />
		</div>
	);
}

function LibraryFileTypeIcon({ type }: { readonly type: LibraryFileType }): React.JSX.Element {
	if (type === 'image') return <ImageIcon className="size-4" />;
	if (type === 'video') return <VideoIcon className="size-4" />;
	return <Music className="size-4" />;
}

function LibraryListRow({ file }: { readonly file: LibraryFile }): React.JSX.Element {
	return (
		<div
			className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0"
			onContextMenu={() => showContextMenu(file)}
		>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
				<LibraryFileTypeIcon type={file.type} />
			</span>
			<span className="min-w-0 truncate text-[13px] font-medium text-foreground">
				{file.name}
			</span>
			<span className="shrink-0 text-[11px] text-muted-foreground">
				{new Date(file.createdAt).toLocaleString()}
			</span>
		</div>
	);
}

const LibraryPage: React.FC = () => {
	const { t } = useTranslation();
	const [files, setFiles] = useState<LibraryFile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void (async () => {
			try {
				const items = await window.agent.libraryList();
				if (mounted) setFiles(items);
			} catch (err) {
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.library.title')}
				description={t('settings.library.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.library.itemsTitle')}>
				{!loading && files.length === 0 ? (
					<p className="px-3 py-3 text-[11px] leading-4 text-muted-foreground">
						{t('settings.library.empty')}
					</p>
				) : (
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
						{files.map((file) => (
							<div
								key={file.path}
								className="overflow-hidden rounded-xl border border-border/50 bg-muted/30"
								onContextMenu={() => showContextMenu(file)}
							>
								<div className="aspect-square w-full">
									<LibraryItemPlayer file={file} />
								</div>
								<div className="grid gap-0.5 px-2 py-1.5">
									<span className="truncate text-xs font-medium">{file.name}</span>
									<span className="text-[11px] text-muted-foreground">
										{new Date(file.createdAt).toLocaleString()}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default LibraryPage;
