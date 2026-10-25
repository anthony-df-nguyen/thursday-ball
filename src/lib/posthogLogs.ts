import { SeverityNumber } from "@opentelemetry/api-logs";
import { after } from "next/server";
import { getPostHogLoggerProvider } from "../../instrumentation";

const loggerName = "thursday-ball.posthog";

export function logPostHogServerAction(
  body: string,
  attributes: Record<string, string>,
) {
  const loggerProvider = getPostHogLoggerProvider();
  if (!loggerProvider) return;

  loggerProvider.getLogger(loggerName).emit({
    body,
    severityNumber: SeverityNumber.INFO,
    attributes,
  });

  // Server actions can finish before the batch processor exports the record.
  after(async () => {
    await loggerProvider.forceFlush();
  });
}
