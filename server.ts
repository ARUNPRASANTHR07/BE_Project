import dotenv from "dotenv";
dotenv.config();

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});



import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { asyncLocalStorage } from './utils/trace'
import commonRoutes from "./routes/commonapi";
import { logger } from "./utils/logger";
import { traceMiddleware } from "./middleware/trace";
import { authenticateJWT } from "./middleware/auth";
import authRoutes from "./routes/auth";
import { decryptMiddleware } from "./middleware/decrypt";




const app = express();
const PORT = 5000;

app.use(helmet());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

app.use(traceMiddleware);
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,  // frontend URL
    credentials: true
}));
app.use(bodyParser.json());
/*

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(","),
    credentials: true
}));
*/

// Create logger using username (fallback to 'unknown')
const userLogger = logger("Server");

/* -------------------------
   Request & Response Logger
-------------------------- */
app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - startTime;

        userLogger.info({
            type: "REQUEST",
            traceId: asyncLocalStorage.getStore()?.traceId || "No TraceId",  // Debug traceId
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            responseTime: `${duration}ms`
        });
    });

    next();
});

/* -------------------------
   Routes
-------------------------- */
// Public
app.use("/api/auth", decryptMiddleware, authRoutes);

// Protected
app.use("/api/common", authenticateJWT, decryptMiddleware, commonRoutes);



/* -------------------------
   Error Handler
-------------------------- */
app.use(
    (err: Error, req: Request, res: Response, next: NextFunction) => {
        userLogger.error({
            type: "ERROR",
            message: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl
        });

        res.status(500).json({
            success: false,
            message: err
        });


    }
);

/* -------------------------
   Start Server
-------------------------- */
const server = http.createServer(app);

server.listen(PORT, () => {
    userLogger.info({
        type: "SERVER",
        message: `Server running on ${PORT}`,
        port: PORT,

    });
});

/* -------------------------
   Connection Logger
-------------------------- */
server.on("connection", (socket) => {
    userLogger.info({
        type: "CONNECTION",
        remoteAddress: socket.remoteAddress
    });
});

export default app;
