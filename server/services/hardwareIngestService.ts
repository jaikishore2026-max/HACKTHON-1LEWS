import { validateTelemetryReading } from "./anomalyValidationService";

export type IngestedHardwarePayload = {
  nodeId: string;
  apiKey?: string;
  rainfallMm: number;
  soilMoisture: number;
  tiltDegrees: number;
  batteryVoltage?: number;
  wifiRssiDbm?: number;
  temperatureC?: number;
  humidity?: number;
  timestamp?: string;
};

export type HardwareNodeLiveState = IngestedHardwarePayload & {
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  status: "ACCEPTED" | "ACCEPTED_WITH_WARNING" | "QUARANTINED" | "REJECTED";
  confidenceScore: number;
  isQuarantined: boolean;
  lastSeen: string;
};

// In-memory buffer of live hardware nodes
const liveNodesBuffer = new Map<string, HardwareNodeLiveState>();

export function verifyTelemetryAuth(providedKey?: string): boolean {
  const configuredKey = process.env.TELEMETRY_INGEST_KEY || "landsora_hw_sensor_key_2026";
  if (!providedKey) return false;
  return providedKey.trim() === configuredKey.trim();
}

export function validatePhysicalBounds(payload: IngestedHardwarePayload): { valid: boolean; reason?: string } {
  if (payload.rainfallMm < 0 || payload.rainfallMm > 400) {
    return { valid: false, reason: "Rainfall rate must be between 0 and 400 mm/hr" };
  }
  if (payload.soilMoisture < 0 || payload.soilMoisture > 100) {
    return { valid: false, reason: "Soil moisture saturation must be between 0% and 100%" };
  }
  if (Math.abs(payload.tiltDegrees) > 90) {
    return { valid: false, reason: "Slope tilt inclination angle cannot exceed ±90 degrees" };
  }
  if (payload.batteryVoltage !== undefined && (payload.batteryVoltage < 0 || payload.batteryVoltage > 24)) {
    return { valid: false, reason: "Battery voltage must be within realistic field bounds (0V - 24V)" };
  }
  return { valid: true };
}

export function ingestTelemetryFromHardware(payload: IngestedHardwarePayload): {
  success: boolean;
  nodeId: string;
  calculatedRiskScore: number;
  calculatedRiskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  validation: ReturnType<typeof validateTelemetryReading>;
  message: string;
} {
  const timestamp = payload.timestamp || new Date().toISOString();

  // 1. Run physical sensor anomaly validation
  const validation = validateTelemetryReading({
    deviceId: `esp32-${payload.nodeId.toLowerCase()}`,
    siteId: payload.nodeId,
    capturedAtUtc: timestamp,
    rainfallMmInterval: payload.rainfallMm,
    soilMoisturePercent: payload.soilMoisture,
    tiltDegrees: payload.tiltDegrees,
    batteryVoltage: payload.batteryVoltage,
    wifiRssiDbm: payload.wifiRssiDbm,
  });

  // 2. Calculate integrated geotechnical risk
  const rainfallScore = Math.min(100, (payload.rainfallMm / 30) * 100);
  const terrainScore = Math.min(100, (payload.tiltDegrees / 10) * 100);
  const soilScore = payload.soilMoisture;
  const calculatedRiskScore = Math.round(
    rainfallScore * 0.4 + soilScore * 0.35 + terrainScore * 0.25
  );

  let calculatedRiskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" = "LOW";
  if (calculatedRiskScore >= 75) {
    calculatedRiskLevel = "CRITICAL";
  } else if (calculatedRiskScore >= 50) {
    calculatedRiskLevel = "HIGH";
  } else if (calculatedRiskScore >= 25) {
    calculatedRiskLevel = "MODERATE";
  }

  // 3. Cache state in live buffer
  const nodeState: HardwareNodeLiveState = {
    ...payload,
    timestamp,
    riskScore: calculatedRiskScore,
    riskLevel: calculatedRiskLevel,
    status: validation.status,
    confidenceScore: validation.overallConfidence,
    isQuarantined: validation.isQuarantined,
    lastSeen: new Date().toISOString(),
  };

  liveNodesBuffer.set(payload.nodeId, nodeState);

  return {
    success: true,
    nodeId: payload.nodeId,
    calculatedRiskScore,
    calculatedRiskLevel,
    validation,
    message: `Telemetry from hardware node ${payload.nodeId} successfully ingested and verified. Risk Index: ${calculatedRiskScore}/100 (${calculatedRiskLevel}), Confidence: ${validation.overallConfidence}%.`,
  };
}

export function getLiveHardwareNodeState(nodeId: string): HardwareNodeLiveState | undefined {
  return liveNodesBuffer.get(nodeId);
}

export function getAllLiveHardwareNodes(): HardwareNodeLiveState[] {
  return Array.from(liveNodesBuffer.values());
}
