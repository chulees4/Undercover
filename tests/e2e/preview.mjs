import { readFile } from 'node:fs/promises';
import { preview } from 'vite';

const worker = await readFile(
  new URL('../../dist/sw.js', import.meta.url),
  'utf8',
);
let updated = false;
await preview({
  configFile: false,
  base: '/Undercover/',
  preview: { host: 'localhost', port: 4173, strictPort: true },
  plugins: [
    {
      name: 'test-service-worker-update',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = request.url?.split('?')[0];
          if (
            path === '/Undercover/__publish-test-update' &&
            request.method === 'POST'
          ) {
            updated = true;
            response.statusCode = 204;
            response.end();
          } else if (updated && path === '/Undercover/sw.js') {
            response.setHeader('Content-Type', 'application/javascript');
            response.setHeader('Cache-Control', 'no-store');
            response.end(`${worker}\n// Second deployment\n`);
          } else {
            next();
          }
        });
      },
    },
  ],
});
