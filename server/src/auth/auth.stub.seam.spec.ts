import request from 'supertest';
import { createApp } from '../app';

describe('POST /auth/login (T1 tooling-spine stub)', () => {
    it('returns the login wire-contract shape', async () => {
        const res = await request(createApp())
            .post('/auth/login')
            .send({ email: 'alice@example.com', password_hash: 'irrelevant-hash' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            sessionId: expect.any(String),
            envelope: {
                salt: expect.any(String),
                ciphertext: expect.any(String),
                nonce: expect.any(String),
            },
        });
    });
});