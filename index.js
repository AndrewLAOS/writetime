const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Helper to safely extract JSON array from AI output
function extractJSON(text) {
  const match = text.match(/\[.*\]/s); // match first [...] block including newlines
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

async function handleCompetitionsRequest(request, env) {
  const url = new URL(request.url);
  const prefs = url.searchParams.get("prefs") || "general writing";

  const prompt = `
IMPORTANT: Respond **only** with a valid JSON array, no extra text.

Extract writing competitions for this user input:
"${prefs}"

Return a JSON array with the following fields:
- title
- description
- url
- age_group (if known)
- genre (if known)
`;

  try {
    const aiResponse = await env.AI.run(
      MODEL_ID,
      {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      },
      { returnRawResponse: true }
    );

    const outputText = aiResponse?.output_text || "";

    const competitions = extractJSON(outputText) || [
      { 
        title: "AI output could not be parsed", 
        description: outputText, 
        url: "#" 
      }
    ];

    return new Response(JSON.stringify(competitions, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.toString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve frontend
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // AI competitions endpoint
    if (url.pathname === "/api/competitions") {
      if (request.method === "GET") {
        return handleCompetitionsRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  }
};
