import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { asyncLocalStorage } from "../utils/trace";

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const traceId = uuidv4();

    asyncLocalStorage.run({ traceId }, () => {
        res.setHeader("X-Trace-Id", traceId);
        next();
    });
};
