import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not defined");
}
const SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

export const generateToken = (payload: object) =>
    jwt.sign(payload, SECRET, { expiresIn: "30s" });

export const generateRefreshToken = (payload: object) =>
    jwt.sign(payload, SECRET, { expiresIn: "1d" });

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET);

};


export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, REFRESH_SECRET);
};