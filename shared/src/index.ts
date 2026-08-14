export interface LoginRequest {
    email: string;
    password_hash: string;
}

export interface EnvelopePayload {
    salt: string;
    ciphertext: string;
    nonce: string;
}

export interface LoginResponse {
    sessionId: string;
    envelope: EnvelopePayload;
}