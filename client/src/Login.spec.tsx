import { afterEach, afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import Login from './Login';

const server = setupServer(
    http.post('http://localhost:3000/auth/login', async () => {
        return HttpResponse.json({
            sessionId: 'test-session-id',
            envelope: {
                salt: 'stub-salt-123',
                ciphertext: 'stub-ciphertext-456',
                nonce: 'stub-nonce-789',
            },
        });
    }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Login route (T1 tooling spine)', () => {
    it('posts the form to /auth/login and renders the response', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>,
        );

        await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
        await user.type(screen.getByLabelText(/password/i), 'hunter2');
        await user.click(screen.getByRole('button', { name: /log in/i }));

        const response = await screen.findByTestId('login-response');
        expect(response).toHaveTextContent('test-session-id');
        expect(response).toHaveTextContent('stub-salt-123');
        expect(response).toHaveTextContent('stub-ciphertext-456');
        expect(response).toHaveTextContent('stub-nonce-789');
        expect(response).toHaveTextContent('envelope');
    });
});