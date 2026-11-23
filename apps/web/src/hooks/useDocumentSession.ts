import { useState, useCallback, useEffect, useRef } from "react";
import type {
  EngineAdapter,
  OpenedDocument,
  P7MError,
  P7MInspectionReport,
} from "@zerop7m/shared-types";

export type SessionState =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "ready"; doc: OpenedDocument }
  | { status: "error"; error: P7MError; partialReport?: P7MInspectionReport };

export function useDocumentSession(adapter: EngineAdapter) {
  const [state, setState] = useState<SessionState>({ status: "idle" });
  const activeDocRef = useRef<OpenedDocument | null>(null);

  const cleanupCurrentDoc = useCallback(async () => {
    if (activeDocRef.current) {
      const doc = activeDocRef.current;
      activeDocRef.current = null;
      await doc.dispose();
    }
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      // Clean up previous document immediately before loading new one
      await cleanupCurrentDoc();

      setState({ status: "loading", fileName: file.name });

      try {
        const doc = await adapter.inspectFile(file);
        activeDocRef.current = doc;
        setState({ status: "ready", doc });
      } catch (err: unknown) {
        let p7mErr: P7MError;
        if (err && typeof err === "object" && "code" in err && "message" in err) {
          p7mErr = err as P7MError;
        } else {
          p7mErr = {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : String(err),
          };
        }
        setState({ status: "error", error: p7mErr });
      }
    },
    [adapter, cleanupCurrentDoc]
  );

  const openPath = useCallback(
    async (pathOrUri: string) => {
      if (!adapter.inspectPath) return;

      await cleanupCurrentDoc();

      const fileName = pathOrUri.split(/[\\/]/).pop() || pathOrUri;
      setState({ status: "loading", fileName });

      try {
        const doc = await adapter.inspectPath(pathOrUri);
        activeDocRef.current = doc;
        setState({ status: "ready", doc });
      } catch (err: unknown) {
        let p7mErr: P7MError;
        if (err && typeof err === "object" && "code" in err && "message" in err) {
          p7mErr = err as P7MError;
        } else {
          p7mErr = {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : String(err),
          };
        }
        setState({ status: "error", error: p7mErr });
      }
    },
    [adapter, cleanupCurrentDoc]
  );

  const closeDocument = useCallback(async () => {
    await cleanupCurrentDoc();
    setState({ status: "idle" });
  }, [cleanupCurrentDoc]);

  // Clean up on unmount or beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeDocRef.current) {
        void activeDocRef.current.dispose();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (activeDocRef.current) {
        void activeDocRef.current.dispose();
      }
    };
  }, []);

  return {
    state,
    openFile,
    openPath,
    closeDocument,
  };
}
