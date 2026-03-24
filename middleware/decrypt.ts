import { Request, Response, NextFunction } from "express";
import { decryptPayload } from "../utils/encrypt";
import { logger } from "../utils/logger";

export const decryptMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {


    // Create logger using username (fallback to 'unknown')
    const userLogger = logger("unknown");
    try {


        if (!req.body?.data) {
            return res.status(400).json({
                success: false,
                message: "Encrypted payload missing"
            });
        }

        req.body = decryptPayload(req.body.data);
        next();

    } catch (error: any) {
        userLogger.error({
            type: "DECRYPT_ERROR",
            message: error.message
        });

        return res.status(400).json({
            success: false,
            message: "Invalid encrypted payload",
            data: req.body?.data
        });
    }
};
