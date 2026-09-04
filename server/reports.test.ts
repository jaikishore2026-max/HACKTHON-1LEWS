import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

function createMockContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("Incident Reports Database and Auth Flow", () => {
  it("rejects unauthenticated users trying to submit a report", async () => {
    const unauthedCtx = createMockContext(null);
    const caller = appRouter.createCaller(unauthedCtx);

    await expect(
      caller.reports.create({
        category: "SLOPE CRACK",
        severity: "HIGH",
        description: "Fresh tension crack visible above village road",
        latitude: 12.3375,
        longitude: 75.8069,
      })
    ).rejects.toThrow();
  });

  it("allows authenticated user to create report and stores temporary active record in DB", async () => {
    const authUser = {
      id: 42,
      openId: "google_responder_123",
      email: "responder@district.gov.in",
      name: "Field Officer Arjun",
      loginMethod: "google",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const authedCtx = createMockContext(authUser);
    const caller = appRouter.createCaller(authedCtx);

    const result = await caller.reports.create({
      category: "BLOCKED ROAD",
      severity: "CRITICAL",
      description: "Massive debris flow across NH 275 near Madikeri",
      latitude: 12.42,
      longitude: 75.73,
      attachmentName: "landslide_debris.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.report.reportId).toMatch(/^LANDSORA-2026-\d{4}$/);
    expect(result.report.reporterName).toBe("Field Officer Arjun");
    expect(result.report.status).toBe("ACTIVE");

    // Check expiration is approximately 24 hours in the future
    const createdAtTime = new Date(result.report.createdAt).getTime();
    const expiresAtTime = new Date(result.report.expiresAt).getTime();
    expect(expiresAtTime - createdAtTime).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);

    // Verify it appears in active list
    const activeReports = await caller.reports.listActive();
    const found = activeReports.find((r) => r.reportId === result.report.reportId);
    expect(found).toBeDefined();
    expect(found?.severity).toBe("CRITICAL");
    expect(found?.category).toBe("BLOCKED ROAD");
  });

  it("filters out resolved or expired reports from active listing", async () => {
    // Insert an expired record directly into db
    const expiredReport = await db.insertIncidentReport({
      reportId: `LANDSORA-EXPIRED-${Date.now()}`,
      userId: 99,
      reporterName: "Old Patrol",
      reporterEmail: "old@example.com",
      category: "FLOODING",
      severity: "LOW",
      description: "Minor puddle from yesterday",
      latitude: "12.30",
      longitude: "75.80",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
    });

    const activeReports = await db.getActiveIncidentReports();
    expect(activeReports.some((r) => r.reportId === expiredReport.reportId)).toBe(false);

    // Resolve an active report
    const activeReport = await db.insertIncidentReport({
      reportId: `LANDSORA-RESOLVABLE-${Date.now()}`,
      userId: 99,
      reporterName: "Patrol Officer",
      reporterEmail: "patrol@example.com",
      category: "SLOPE CRACK",
      severity: "MEDIUM",
      description: "Crack monitored and stabilized",
      latitude: "12.35",
      longitude: "75.85",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86400 * 1000),
    });

    // Should be active initially
    let currentActive = await db.getActiveIncidentReports();
    expect(currentActive.some((r) => r.reportId === activeReport.reportId)).toBe(true);

    // Resolve it
    await db.resolveIncidentReport(activeReport.reportId);

    // Should no longer be in active list
    currentActive = await db.getActiveIncidentReports();
    expect(currentActive.some((r) => r.reportId === activeReport.reportId)).toBe(false);
  });
});
