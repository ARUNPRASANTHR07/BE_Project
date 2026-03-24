import * as sql from "mssql";
import poolPromise from "../db";

export const executeProcessJson = async (
    servicename: string,
    JsonValue: any
) => {

    const pool = await poolPromise;
    const request = pool.request();

    request.input("servicename", servicename);

    if (JsonValue && typeof JsonValue === "object") {
        request.input("JsonValue", sql.NVarChar(sql.MAX), JSON.stringify(JsonValue));
    } else {
        request.input("JsonValue", sql.NVarChar(sql.MAX), JsonValue);
    }

    const result = await request.execute("ProcessJsonInput");

    return result;
};
