import { useState, type FormEvent } from 'react';
import type { LoginResponse } from '@chat/shared';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [response, setResponse] = useState<LoginResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setResponse(null);
        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password_hash: password }),
            });
            if (!res.ok) {
                throw new Error(`Login failed (${res.status})`);
            }
            const data: LoginResponse = await res.json();
            setResponse(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <form
                onSubmit={handleSubmit}
                aria-label="Login form"
                className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
            >
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Log in
                </h1>
                <label className="block">
                    <span className="block text-sm text-gray-700 dark:text-gray-300">
                        Email
                    </span>
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="mt-1 block w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                </label>
                <label className="block">
                    <span className="block text-sm text-gray-700 dark:text-gray-300">
                        Password
                    </span>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        className="mt-1 block w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                </label>
                <button
                    type="submit"
                    className="w-full rounded bg-blue-600 p-2 text-white dark:bg-blue-500"
                >
                    Log in
                </button>
                {response && (
                    <p
                        data-testid="login-response"
                        className="text-sm text-green-700 dark:text-green-400"
                    >
                        Session: {response.sessionId} ·{' '}
                        envelope salt/ciphertext/nonce:{' '}
                        {response.envelope.salt}/{response.envelope.ciphertext}/{response.envelope.nonce}
                    </p>
                )}
                {error && (
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                )}
            </form>
        </main>
    );
}