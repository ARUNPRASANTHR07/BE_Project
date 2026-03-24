import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as sql from "mssql";
import poolPromise from "../db";
import { generateToken, generateRefreshToken, verifyToken } from "../utils/jwt";
import { logger } from "../utils/logger";
import dayjs from "dayjs";

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const userLogger = logger(username || "unknown");

    const today = dayjs().format("YYYY-MM-DD");


    try {
        if (!username || !password) {
            userLogger.warn({
                type: "LOGIN_VALIDATION_ERROR",
                message: "Username or password missing"
            });

            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input("UserName", sql.NVarChar, username)
            .query(`
                SELECT 
                    UserId,
                    UserName,
                    PasswordHash,
                    IsActive,
                    IsLocked
                FROM UserLogin
                WHERE UserName = @UserName
            `);

        const user = result.recordset[0];

        // ❌ User not found
        if (!user) {
            userLogger.warn({
                type: "LOGIN_FAILED",
                reason: "USER_NOT_FOUND",
                username,
                ip: req.ip
            });

            return res.status(401).json({
                success: false,
                message: "User Not Fount"
            });
        }

        // ❌ User inactive
        if (user.IsActive !== 1) {
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }

        // ❌ User locked
        if (user.IsLocked === 1) {
            return res.status(403).json({
                success: false,
                message: "User account is locked"
            });
        }

        // 🔐 Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.PasswordHash.toString() // convert VARBINARY to string
        );


        console.log("Password Match:", passwordMatch); // Debugging log
        console.log("User Record:", user); // Debugging log
        const hashedPassword = await bcrypt.hash(password, 12);
        console.log("Hashed Password:", hashedPassword);
        if (!passwordMatch) {
            userLogger.warn({
                type: "LOGIN_FAILED",
                reason: "INVALID_PASSWORD",
                username,
                ip: req.ip
            });
            const lastFailedDate = user.LastFailedLoginDate
                ? dayjs(user.LastFailedLoginDate).format("YYYY-MM-DD")
                : null;

            let failedAttempts = 1;

            if (lastFailedDate === today) {
                failedAttempts = user.FailedLoginAttempts + 1;
            }

            const shouldLock = failedAttempts >= 5;

            await pool.request()
                .input("UserId", sql.Int, user.UserId)
                .input("FailedLoginAttempts", sql.Int, failedAttempts)
                .input("Today", sql.Date, today)
                .input("ShouldLock", sql.Int, shouldLock ? 1 : 0)
                .query(`
            UPDATE UserLogin
            SET 
                FailedLoginAttempts = @FailedLoginAttempts,
                LastFailedLoginDate = @Today,
                IsLocked = CASE WHEN @ShouldLock = 1 THEN 1 ELSE IsLocked END,
                LockedDate = CASE WHEN @ShouldLock = 1 THEN SYSDATETIME() ELSE LockedDate END
            WHERE UserId = @UserId
        `);

            return res.status(401).json({
                success: false,
                message: `Invalid credentials. Attempt ${failedAttempts} of 5`
            });


        }


        await pool.request()
            .input("UserId", sql.Int, user.UserId)
            .query(`
        UPDATE UserLogin
        SET 
            FailedLoginAttempts = 0,
            LastFailedLoginDate = NULL,
            LastLoginDate = SYSDATETIME()
        WHERE UserId = @UserId
    `);




        // 🎟 Generate tokens
        const payload = {
            userId: user.UserId,
            username: user.UserName
        };

        const token = generateToken(payload);
        const refreshToken = generateRefreshToken(payload);

        userLogger.info({
            type: "LOGIN_SUCCESS",
            userId: user.UserId,
            ip: req.ip
        });

        return res.json({
            success: true,
            token,
            refreshToken
        });

    } catch (error: any) {
        userLogger.error({
            type: "LOGIN_ERROR",
            message: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};




export const refreshToken = (req: Request, res: Response) => {

    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: "Refresh token required"
        });
    }

    try {
        const decoded: any = verifyToken(refreshToken);

        const newAccessToken = generateToken({
            userId: decoded.userId,
            username: decoded.username
        });

        return res.json({
            success: true,
            token: newAccessToken
        });

    } catch (err) {
        return res.status(403).json({
            success: false,
            message: "Invalid or expired refresh token"
        });
    }
};