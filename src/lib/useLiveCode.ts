import { useCallback, useEffect, useRef } from "react";
import { activeStudent } from "./activeStudent";
import { supabase } from "./supabase";

type LivePayload = {
  module: string;
  detail?: string;
  code: string;
};

function snapshotOf(payload: LivePayload) {
  return `${payload.module}\u0000${payload.detail ?? ""}\u0000${payload.code}`;
}

/**
 * Publishes the current editor content for the teacher's live view.
 * Debounced so typing does not flood the network, with a slow heartbeat for
 * long typing bursts. Teachers never publish.
 */
export function useLiveCode(module: string, code: string, detail?: string) {
  const latestRef = useRef<LivePayload>({ module, code, detail });
  latestRef.current = { module, code, detail };
  const sentRef = useRef<string | null>(null);

  const publishLatest = useCallback(() => {
    const student = activeStudent.get();
    if (!student || student.isTeacher || !supabase) return;
    const payload = latestRef.current;
    const snapshot = snapshotOf(payload);
    if (snapshot === sentRef.current) return;
    sentRef.current = snapshot;
    void supabase
      .from("sharpie_live_code")
      .upsert(
        {
          login: student.login,
          module: payload.module,
          detail: payload.detail ?? null,
          code: payload.code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "login" },
      )
      .then(({ error }) => {
        // Allow the next tick to retry after a transient failure.
        if (error) sentRef.current = null;
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(publishLatest, 600);
    return () => window.clearTimeout(timer);
  }, [code, detail, module, publishLatest]);

  useEffect(() => {
    const interval = window.setInterval(publishLatest, 4000);
    return () => window.clearInterval(interval);
  }, [publishLatest]);

  useEffect(() => () => publishLatest(), [publishLatest]);
}
