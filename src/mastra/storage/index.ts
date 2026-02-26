import { LibSQLStore } from "@mastra/libsql";
import { isDevelopment } from "@/lib/constants";

function getLibSQLStore() {
  if(isDevelopment) {
    return new LibSQLStore({
      id: "libsql-storage",
      url: "file:./db/mastra.db",
    });
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }
  return new LibSQLStore({
    id: "libsql-storage",
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}


export const storage = getLibSQLStore();

