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
		<div className={cn('mx-auto flex w-full max-w-6xl flex-col gap-5 pb-5', className)}>
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
	icon: Icon,
	action,
}: SettingsPageHeaderProps): React.JSX.Element {
	return (
		<header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
			<div className="flex min-w-0 items-start gap-3">
				{Icon && (
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
						<Icon className="size-4 text-foreground" />
					</div>
				)}
				<div className="min-w-0">
					<h1 className="text-base font-semibold leading-none">{title}</h1>
					{description && (
						<p className="mt-2 max-w-2xl text-sm leading-normal text-muted-foreground">
							{description}
						</p>
					)}
				</div>
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
		<section className={cn('flex flex-col gap-3', className)}>
			<div className="flex flex-wrap items-start justify-between gap-3 px-1">
				<div className="min-w-0">
					<h2 className="text-sm font-semibold text-foreground">{title}</h2>
					{description && (
						<p className="mt-1 max-w-2xl text-sm leading-normal text-muted-foreground">
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
		<Card size="sm" className={cn('gap-0 py-0', className)}>
			<CardContent className="p-0">{children}</CardContent>
		</Card>
	);
}

interface SettingsRowProps {
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly icon?: LucideIcon;
	readonly media?: ReactNode;
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
	children,
	className,
	contentClassName,
	actionClassName,
}: SettingsRowProps): React.JSX.Element {
	return (
		<div
			className={cn(
				'grid min-h-[56px] gap-3 border-b border-border/70 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
				className
			)}
		>
			<div className={cn('flex min-w-0 items-start gap-3', contentClassName)}>
				{media ??
					(Icon && (
						<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
							<Icon className="size-4" />
						</div>
					))}
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium leading-snug text-foreground">{title}</div>
					{description && (
						<p className="mt-1 text-xs leading-normal text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children && (
				<div
					className={cn(
						'flex min-w-0 flex-wrap items-center gap-2 sm:justify-end',
						actionClassName
					)}
				>
					{children}
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
				'inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground',
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
				'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
				variant === 'destructive'
					? 'border-destructive/30 bg-destructive/10 text-destructive'
					: 'border-border/70 bg-muted/30 text-muted-foreground',
				className
			)}
		>
			{Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
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
		<Empty className={cn('min-h-40 border-0 p-6', className)}>
			<EmptyHeader>
				{Icon && (
					<EmptyMedia variant="icon">
						<Icon className="size-4" />
					</EmptyMedia>
				)}
				<EmptyTitle>{title}</EmptyTitle>
				{description && <EmptyDescription>{description}</EmptyDescription>}
			</EmptyHeader>
			{children}
		</Empty>
	);
}
