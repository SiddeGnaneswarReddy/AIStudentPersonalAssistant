import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  materialId: z.string().uuid(),
  text: z.string().min(50).max(80000),
});

const SYSTEM_PROMPT = `You are an expert tutor. Given study material, generate:
1. A "notes" array of 12-20 concise bullet points covering EVERY key concept, definition, formula, and important fact from the material. Each bullet is a single self-contained sentence — perfect for quick revision. Cover the material comprehensively in order.
2. 12 high-quality flashcards (front: question/concept, back: concise complete answer).
3. 10 multiple-choice quiz questions (MCQ), each with EXACTLY 4 options. Mark exactly ONE option as correct.
   For EVERY option (correct AND incorrect), include a short explanation (1-2 sentences) saying why it is correct or specifically why it is wrong.

Cover the most important, testable ideas from the material. Avoid trivial wording questions.

Return ONLY valid JSON matching this shape (no markdown, no commentary):
{
  "notes": ["bullet 1", "bullet 2"],
  "flashcards": [{"front": "...", "back": "..."}],
  "questions": [
    {
      "question": "...",
      "options": [
        {"text": "...", "is_correct": true, "explanation": "..."},
        {"text": "...", "is_correct": false, "explanation": "..."},
        {"text": "...", "is_correct": false, "explanation": "..."},
        {"text": "...", "is_correct": false, "explanation": "..."}
      ]
    }
  ]
}`;

export const processMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // verify ownership
    const { data: mat, error: matErr } = await supabase
      .from("materials").select("id, user_id").eq("id", data.materialId).single();
    if (matErr || !mat || mat.user_id !== userId) {
      throw new Error("Material not found");
    }

    const lovableKey = process.env.LOVABLE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!lovableKey && !groqKey) {
      throw new Error("AI is not configured (set LOVABLE_API_KEY or GROQ_API_KEY)");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `STUDY MATERIAL:\n\n${data.text}` },
    ];

    async function callLovable(): Promise<string> {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey! },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!res.ok) throw new Error(`Lovable AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      return json.choices?.[0]?.message?.content ?? "";
    }

    async function callGroq(): Promise<string> {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey!}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      return json.choices?.[0]?.message?.content ?? "";
    }

    const providers: Array<{ name: string; fn: () => Promise<string> }> = [];
    if (lovableKey) providers.push({ name: "lovable", fn: callLovable });
    if (groqKey) providers.push({ name: "groq", fn: callGroq });

    let parsed: any;
    let lastErr: any;
    for (const p of providers) {
      try {
        const content = await p.fn();
        parsed = JSON.parse(content);
        console.log(`AI succeeded via ${p.name}`);
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
        console.error(`AI provider ${p.name} failed:`, e?.message);
      }
    }
    if (!parsed) {
      const msg = lastErr?.message ?? "All AI providers failed";
      await supabase.from("materials").update({ status: "failed", error_message: msg.slice(0, 500) }).eq("id", data.materialId);
      throw new Error(msg);
    }

    const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.map((n: any) => String(n).slice(0, 600)).filter((n: string) => n.trim().length > 0)
      : [];

    if (flashcards.length === 0 || questions.length === 0) {
      await supabase.from("materials").update({ status: "failed", error_message: "AI returned no content" }).eq("id", data.materialId);
      throw new Error("AI returned no content. Try a clearer PDF.");
    }

    // Insert flashcards
    const fcRows = flashcards
      .filter((f: any) => f?.front && f?.back)
      .map((f: any) => ({
        material_id: data.materialId,
        user_id: userId,
        front: String(f.front).slice(0, 2000),
        back: String(f.back).slice(0, 4000),
      }));
    if (fcRows.length) {
      const { error } = await supabase.from("flashcards").insert(fcRows);
      if (error) throw error;
    }

    // Insert quiz questions
    const qRows = questions
      .filter((q: any) => q?.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q: any, i: number) => ({
        material_id: data.materialId,
        user_id: userId,
        question: String(q.question).slice(0, 2000),
        options: q.options.map((o: any) => ({
          text: String(o.text ?? "").slice(0, 1000),
          is_correct: Boolean(o.is_correct),
          explanation: String(o.explanation ?? "").slice(0, 2000),
        })),
        position: i,
      }));

    if (qRows.length) {
      const { error } = await supabase.from("quiz_questions").insert(qRows);
      if (error) throw error;
    }

    await supabase.from("materials").update({ status: "ready", error_message: null, notes }).eq("id", data.materialId);

    return { flashcards: fcRows.length, questions: qRows.length, notes: notes.length };
  });
