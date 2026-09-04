import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  incidentReports,
  type IncidentReport,
  type InsertIncidentReport,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// In-memory active store fallback when MySQL connection is unavailable
const memoryReports: IncidentReport[] = [];
let memIdSequence = 1;

/**
 * Inserts a verified incident report into MySQL or the in-memory active store.
 * Records are timestamped with an expiration date for temporary active retention.
 */
export async function insertIncidentReport(report: InsertIncidentReport): Promise<IncidentReport> {
  const db = await getDb();
  if (db) {
    try {
      await db.insert(incidentReports).values(report);
      const rows = await db
        .select()
        .from(incidentReports)
        .where(eq(incidentReports.reportId, report.reportId))
        .limit(1);
      if (rows.length > 0) return rows[0];
    } catch (error) {
      console.warn("[Database] Failed to insert incident report into MySQL, falling back to memory store:", error);
    }
  }

  const record: IncidentReport = {
    id: memIdSequence++,
    reportId: report.reportId,
    userId: report.userId ?? null,
    reporterName: report.reporterName,
    reporterEmail: report.reporterEmail ?? null,
    category: report.category,
    severity: report.severity,
    description: report.description,
    latitude: report.latitude,
    longitude: report.longitude,
    attachmentName: report.attachmentName ?? null,
    status: report.status ?? "ACTIVE",
    expiresAt: report.expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryReports.unshift(record);
  return record;
}

/**
 * Retrieves all currently active and non-expired incident reports from the database.
 * Expired reports (beyond the temporary active window) are automatically excluded.
 */
export async function getActiveIncidentReports(): Promise<IncidentReport[]> {
  const now = new Date();
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(incidentReports)
        .where(and(eq(incidentReports.status, "ACTIVE"), gt(incidentReports.expiresAt, now)))
        .orderBy(desc(incidentReports.createdAt));
      return rows;
    } catch (error) {
      console.warn("[Database] Failed to get active reports from MySQL, using memory store:", error);
    }
  }

  return memoryReports.filter(
    (r) => r.status === "ACTIVE" && new Date(r.expiresAt).getTime() > now.getTime()
  );
}

/**
 * Resolves an active incident report by ID in MySQL or the memory store.
 */
export async function resolveIncidentReport(reportId: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    try {
      await db
        .update(incidentReports)
        .set({ status: "RESOLVED", updatedAt: new Date() })
        .where(eq(incidentReports.reportId, reportId));
      return true;
    } catch (error) {
      console.warn("[Database] Failed to resolve incident report in MySQL:", error);
    }
  }

  const found = memoryReports.find((r) => r.reportId === reportId);
  if (found) {
    found.status = "RESOLVED";
    found.updatedAt = new Date();
    return true;
  }
  return false;
}

