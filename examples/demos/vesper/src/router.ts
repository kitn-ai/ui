// One router instance, in its own module so every graph shares one source of
// truth. Routes come from the file system (src/routes, scanned by the
// fileRoutes plugin in vite.config.ts).
import { pageRoutes } from 'virtual:file-routes';
import { createRouter } from '@solidjs/router';
import { fileRoutes } from '@solidjs/router/fs';

export const Router = createRouter({ routes: fileRoutes(pageRoutes) });

// Typed path proxy: paths.shop.piece('the-coat') rather than a string literal.
export const { paths } = Router;
