import { app } from './app.js';

const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}