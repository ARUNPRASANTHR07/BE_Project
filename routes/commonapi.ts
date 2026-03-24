import { Router, Request, Response } from "express";
import { logger } from "../utils/logger";
import { executeProcessJson } from "../services/commonService";



const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const body = req.body || {};
  const { Usercontext, servicename, JsonValue } = body;

  const safePayload = { ...req.body };
  if (safePayload.password) safePayload.password = "***";

  // Create logger using username (fallback to 'unknown')
  const userLogger = logger(Usercontext.userid);


  userLogger.info({
    type: "API_REQUEST",
    method: req.method,
    url: req.originalUrl,
    servicename,
    payload: safePayload,
    ip: req.ip,
    Usercontext: Usercontext,
    Completed: "----------------------------------------End Of Request-----------------------"

  });

  if (!servicename) {
    userLogger.warn({
      type: "VALIDATION_ERROR",
      message: "servicename is required",
      Usercontext: Usercontext,
    });

    return res.status(400).json({
      success: false,
      message: "servicename is required"
    });
  }

  try {
    const result = await executeProcessJson(servicename, JsonValue);


    const responseTime = Date.now() - startTime;

    userLogger.info({
      type: "API_RESPONSE",
      status: 200,
      servicename,
      responseTime: `${responseTime}ms`,
      recordCount: result?.recordsets?.length || 0,
      Usercontext: Usercontext,
    });

    res.json({
      success: true,
      data: result.recordsets,
      message: "Stored procedure executed successfully"
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    userLogger.error({
      type: "API_ERROR",
      status: 500,
      servicename,
      message: error?.message,
      stack: error?.stack,
      responseTime: `${responseTime}ms`,
      Usercontext: Usercontext,
      error: error
    });



    res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error"
    });




  }
});

export default router;
