export function generateArqId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ARQ';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
}