import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { csrf } from 'hono/csrf';

export const securityMiddleware = (app: any) => {
    app.use('*', secureHeaders());

    const origins = [
        'https://testing-vrchat-avatarstorage.vicentefelipechile.workers.dev',
        'https://vrchat-avatarstorage.vicentefelipechile.workers.dev',
        'https://vrcstorage.lat',
    ];

    app.use('*', cors({
        origin: origins,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true,
    }));

    app.use('*', csrf({
        origin: origins
    }));
};
