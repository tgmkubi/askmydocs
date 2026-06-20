import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../config/env.ts"
import * as schema from "./schema.ts";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
