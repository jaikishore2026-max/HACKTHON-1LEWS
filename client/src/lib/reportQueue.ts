export type LocalQueuedReport = {
  reportId: string;
  category: string;
  severity: string;
  description: string;
  location: { latitude: number; longitude: number };
  attachment: string | null;
  createdAt: string;
};

export const createQueuedReport = (input: Omit<LocalQueuedReport, "createdAt">, now = new Date()) => ({
  ...input,
  createdAt: now.toISOString(),
});

export const saveQueuedReport = (report: LocalQueuedReport, storage: Pick<Storage, "setItem"> = window.localStorage) => {
  storage.setItem("lews-report-queue", JSON.stringify(report));
  return report;
};

export const appendQueuedReport = (report: LocalQueuedReport, storage: Storage = window.localStorage) => {
  saveQueuedReport(report, storage);
  try {
    const listRaw = storage.getItem("lews-report-queue-list");
    const list: LocalQueuedReport[] = listRaw ? JSON.parse(listRaw) : [];
    const updated = [report, ...list.filter(r => r.reportId !== report.reportId)].slice(0, 50);
    storage.setItem("lews-report-queue-list", JSON.stringify(updated));
  } catch {}
  return report;
};

export const getQueuedReports = (storage: Pick<Storage, "getItem"> = window.localStorage): LocalQueuedReport[] => {
  try {
    const listRaw = storage.getItem("lews-report-queue-list");
    if (listRaw) return JSON.parse(listRaw);
    const singleRaw = storage.getItem("lews-report-queue");
    if (singleRaw) return [JSON.parse(singleRaw)];
  } catch {}
  return [];
};

export const clearQueuedReports = (storage: Pick<Storage, "removeItem"> = window.localStorage) => {
  try {
    storage.removeItem("lews-report-queue");
    storage.removeItem("lews-report-queue-list");
  } catch {}
};

export const exportReportsToGeoJson = (reports: LocalQueuedReport[]) => {
  return {
    type: "FeatureCollection" as const,
    metadata: {
      generatedAt: new Date().toISOString(),
      platform: "Landsora IoT LEWS",
      totalReports: reports.length,
    },
    features: reports.map(r => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [r.location.longitude, r.location.latitude],
      },
      properties: {
        reportId: r.reportId,
        category: r.category,
        severity: r.severity,
        description: r.description,
        attachment: r.attachment,
        createdAt: r.createdAt,
      },
    })),
  };
};
