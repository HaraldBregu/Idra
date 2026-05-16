import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Message, MessageContent } from '@/components/ui/message';
import { Textarea } from '@/components/ui/textarea';
import { inputAnswerKey, type HomeMultiSelectMessage } from '../context';

export function PendingMessage({
	message,
	selectedOptions,
	inputAnswers,
	onInputAnswerChange,
	onSelectApprovalOption,
	onSubmit,
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
	readonly onSubmit: (message: HomeMultiSelectMessage) => void;
}): ReactElement {
	const approvalOptions = message.options.filter((option) => option.kind === 'approval');
	const inputOptions = message.options.filter((option) => option.kind === 'input');
	const hasMissingInput = inputOptions.some(
		(option) =>
			option.inputId &&
			(inputAnswers[inputAnswerKey(message.id, option.inputId)] ?? '').trim().length === 0
	);

	return (
		<Message className="max-w-2xl">
			<MessageContent
				className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl p-4 shadow-sm"
				role="group"
				aria-label={message.prompt}
			>
				<p className="text-sm font-semibold text-foreground">{message.prompt}</p>
				{approvalOptions.length > 0 && (
					<div className="flex flex-col gap-2" role="radiogroup">
						{approvalOptions.map((option) => {
							const isSelected = selectedOptions.includes(option.id);
							const handleChange = (): void => {
								if (option.approvalId) {
									onSelectApprovalOption(message.id, option.approvalId, option.id);
								}
							};

							return (
								<Button
									key={option.id}
									type="button"
									variant={isSelected ? 'secondary' : 'outline'}
									size="lg"
									role="radio"
									aria-checked={isSelected}
									onClick={handleChange}
									className="h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-3 py-3 text-left"
								>
									<span
										className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-current"
										aria-hidden
									>
										{isSelected && <span className="size-1.5 rounded-full bg-current" />}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-semibold leading-snug">{option.label}</span>
										<span className="mt-1 block break-words text-xs leading-normal text-muted-foreground">
											{option.description}
										</span>
									</span>
								</Button>
							);
						})}
					</div>
				)}
				{inputOptions.map((option) => {
					if (!option.inputId) return null;
					const key = inputAnswerKey(message.id, option.inputId);
					return (
						<label key={option.id} className="flex flex-col gap-2">
							<span className="text-sm font-semibold leading-snug">{option.label}</span>
							<span className="whitespace-pre-wrap text-xs leading-normal text-muted-foreground">
								{option.description}
							</span>
							<Textarea
								value={inputAnswers[key] ?? ''}
								onChange={(event) =>
									onInputAnswerChange(message.id, option.inputId!, event.currentTarget.value)
								}
								className="min-h-20 resize-none rounded-xl"
							/>
						</label>
					);
				})}
				<Button
					type="button"
					size="sm"
					className="self-start rounded-xl"
					disabled={hasMissingInput}
					onClick={() => onSubmit(message)}
				>
					Confirm
				</Button>
			</MessageContent>
		</Message>
	);
}
