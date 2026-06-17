import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ScrollText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/materials/$id/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "Revision notes — Arcane" }] }),
});

function NotesPage() {
  const { id } = Route.useParams();

  const { data: material, isLoading } = useQuery({
    queryKey: ["material-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("title, notes")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-12 max-w-3xl">
      <Link
        to="/materials/$id"
        params={{ id }}
        className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-moss mb-8"
      >
        <ArrowLeft className="size-4" /> Back to material
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink/40 font-bold mb-3">
          <ScrollText className="size-3.5" /> Quick revision
        </div>
        <h1 className="font-serif text-4xl mb-2">{material?.title ?? "Notes"}</h1>
        <p className="text-ink/60 text-sm">
          Every key point from your material, distilled into scan-friendly bullets.
        </p>
      </header>

      {isLoading ? (
        <p className="text-ink/40 text-sm">Loading…</p>
      ) : !material?.notes?.length ? (
        <div className="bg-sand/40 border border-ink/5 rounded-2xl p-8 text-ink/60 text-sm">
          No notes were generated for this material. Try re-uploading the PDF.
        </div>
      ) : (
        <ol className="bg-white border border-ink/5 rounded-3xl p-8 space-y-4">
          {material.notes.map((n, i) => (
            <li key={i} className="flex gap-4">
              <span className="shrink-0 size-7 rounded-full bg-moss/10 text-moss flex items-center justify-center font-serif text-sm">
                {i + 1}
              </span>
              <p className="text-ink/85 leading-relaxed pt-0.5">{n}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
