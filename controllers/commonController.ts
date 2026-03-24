import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { executeProcessJson } from "../services/commonService";


export const processJson = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { Usercontext, servicename, JsonValue } = req.body;

    // Create logger using username (fallback to 'unknown')
    const userLogger = logger(Usercontext.userid);

    userLogger.info({
        type: "API_REQUEST",
        userId: req.user?.id,
        servicename,
        Usercontext: Usercontext,
    });

    if (!servicename) {
        userLogger.warn({ type: "VALIDATION_ERROR", userId: req.user?.id });
        return res.status(400).json({ success: false, message: "servicename required" });
    }

    try {
        const result = await executeProcessJson(servicename, JsonValue);


        userLogger.info({ type: "DB_CALL", servicename });

        const responseTime = Date.now() - startTime;

        userLogger.info({
            type: "API_RESPONSE",
            userId: req.user?.id,
            responseTime: `${responseTime}ms`,
            Usercontext: Usercontext,
        });

        res.json({ success: true, data: result.recordsets });

    } catch (error: any) {
        userLogger.error({
            type: "API_ERROR",
            userId: req.user?.id,
            message: error.message,
            stack: error.stack,
            Usercontext: Usercontext,
            error: error
        });


        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error"
        });

    }
};
