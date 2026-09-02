import type { RunResult } from "../types";

type RuntimeMessage =
  | { type: "ready" }
  | { type: "startup-error"; message: string }
  | { type: "compiled"; requestId: string }
  | { type: "response"; requestId: string; result: Partial<RunResult> };

type PendingRequest = {
  resolve: (result: RunResult) => void;
  reject: (error: Error) => void;
  timer: number;
  abort?: () => void;
  signal?: AbortSignal;
};

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let rejectStartup: ((error: Error) => void) | null = null;
const pending = new Map<string, PendingRequest>();

function runtimeUrl() {
  return `${import.meta.env.BASE_URL}sharpie-runner.worker.js`;
}

function stopWorker(reason: Error, exceptRequest?: string) {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  rejectStartup = null;

  for (const [id, request] of pending) {
    if (id === exceptRequest) continue;
    window.clearTimeout(request.timer);
    if (request.abort && request.signal) request.signal.removeEventListener("abort", request.abort);
    request.reject(reason);
    pending.delete(id);
  }
}

function createWorker() {
  worker = new Worker(runtimeUrl(), { type: "module", name: "sharpie-csharp-runtime" });

  readyPromise = new Promise<void>((resolve, reject) => {
    rejectStartup = reject;
    const startupTimer = window.setTimeout(() => {
      const error = new Error("The in-browser C# engine took too long to load.");
      reject(error);
      stopWorker(error);
    }, 60_000);

    worker!.addEventListener("message", (event: MessageEvent<RuntimeMessage>) => {
      const message = event.data;

      if (message.type === "ready") {
        window.clearTimeout(startupTimer);
        rejectStartup = null;
        resolve();
        return;
      }

      if (message.type === "startup-error") {
        window.clearTimeout(startupTimer);
        const error = new Error(message.message || "The in-browser C# engine could not load.");
        reject(error);
        stopWorker(error);
        return;
      }

      if (message.type === "compiled") {
        const request = pending.get(message.requestId);
        if (!request) return;
        window.clearTimeout(request.timer);
        request.timer = window.setTimeout(() => {
          pending.delete(message.requestId);
          if (request.abort && request.signal) request.signal.removeEventListener("abort", request.abort);
          stopWorker(new Error("The program exceeded its time limit."), message.requestId);
          request.resolve({
            success: false,
            output: "",
            durationMs: 2_000,
            error: {
              title: "THAT TOOK TOO LONG",
              message: "This experiment kept running, so SHARPIE stopped it.",
              compiler: "Execution stopped after the two-second classroom limit.",
            },
          });
        }, 2_500);
        return;
      }

      if (message.type === "response") {
        const request = pending.get(message.requestId);
        if (!request) return;
        pending.delete(message.requestId);
        window.clearTimeout(request.timer);
        if (request.abort && request.signal) request.signal.removeEventListener("abort", request.abort);
        request.resolve({
          success: Boolean(message.result.success),
          output: message.result.output ?? "",
          durationMs: message.result.durationMs ?? 0,
          truncated: message.result.truncated,
          error: message.result.error,
        });
      }
    });

    worker!.addEventListener("error", (event) => {
      window.clearTimeout(startupTimer);
      const error = new Error(event.message || "The in-browser C# engine stopped unexpectedly.");
      rejectStartup?.(error);
      stopWorker(error);
    });
  });

  return readyPromise;
}

export function prepareCSharp() {
  return readyPromise ?? createWorker();
}

export async function executeCSharp(code: string, signal?: AbortSignal): Promise<RunResult> {
  await prepareCSharp();
  if (!worker) throw new Error("The in-browser C# engine is unavailable.");
  if (signal?.aborted) throw new DOMException("Run cancelled", "AbortError");

  const requestId = crypto.randomUUID();
  return new Promise<RunResult>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      const error = new Error("The browser compiler took too long to respond.");
      stopWorker(error, requestId);
      reject(error);
    }, 30_000);

    const request: PendingRequest = { resolve, reject, timer, signal };
    if (signal) {
      request.abort = () => {
        pending.delete(requestId);
        window.clearTimeout(request.timer);
        stopWorker(new DOMException("Run cancelled", "AbortError"), requestId);
        reject(new DOMException("Run cancelled", "AbortError"));
      };
      signal.addEventListener("abort", request.abort, { once: true });
    }

    pending.set(requestId, request);
    worker!.postMessage({ requestId, code });
  });
}
