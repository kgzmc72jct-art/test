// Fonction Supabase « lire-texte » : transcrit le texte d'une photo de page avec Claude.
// Secret requis (Supabase → Edge Functions → Secrets) : ANTHROPIC_API_KEY
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-5-5";

const PROMPT = `Cette photo montre une ou deux pages d'un livre (en général en français).
Transcris fidèlement le texte principal, dans l'ordre de lecture.
- Respecte exactement l'orthographe, la ponctuation, les accents et les guillemets du livre ; ne corrige ni ne modernise rien.
- Recolle les mots coupés par un trait d'union en fin de ligne et réunis les lignes d'un même paragraphe ; sépare les paragraphes par une ligne vide.
- Ignore les en-têtes et pieds de page courants, les numéros de page, et les bouts de texte coupés par le bord de la photo.
- Si un passage est souligné, surligné ou encadré, transcris uniquement ce passage.
- Si un mot est illisible, écris [illisible].
Indique aussi le numéro de page s'il est visible (sinon une chaîne vide).`;

const SCHEMA = {
  type: "object",
  properties: {
    texte: { type: "string", description: "Le texte transcrit" },
    page: { type: "string", description: "Numéro de page visible, ou chaîne vide" },
  },
  required: ["texte", "page"],
  additionalProperties: false,
};

// Clé publique du projet : nouvelles clés « publishable », ancienne clé « anon », ou celle envoyée par l'app
function publicKey(req: Request): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const key = keys["default"] ?? Object.values(keys)[0];
    if (typeof key === "string" && key) return key;
  } catch { /* variable absente ou invalide */ }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "";
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    return await handle(req);
  } catch (e) {
    // Toujours répondre avec les en-têtes CORS, sinon le navigateur masque l'erreur
    return json({ error: "Erreur : " + (e as Error).message }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  // Seul un utilisateur connecté à l'app peut utiliser la fonction (et donc votre crédit)
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, publicKey(req), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return json({ error: "Non connecté" }, 401);

  let image: string;
  try {
    ({ image } = await req.json());
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  if (typeof image !== "string" || image.length < 100 || image.length > 8_000_000) {
    return json({ error: "Image manquante ou trop grande" }, 400);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Secret ANTHROPIC_API_KEY manquant dans Supabase" }, 500);
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      // En cas de refus par erreur des filtres de sécurité, l'API réessaie avec le modèle recommandé
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: PROMPT },
        ],
      }],
    });

    if (response.stop_reason === "refusal") return json({ error: "La lecture de cette photo a été refusée." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "Texte trop long pour une seule photo." }, 422);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return json({ error: "Réponse vide" }, 502);
    const result = JSON.parse(textBlock.text);
    return json({ texte: result.texte ?? "", page: result.page ?? "" });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "Clé Anthropic invalide (secret ANTHROPIC_API_KEY)" }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Trop de demandes, réessayez dans un instant." }, 429);
    if (e instanceof Anthropic.APIError) {
      const msg = e.status === 400 && /credit|billing/i.test(e.message) ? "Crédit Anthropic épuisé" : e.message;
      return json({ error: msg }, 502);
    }
    return json({ error: "Erreur : " + (e as Error).message }, 500);
  }
}
