import sql, { ConnectionPool } from "mssql";

const config = {
  user: "sa",
  password: "",
  server: "",
  database: "",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  requestTimeout: 100000, // ✅ Global timeout
  port: 1433,
};

const poolPromise: Promise<ConnectionPool> = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB Connection Failed:", err);
    throw err;
  });

export default poolPromise;
