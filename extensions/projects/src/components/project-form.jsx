import { useState } from 'react';

export default function ProjectForm({ disabled, onCreate }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');

	return (
		<form
			className="row"
			onSubmit={async (event) => {
				event.preventDefault();
				await onCreate(name.trim(), description.trim());
				setName('');
				setDescription('');
			}}
		>
			<input
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="New project name"
			/>
			<input
				value={description}
				onChange={(event) => setDescription(event.target.value)}
				placeholder="Description"
			/>
			<button type="submit" disabled={disabled || !name.trim()}>
				Create
			</button>
		</form>
	);
}
