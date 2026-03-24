import crypto from "crypto";

const algorithm = "aes-256-gcm";
if (!process.env.PAYLOAD_SECRET) {
    throw new Error("PAYLOAD_SECRET not defined");
}

const secretKey = Buffer.from(process.env.PAYLOAD_SECRET, "hex");

if (secretKey.length !== 32) {
    throw new Error("PAYLOAD_SECRET must be 32-byte hex");
}


const ivLength = 12; // Recommended for GCM
const authTagLength = 16;

export const encryptPayload = (payload: object): string => {
    const iv = crypto.randomBytes(ivLength);


    const cipher = crypto.createCipheriv(
        algorithm,
        secretKey,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: iv + authTag + encrypted
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString("base64");
};

export const decryptPayload = (encryptedData: string): any => {
    const data = Buffer.from(encryptedData, "base64");

    const iv = data.subarray(0, 12);
    const encryptedWithTag = data.subarray(12);

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        secretKey,
        iv
    );

    // Extract last 16 bytes as authTag
    const authTag = encryptedWithTag.subarray(encryptedWithTag.length - 16);
    const encryptedText = encryptedWithTag.subarray(0, encryptedWithTag.length - 16);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final()
    ]);

    return JSON.parse(decrypted.toString("utf8"));
};

export const decryptPayload_100 = (encryptedData: string): any => {
    const data = Buffer.from(encryptedData, "base64");

    const iv = data.subarray(0, ivLength);
    const authTag = data.subarray(ivLength, ivLength + authTagLength);
    const encryptedText = data.subarray(ivLength + authTagLength);

    const decipher = crypto.createDecipheriv(
        algorithm,
        secretKey,
        iv
    );


    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final()
    ]);

    return JSON.parse(decrypted.toString("utf8"));
};
