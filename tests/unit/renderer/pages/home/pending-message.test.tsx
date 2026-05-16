import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingMessage } from '../../../../../src/renderer/src/pages/home/components/PendingMessage';
import type { HomeMultiSelectMessage } from '../../../../../src/renderer/src/pages/home/context';

function approvalMessage(options?: Partial<HomeMultiSelectMessage>): HomeMultiSelectMessage {
	return {
		id: 'pending-1',
		role: 'agent',
		type: 'multi-select',
		prompt: 'Confirm',
		options: [
			{
				id: 'approval:a1:allow-once',
				kind: 'approval',
				label: 'exec: Allow once',
				description: 'printf ok',
				approvalId: 'a1',
				decision: 'allow-once',
			},
			{
				id: 'approval:a1:deny',
				kind: 'approval',
				label: 'exec: Deny',
				description: 'printf ok',
				approvalId: 'a1',
				decision: 'deny',
			},
		],
		...options,
	};
}

describe('PendingMessage', () => {
	it('submits a single approval immediately when the user selects a decision', async () => {
		const onSubmit = jest.fn();
		const onSelectApprovalOption = jest.fn();

		render(
			<PendingMessage
				message={approvalMessage()}
				selectedOptions={['approval:a1:deny']}
				inputAnswers={{}}
				onInputAnswerChange={jest.fn()}
				onSelectApprovalOption={onSelectApprovalOption}
				onSubmit={onSubmit}
			/>
		);

		await userEvent.click(screen.getByRole('radio', { name: /allow once/i }));

		expect(onSelectApprovalOption).toHaveBeenCalledWith(
			'pending-1',
			'a1',
			'approval:a1:allow-once'
		);
		expect(onSubmit).toHaveBeenCalledWith(approvalMessage(), {
			approvalId: 'a1',
			decision: 'allow-once',
			optionId: 'approval:a1:allow-once',
		});
	});

	it('keeps confirm flow for approvals that also require text input', async () => {
		const onSubmit = jest.fn();
		const onSelectApprovalOption = jest.fn();
		const message = approvalMessage({
			options: [
				...approvalMessage().options,
				{
					id: 'input:i1',
					kind: 'input',
					label: 'Required input',
					description: 'Path?',
					inputId: 'i1',
				},
			],
		});

		render(
			<PendingMessage
				message={message}
				selectedOptions={['approval:a1:deny']}
				inputAnswers={{ 'pending-1:i1': 'README.md' }}
				onInputAnswerChange={jest.fn()}
				onSelectApprovalOption={onSelectApprovalOption}
				onSubmit={onSubmit}
			/>
		);

		await userEvent.click(screen.getByRole('radio', { name: /allow once/i }));

		expect(onSelectApprovalOption).toHaveBeenCalledWith(
			'pending-1',
			'a1',
			'approval:a1:allow-once'
		);
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
