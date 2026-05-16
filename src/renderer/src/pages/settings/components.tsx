import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

interface SettingsPageShellProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export function SettingsPageShell({
	children,
	className,
}: SettingsPageShellProps): React.JSX.Element {
	return (
		<div className={cn('mx-auto flex w-full max-w-2xl flex-col gap-5 pb-6', className)}>
			{children}
		</div>
	);
}

interface SettingsPageHeaderProps {
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly icon?: LucideIcon;
	readonly action?: ReactNode;
}

export function SettingsPageHeader({
	title,
	description,
	action,
}: SettingsPageHeaderProps): React.JSX.Element {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold leading-tight tracking-tight">{title}</h1>
				{description && (
					<p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
				)}
			</div>
			{action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
		</header>
	);
}

interface SettingsSectionProps {
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly action?: ReactNode;
	readonly children: ReactNode;
	readonly className?: string;
}

export function SettingsSection({
	title,
	description,
	action,
	children,
	className,
}: SettingsSectionProps): React.JSX.Element {
	return (
		<section className={cn('flex flex-col gap-1.5', className)}>
			<div className="flex flex-wrap items-center justify-between gap-2 px-1">
				<div className="min-w-0">
					<h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{title}
					</h2>
					{description && (
						<p className="mt-0.5 max-w-2xl text-xs leading-4 text-muted-foreground">
							{description}
						</p>
					)}
				</div>
				{action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
			</div>
			{children}
		</section>
	);
}

interface SettingsPanelProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export function SettingsPanel({ children, className }: SettingsPanelProps): React.JSX.Element {
	return (
		<Card size="sm" className={cn('gap-0 rounded-xl py-0 shadow-none', className)}>
			<CardContent className="p-0">{children}</CardContent>
		</Card>
	);
}

interface SettingsRowProps {
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly icon?: LucideIcon;
	readonly media?: ReactNode;
	readonly actions?: ReactNode;
	readonly children?: ReactNode;
	readonly className?: string;
	readonly contentClassName?: string;
	readonly actionClassName?: string;
}

export function SettingsRow({
	title,
	description,
	icon: Icon,
	media,
	actions,
	children,
	className,
	contentClassName,
	actionClassName,
}: SettingsRowProps): React.JSX.Element {
	const rowActions = actions ?? children;

	return (
		<div
			className={cn(
				'grid min-h-[44px] items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]',
				className
			)}
		>
			<div className={cn('flex min-w-0 items-center gap-2.5', contentClassName)}>
				{media ??
					(Icon && (
						<Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
					))}
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-medium leading-5 text-foreground">{title}</div>
					{description && (
						<p className="text-xs leading-4 text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{rowActions && (
				<div
					className={cn(
						'flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end',
						actionClassName
					)}
				>
					{rowActions}
				</div>
			)}
		</div>
	);
}

interface SettingsValueProps {
	readonly children: ReactNode;
	readonly mono?: boolean;
	readonly className?: string;
}

export function SettingsValue({
	children,
	mono,
	className,
}: SettingsValueProps): React.JSX.Element {
	return (
		<span
			className={cn(
				'inline-flex h-7 max-w-full items-center rounded-lg border border-border/70 bg-muted/40 px-2.5 text-xs text-foreground',
				mono && 'font-mono',
				className
			)}
		>
			<span className="flex min-w-0 items-center truncate">{children}</span>
		</span>
	);
}

interface SettingsNoticeProps {
	readonly children: ReactNode;
	readonly icon?: LucideIcon;
	readonly variant?: 'default' | 'destructive';
	readonly className?: string;
}

export function SettingsNotice({
	children,
	icon: Icon,
	variant = 'default',
	className,
}: SettingsNoticeProps): React.JSX.Element {
	return (
		<div
			className={cn(
				'flex items-start gap-2 rounded-xl border px-4 py-3 text-sm',
				variant === 'destructive'
					? 'border-destructive/30 bg-destructive/10 text-destructive'
					: 'border-border/70 bg-muted/30 text-muted-foreground',
				className
			)}
		>
			{Icon && <Icon className="mt-0.5 size-3.5 shrink-0" />}
			<span className="min-w-0">{children}</span>
		</div>
	);
}

interface SettingsEmptyStateProps {
	readonly icon?: LucideIcon;
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly children?: ReactNode;
	readonly className?: string;
}

export function SettingsEmptyState({
	icon: Icon,
	title,
	description,
	children,
	className,
}: SettingsEmptyStateProps): React.JSX.Element {
	return (
		<Empty className={cn('min-h-28 gap-3 border-0 p-4', className)}>
			<EmptyHeader className="gap-1.5">
				{Icon && (
					<EmptyMedia variant="icon" className="mb-1 size-10">
						<Icon className="size-5" />
					</EmptyMedia>
				)}
				<EmptyTitle className="text-sm">{title}</EmptyTitle>
				{description && (
					<EmptyDescription className="text-sm leading-5">{description}</EmptyDescription>
				)}
			</EmptyHeader>
			{children}
		</Empty>
	);
}
