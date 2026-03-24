import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { asyncLocalStorage } from "./trace";
// Get today's date (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

// Base logs directory
const baseLogDir = path.join(__dirname, '../logs');
export const logger = (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const userLogDir = path.join(baseLogDir, today, `user-${userId}`);

    if (!fs.existsSync(userLogDir)) {
        fs.mkdirSync(userLogDir, { recursive: true });
    }

    const injectTraceId = winston.format((info) => {
        const store = asyncLocalStorage.getStore();
        info.traceId = store?.traceId || null;
        return info;
    });

    return winston.createLogger({
        level: "info",
        format: winston.format.combine(
            injectTraceId(),
            winston.format.errors({ stack: true }), // ⭐ FIX
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new DailyRotateFile({
                filename: path.join(userLogDir, 'requests.log'),
                level: 'info',
                maxSize: '20m',
                maxFiles: '30d',
                zippedArchive: true,
                // handleExceptions: true,
                // handleRejections: true
            }),
            new DailyRotateFile({
                filename: path.join(userLogDir, 'errors.log'),
                level: 'error',
                maxSize: '20m',
                maxFiles: '30d',
                zippedArchive: true,
                // handleExceptions: true,
                // handleRejections: true
            })
        ]
    });
};
