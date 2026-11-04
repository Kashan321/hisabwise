import { apiFetch } from './client';

export async function sendRegisterOtp(email: string) {
  return apiFetch<{ sent: boolean; expiresInSeconds: number }>('/auth/register/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
    auth: 'none',
  });
}
