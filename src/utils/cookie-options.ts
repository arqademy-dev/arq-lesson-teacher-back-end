export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    secure: isProduction,                                  // must be true whenever sameSite is 'none'
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 60 * 60 * 24 * 7 * 1000,
  };
}