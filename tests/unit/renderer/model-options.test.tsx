import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelOptions } from '../../../src/renderer/src/components/model-options';

describe('ModelOptions', () => {
	it('renders nested provider choices as a select and returns the wire path', async () => {
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
		await user.click(screen.getByRole('combobox'));
		await user.click(screen.getByRole('option', { name: 'high' }));

		expect(onChange).toHaveBeenCalledWith(['reasoning', 'effort'], 'high');
	});

	it('uses provider choices for numeric enums and preserves their value type', async () => {
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
		await user.click(screen.getByRole('option', { name: '10' }));

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
