import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import type { SharedNoteDto } from "../types";

type State =
  | { status: "loading" }
  | { status: "found"; note: SharedNoteDto }
  | { status: "not-found" };

export function SharedNotePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!token) return;
    apiClient
      .get<SharedNoteDto>(`/share/${token}`)
      .then((data) => setState({ status: "found", note: data }))
      .catch(() => setState({ status: "not-found" }));
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <p className="text-text-secondary">Cargando nota...</p>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <p className="text-text-secondary">Nota no encontrada o enlace expirado.</p>
      </div>
    );
  }

  const { note } = state;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">{note.title}</h1>
        <div
          className="prose prose-sm max-w-none text-text-primary"
          // eslint-disable-next-line react-doctor/no-danger -- note.content is sanitized server-side with HtmlSanitizer before storage
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </div>
    </div>
  );
}
