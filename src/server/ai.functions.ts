import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(messages: Array<{ role: string; content: any }>, opts: { tools?: any; tool_choice?: any; model?: string } = {}) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const body: any = {
    model: opts.model || "google/gemini-3-flash-preview",
    messages,
  };
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    const text = await res.text();
    throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const conversationTool = {
  type: "function",
  function: {
    name: "analyze_conversation",
    description: "Analyze the live conversation and provide social-translation guidance.",
    parameters: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          enum: ["happy", "neutral", "curious", "confused", "frustrated", "sad", "excited", "sincere", "sarcastic"],
          description: "Detected mood of the OTHER person speaking",
        },
        moodReason: { type: "string", description: "One short sentence explaining the mood signal." },
        topic: { type: "string", description: "Current main topic in 3-6 words." },
        offTopic: { type: "boolean", description: "True if the conversation drifted off the main topic." },
        suggestions: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          items: { type: "string" },
          description: "3-4 short, kind, natural things the user could say next.",
        },
        tip: { type: "string", description: "One brief social-cue tip (tone, pacing, or hidden meaning)." },
      },
      required: ["mood", "moodReason", "topic", "offTopic", "suggestions", "tip"],
      additionalProperties: false,
    },
  },
};

export const analyzeConversation = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string }) => d)
  .handler(async ({ data }) => {
    const transcript = (data.transcript || "").slice(-2000);
    if (!transcript.trim()) {
      return {
        mood: "neutral",
        moodReason: "Waiting for conversation to begin.",
        topic: "Just getting started",
        offTopic: false,
        suggestions: ["Hi! How are you today?", "It's nice to talk with you.", "What would you like to chat about?"],
        tip: "Take a slow breath. You've got this.",
      };
    }

    const result = await callAI(
      [
        {
          role: "system",
          content:
            "You are SocialSync — a kind social translator helping a person on the autism spectrum during a live video call. Analyze the recent conversation transcript. The user is the AUTISTIC speaker; the OTHER person is the conversation partner. Always be warm, simple, and concrete. Never patronize. Suggestions must be short (under 12 words), natural, and easy to say.",
        },
        { role: "user", content: `Recent transcript (most recent at bottom):\n\n${transcript}\n\nAnalyze and respond via the tool.` },
      ],
      { tools: [conversationTool], tool_choice: { type: "function", function: { name: "analyze_conversation" } } }
    );

    const call = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return analysis");
    return JSON.parse(call.function.arguments);
  });

const screenshotTool = {
  type: "function",
  function: {
    name: "analyze_chat_screenshot",
    description: "Read a chat screenshot and help the autistic user understand and reply.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "What the chat is about, in plain English." },
        summary: { type: "string", description: "2-3 sentence plain-language summary of what's happening." },
        otherMood: {
          type: "string",
          enum: ["happy", "neutral", "curious", "confused", "frustrated", "sad", "excited", "sincere", "sarcastic", "unclear"],
        },
        hiddenMeaning: { type: "string", description: "Any subtext, sarcasm, jokes, or implied meaning the user might miss. Say 'No hidden meaning detected.' if none." },
        suggestions: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "What to send (under 20 words)." },
              tone: { type: "string", enum: ["friendly", "polite", "enthusiastic", "neutral", "supportive", "curious"] },
            },
            required: ["text", "tone"],
            additionalProperties: false,
          },
        },
        warning: { type: "string", description: "A gentle warning if the message seems unsafe, urgent, or emotional. Empty string if none." },
      },
      required: ["topic", "summary", "otherMood", "hiddenMeaning", "suggestions", "warning"],
      additionalProperties: false,
    },
  },
};

export const analyzeScreenshot = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string }) => d)
  .handler(async ({ data }) => {
    if (!data.imageBase64) throw new Error("No image provided");

    const result = await callAI(
      [
        {
          role: "system",
          content:
            "You are SocialSync — reading a chat screenshot for an autistic user. Be kind, concrete, and clear. Decode tone, sarcasm, jokes, and unspoken expectations. Suggest replies that feel natural for the user to send.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this chat screenshot and help me understand what's happening and what I could reply." },
            { type: "image_url", image_url: { url: data.imageBase64 } },
          ],
        },
      ],
      { tools: [screenshotTool], tool_choice: { type: "function", function: { name: "analyze_chat_screenshot" } }, model: "google/gemini-2.5-flash" }
    );

    const call = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return analysis");
    return JSON.parse(call.function.arguments);
  });
