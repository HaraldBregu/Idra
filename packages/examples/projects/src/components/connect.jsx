import { useState } from 'react';

/** Shown outside the Friday app: paste the API token and the SDK talks over the local API. */
export default function Connect({ onConnect }) {
	const [token, setToken] = useState('');
	const [url, setUrl] = useState('http://127.0.0.1:8765');
	const [error, setError] = useState('');

	return (
		<main className="app connect">
			<h1>Connect to Friday</h1>
			<p className="muted">
				Open this extension inside Friday, or paste the token from
				<code> ~/Library/Application Support/Friday/sdk-token</code>.
			</p>

			<form
				onSubmit={async (event) => {
					event.preventDefault();
					setError('');
					try {
						await onConnect({ token: token.trim(), url: url.trim() });
					} catch (cause) {
						setError(cause.message);
					}
				}}
			>
				<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="API url" />
				<input
					value={token}
					onChange={(event) => setToken(event.target.value)}
					placeholder="API token"
					type="password"
				/>
				<button type="submit" disabled={!token.trim()}>
					Connect
				</button>
			</form>

			{error ? <p className="error">{error}</p> : null}
		</main>
	);
}
