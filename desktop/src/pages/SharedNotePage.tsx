import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import type { SharedNoteDto } from "../types";

export function SharedNotePage() {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<SharedNoteDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiClient
      .get<SharedNoteDto>(`/share/${token}`)
      .then((data) => {
        setNote(data);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <p className="text-text-secondary">Cargando nota...</p>
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <p className="text-text-secondary">Nota no encontrada o enlace expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">{note.title}</h1>
        <div
          className="prose prose-sm max-w-none text-text-primary"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </div>
    </div>
  );
}
