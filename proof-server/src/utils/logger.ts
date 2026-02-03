/**
 * Logger utility using Winston
 */

import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}] ${message} ${metaStr}`;
});

export const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console output with colors
        new transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'HH:mm:ss' }),
                logFormat
            )
        }),
        // File output
        new transports.File({
            filename: './logs/proof-server.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Error log
        new transports.File({
            filename: './logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});
