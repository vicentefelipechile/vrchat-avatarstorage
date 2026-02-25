import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { Context, Next } from 'hono';

export const securityMiddleware = (app: any) => {
    app.use('*', secureHeaders());
    app.use('*', cors({
        origin: [
            'https://vrchat-avatarstorage.vicentefelipechile.workers.dev',
            'https://vrcstorage.net', // add your custom domain if you have one
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true,
    }));
};
