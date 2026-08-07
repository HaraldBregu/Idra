import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelOptions } from '../../../src/renderer/src/components/model-options';

describe('ModelOptions', () => {
	it('renders nested provider choices as a select', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ModelOptions
				inputs={{
					reasoning: {
						type: 'object',
						properties: {
							effort: { type: 'string', enum: ['low', 'medium', 'high'] },
						},
					},
				}}
				values={{}}
				onChange={onChange}
			/>
		);

		expect(screen.getByText('reasoning effort')).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveTextContent('Provider default');
		await user.click(screen.getByRole('combobox'));
		fireEvent.click(screen.getByRole('option', { name: 'high', hidden: true }));

		expect(onChange).toHaveBeenCalledWith(['reasoning', 'effort'], 'high');
	});

	it('uses provider choices for numeric enums', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ModelOptions
				inputs={{ duration: { type: 'integer', enum: [5, 10] } }}
				values={{}}
				onChange={onChange}
			/>
		);

		expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
		await user.click(screen.getByRole('combobox'));
		fireEvent.click(screen.getByRole('option', { name: '10', hidden: true }));

		expect(onChange).toHaveBeenCalledWith(['duration'], 10);
	});

	it('does not render unsupported object-only schemas', () => {
		const { container } = render(
			<ModelOptions
				inputs={{ response_format: { type: 'object' } }}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
