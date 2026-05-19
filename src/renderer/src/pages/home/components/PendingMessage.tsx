import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Message, MessageContent } from '@/components/ui/message';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
	inputAnswerKey,
	type HomeMultiSelectMessage,
	type ImmediateApprovalSelection,
	type HomeMultiSelectOption,
} from '../context';
import { AssistantMessageHeader } from './AssistantMessageHeader';

export function PendingMessage({
	message,
	selectedOptions,
	inputAnswers,
	onInputAnswerChange,
	onSelectApprovalOption,
	onSubmit,
	showHeader = true,
	className,
}: {
	readonly message: HomeMultiSelectMessage;
	readonly selectedOptions: readonly string[];
	readonly inputAnswers: Record<string, string>;
	readonly onInputAnswerChange: (messageId: string, inputId: string, value: string) => void;
	readonly onSelectApprovalOption: (
		messageId: string,
		approvalId: string,
		optionId: string
	) => void;
	readonly onSubmit: (
		message: HomeMultiSelectMessage,
		immediateApproval?: ImmediateApprovalSelection
	) => void;
	readonly showHeader?: boolean;
	readonly className?: string;
}): ReactElement {
	const approvalOptions = message.options.filter((option) => option.kind === 'approval');
	const inputOptions = message.options.filter((option) => option.kind === 'input');
	const approvalGroups = groupApprovalOptions(approvalOptions);
	const approvalIds = new Set(
		approvalOptions.map((option) => option.approvalId).filter(Boolean)
	);
	const canSubmitApprovalImmediately = inputOptions.length === 0 && approvalIds.size === 1;
	const hasMissingApproval = [...approvalIds].some(
		(approvalId) =>
			!selectedOptions.some((optionId) => optionId.startsWith(`approval:${approvalId}:`))
	);
	const hasMissingInput = inputOptions.some(
		(option) =>
			option.inputId &&
			(inputAnswers[inputAnswerKey(message.id, option.inputId)] ?? '').trim().length === 0
	);

	return (
		<Message className={cn('w-full max-w-2xl flex-col gap-2', className)}>
			{showHeader && <AssistantMessageHeader />}
			<MessageContent
				className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
				role="group"
				aria-label={message.prompt}
			>
				<p className="text-sm font-semibold text-foreground">{message.prompt}</p>
				{approvalGroups.length > 0 && (
					<div className="flex flex-col gap-3">
						{approvalGroups.map(([approvalId, options]) => {
							const first = options[0]!;
							return (
								<div
									key={approvalId}
									className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-3"
								>
									<div className="flex min-w-0 flex-wrap items-center gap-2">
										<p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-foreground">
											{first.subject ?? 'Approval required'}
										</p>
										{first.meta && (
											<span className="max-w-full truncate rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground">
												{first.meta}
											</span>
										)}
									</div>
									<p className="max-h-28 overflow-auto whitespace-pre-wrap break-words text-xs leading-normal text-muted-foreground [overflow-wrap:anywhere]">
										{first.description}
									</p>
									{first.paths && first.paths.length > 0 && (
										<div className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-2">
											<span className="text-[11px] font-semibold uppercase leading-none text-muted-foreground">
												Affected paths
											</span>
											<div className="flex min-w-0 flex-col gap-1">
												{first.paths.map((path) => (
													<code
														key={path}
														className="min-w-0 truncate rounded bg-background px-1.5 py-0.5 text-xs text-foreground"
														title={path}
													>
														{path}
													</code>
												))}
											</div>
										</div>
									)}
									<div
										className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
										role="radiogroup"
										aria-label={first.subject ?? 'Approval decision'}
									>
										{options.map((option) => {
											const isSelected = selectedOptions.includes(option.id);
											const handleChange = (): void => {
												if (option.approvalId) {
													onSelectApprovalOption(message.id, option.approvalId, option.id);
													if (canSubmitApprovalImmediately && option.decision) {
														onSubmit(message, {
															approvalId: option.approvalId,
															decision: option.decision,
															optionId: option.id,
														});
													}
												}
											};

											return (
												<Button
													key={option.id}
													type="button"
													variant={buttonVariant(option, isSelected)}
													size="lg"
													role="radio"
													aria-checked={isSelected}
													onClick={handleChange}
													className={cn(
														'h-auto min-h-10 w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left',
														isSelected && 'ring-1 ring-ring/40'
													)}
												>
													<span
														className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current"
														aria-hidden
													>
														{isSelected && <span className="size-1.5 rounded-full bg-current" />}
													</span>
													<span className="min-w-0 break-words text-sm font-semibold leading-snug">
														{option.label}
													</span>
												</Button>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				)}
				{inputOptions.map((option) => {
					if (!option.inputId) return null;
					const key = inputAnswerKey(message.id, option.inputId);
					return (
						<label
							key={option.id}
							className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-3"
						>
							<span className="break-words text-sm font-semibold leading-snug">
								{option.subject ?? option.label}
							</span>
							<span className="whitespace-pre-wrap break-words text-xs leading-normal text-muted-foreground [overflow-wrap:anywhere]">
								{option.description}
							</span>
							<Textarea
								value={inputAnswers[key] ?? ''}
								onChange={(event) =>
									onInputAnswerChange(message.id, option.inputId!, event.currentTarget.value)
								}
								className="min-h-20 resize-none rounded-lg"
							/>
						</label>
					);
				})}
				<Button
					type="button"
					size="sm"
					className="self-start"
					disabled={hasMissingApproval || hasMissingInput}
					onClick={() => onSubmit(message)}
				>
					Confirm
				</Button>
			</MessageContent>
		</Message>
	);
}

function groupApprovalOptions(
	options: readonly HomeMultiSelectOption[]
): Array<[string, HomeMultiSelectOption[]]> {
	const groups = new Map<string, HomeMultiSelectOption[]>();
	for (const option of options) {
		const key = option.approvalId ?? option.id;
		groups.set(key, [...(groups.get(key) ?? []), option]);
	}
	return [...groups.entries()];
}

function buttonVariant(
	option: HomeMultiSelectOption,
	isSelected: boolean
): 'outline' | 'secondary' | 'destructive' {
	if (!isSelected) return 'outline';
	if (option.decision === 'deny') return 'destructive';
	return 'secondary';
}
