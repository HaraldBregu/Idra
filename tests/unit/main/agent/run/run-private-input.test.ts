import { hasPrivateInput } from '../../../../../src/main/agent/runner/run_has_private_input';

it('marks attachment content as private while leaving text-only input public', () => {
	expect(hasPrivateInput([{ role: 'user', content: 'public question' }])).toBe(false);
	expect(
		hasPrivateInput([
			{
				role: 'user',
				content: [{ type: 'file', name: 'private.txt', attachment: { id: 'a', bytes: 1 } }],
			},
		])
	).toBe(true);
});
