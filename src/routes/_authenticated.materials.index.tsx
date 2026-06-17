import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { processMaterial } from "@/lib/ai.functions";
import { extractPdfText } from "@/lib/pdf";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { StatusPill } from "./_authenticated.index";

export const Route = createFileRoute("/_authenticated/materials/")({
  component: MaterialsPage,
  head: () => ({ meta: [{ title: "Materials — Arcane" }] }),
});

function MaterialsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const process = useServerFn(processMaterial);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const { data: materials } = useQuery({
    queryKey: ["materials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, status, created_at, error_message")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  async function handleUpload(file: File) {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF must be under 20 MB");
      return;
    }
    setUploading(true);
    setProgress("Reading PDF…");

    try {
      const text = await extractPdfText(file);
      if (text.length < 100) {
        throw new Error("Could not extract text from this PDF. Try a different file.");
      }

      setProgress("Uploading…");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("study-pdfs").upload(path, file, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;

      const title = file.name.replace(/\.pdf$/i, "").slice(0, 120);
      const { data: mat, error: insErr } = await supabase
        .from("materials")
        .insert({ user_id: user.id, title, pdf_path: path, status: "pending" })
        .select("id")
        .single();
      if (insErr) throw insErr;

      qc.invalidateQueries({ queryKey: ["materials"] });

      setProgress("Generating flashcards & quiz…");
      await process({ data: { materialId: mat.id, text: text.slice(0, 60000) } });

      toast.success("Material ready!");
      qc.invalidateQueries({ queryKey: ["materials"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this material and all its cards?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["materials"] });
    }
  }

  return (
    <div className="p-12 max-w-6xl">
      <header className="mb-10">
        <h1 className="font-serif text-4xl font-medium mb-2">Materials</h1>
        <p className="text-ink/60">Upload a PDF — Arcane writes the flashcards and quiz.</p>
      </header>

      <UploadDropzone uploading={uploading} progress={progress} onFile={handleUpload} />

      <div className="mt-12">
        <h2 className="font-serif text-2xl mb-6">Your library</h2>
        {!materials?.length ? (
          <p className="text-ink/40 text-sm">Nothing here yet.</p>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m.id} className="bg-white border border-ink/5 rounded-2xl p-5 flex items-center gap-4 hover:border-moss/30 transition-colors">
                <FileText className="size-5 text-moss shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-serif text-lg truncate">{m.title}</h3>
                    <StatusPill status={m.status} />
                  </div>
                  <p className="text-xs text-ink/40">
                    {new Date(m.created_at).toLocaleString()}
                    {m.error_message ? ` • ${m.error_message}` : ""}
                  </p>
                </div>
                {m.status === "ready" && (
                  <Link to="/materials/$id" params={{ id: m.id }} className="px-4 py-2 bg-moss text-cream rounded-full text-xs font-medium hover:bg-sage transition-colors">
                    Open
                  </Link>
                )}
                <button onClick={() => remove(m.id)} className="p-2 text-ink/30 hover:text-rose-600 transition-colors">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadDropzone({
  uploading, progress, onFile,
}: { uploading: boolean; progress: string; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type === "application/pdf") onFile(f);
      }}
      className={`block rounded-3xl border-2 border-dashed p-14 text-center transition-all cursor-pointer ${
        drag ? "border-moss bg-sand/60" : "border-ink/15 bg-sand/20 hover:border-moss/50"
      } ${uploading ? "pointer-events-none opacity-80" : ""}`}
    >
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-moss animate-spin" />
          <p className="font-serif text-xl">{progress || "Working…"}</p>
          <p className="text-xs text-ink/50">This usually takes 15–30 seconds.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-full bg-moss/10 flex items-center justify-center">
            <Upload className="size-5 text-moss" />
          </div>
          <p className="font-serif text-xl">Drop a PDF here, or click to choose</p>
          <p className="text-xs text-ink/50">Lecture notes, textbook chapters, papers — up to 20 MB</p>
        </div>
      )}
    </label>
  );
}
