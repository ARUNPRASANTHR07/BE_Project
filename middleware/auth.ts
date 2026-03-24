import { Request, Response, NextFunction } from "express";
import { verifyToken, verifyRefreshToken } from "../utils/jwt";
import { logger } from "../utils/logger";

export interface JwtPayload {
    id: number;
    username: string;
}

declare module "express-serve-static-core" {
    interface Request {
        user?: JwtPayload;
    }
}



export const authenticateJWT = (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const authHeader = req.headers.authorization;

    // Create logger using username (fallback to 'unknown')
    const userLogger = logger("unknown");

    // ✅ Validate Bearer format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        userLogger.warn({
            type: "AUTH_ERROR",
            message: "Missing or malformed token"
        });

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error: any) {

        if (error.name === "TokenExpiredError") {
            userLogger.warn({ type: "AUTH_ERROR", message: "Token expired" });

            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }

        userLogger.warn({ type: "AUTH_ERROR", message: "Invalid token" });

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }
};
