import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { ingestTelemetryFromHardware, verifyTelemetryAuth, validatePhysicalBounds } from "../server/services/hardwareIngestService";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

// REST Hardware Telemetry Ingest Endpoint (for ESP32, Arduino, MicroPython, GSM/LoRa Gateways)
app.post("/api/telemetry/ingest", (req, res) => {
  try {
    // 1. Authenticate hardware sensor request
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const providedKey = (req.headers["x-sensor-key"] as string) || (req.headers["x-api-key"] as string) || bearerToken || req.body?.apiKey;

    if (!verifyTelemetryAuth(providedKey)) {
      return res.status(401).json({
        error: "Unauthorized: Invalid or missing hardware sensor security key (X-Sensor-Key header required)",
      });
    }

    const {
      nodeId,
      rainfallMm,
      soilMoisture,
      tiltDegrees,
      batteryVoltage,
      wifiRssiDbm,
      temperatureC,
      humidity,
    } = req.body;

    if (!nodeId || rainfallMm === undefined || soilMoisture === undefined || tiltDegrees === undefined) {
      return res.status(400).json({
        error: "Missing required telemetry fields: nodeId, rainfallMm, soilMoisture, tiltDegrees",
      });
    }

    // 2. Validate physical sensor bounds
    const boundsCheck = validatePhysicalBounds({
      nodeId: String(nodeId),
      rainfallMm: Number(rainfallMm),
      soilMoisture: Number(soilMoisture),
      tiltDegrees: Number(tiltDegrees),
      batteryVoltage: batteryVoltage !== undefined ? Number(batteryVoltage) : undefined,
    });

    if (!boundsCheck.valid) {
      return res.status(422).json({
        error: `Unprocessable Entity: ${boundsCheck.reason}`,
      });
    }

    const result = ingestTelemetryFromHardware({
      nodeId: String(nodeId),
      rainfallMm: Number(rainfallMm),
      soilMoisture: Number(soilMoisture),
      tiltDegrees: Number(tiltDegrees),
      batteryVoltage: batteryVoltage !== undefined ? Number(batteryVoltage) : undefined,
      wifiRssiDbm: wifiRssiDbm !== undefined ? Number(wifiRssiDbm) : undefined,
      temperatureC: temperatureC !== undefined ? Number(temperatureC) : undefined,
      humidity: humidity !== undefined ? Number(humidity) : undefined,
      apiKey: providedKey ? String(providedKey) : undefined,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Telemetry ingestion error" });
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
