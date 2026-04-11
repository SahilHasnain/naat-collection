import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { join } from "path";

export const maxDuration = 1800;

function sse(message: unknown) {
  return `data: ${JSON.stringify(message)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { limit?: number | null; testMode?: boolean };
    const args: string[] = [];

    if (body.limit) args.push(`--limit=${body.limit}`);
    if (body.testMode) args.push("--test");

    const encoder = new TextEncoder();
    const repoRoot = join(process.cwd(), "..", "..");
    const scriptPath = join(repoRoot, "scripts", "utilities", "download-audio.js");

    const stream = new ReadableStream({
      start(controller) {
        const child = spawn(process.execPath, [scriptPath, ...args], {
          cwd: repoRoot,
          env: process.env,
        });

        const pushLine = (message: string) => {
          controller.enqueue(encoder.encode(sse({ type: "log", message })));
        };

        child.stdout.on("data", (data) => {
          for (const line of data.toString().split(/\r?\n/)) {
            if (line.trim()) pushLine(line);
          }
        });

        child.stderr.on("data", (data) => {
          for (const line of data.toString().split(/\r?\n/)) {
            if (line.trim()) pushLine(`[stderr] ${line}`);
          }
        });

        child.on("close", (code) => {
          controller.enqueue(encoder.encode(sse({ type: "complete", code: code ?? 0 })));
          controller.close();
        });

        child.on("error", (error) => {
          controller.enqueue(encoder.encode(sse({ type: "log", message: error.message })));
          controller.enqueue(encoder.encode(sse({ type: "complete", code: 1 })));
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to start audio batch" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
