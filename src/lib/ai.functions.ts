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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    let parsed: any;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `STUDY MATERIAL:\n\n${data.text}` },
          ],
        }),
      });

      if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`AI request failed: ${res.status} ${t.slice(0, 200)}`);
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "";
      parsed = JSON.parse(content);
    } catch (e: any) {
      await supabase.from("materials").update({ status: "failed", error_message: e.message?.slice(0, 500) ?? "AI failed" }).eq("id", data.materialId);
      throw e;
    }

    const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

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

    await supabase.from("materials").update({ status: "ready", error_message: null }).eq("id", data.materialId);

    return { flashcards: fcRows.length, questions: qRows.length };
  });
