import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

let loggerProvider: LoggerProvider | null = null;

function requiredPostHogEnv(name: "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN" | "NEXT_PUBLIC_POSTHOG_HOST") {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === "development") {
    throw new Error(
      `${name} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${name} is configured`,
    );
  }

  return null;
}

// This provider is intentionally isolated rather than global: only the
// purpose-written PostHog logger in src/lib/posthogLogs.ts can export records.
export function getPostHogLoggerProvider() {
  if (loggerProvider) return loggerProvider;

  const token = requiredPostHogEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN");
  const host = requiredPostHogEnv("NEXT_PUBLIC_POSTHOG_HOST");
  if (!token || !host) return null;

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": "thursday-ball" }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host.replace(/\/$/, "")}/i/v1/logs`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  });

  return loggerProvider;
}

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    getPostHogLoggerProvider();
  }
}
