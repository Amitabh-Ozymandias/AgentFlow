import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      systemPrompt,
      provider: reqProvider,
      model: reqModel,
      apiKey: reqApiKey,
      temperature = 0.7,
      maxTokens = 1024,
    } = body;

    const provider = (reqProvider || process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    const apiKey =
      reqApiKey ||
      (provider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : provider === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.OPENROUTER_API_KEY);

    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'your_groq_api_key_here' || apiKey === 'your_openrouter_api_key_here') {
      return NextResponse.json(
        {
          error: `Missing API key for provider "${provider}". Please set ${provider.toUpperCase()}_API_KEY in frontend/.env.local or enter your key in the app Settings.`,
        },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Call Provider APIs
    if (provider === 'gemini') {
      const model = reqModel || process.env.LLM_MODEL || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contentsPart: { text: string }[] = [{ text: prompt }];
      const payload: Record<string, unknown> = {
        contents: [{ parts: contentsPart }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      };

      if (systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Gemini API Error (${res.status}): ${errText}` }, { status: res.status });
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({
        text,
        model,
        provider: 'gemini',
        usage: data.usageMetadata || null,
      });
    }

    if (provider === 'groq' || provider === 'openrouter') {
      const isGroq = provider === 'groq';
      const defaultModel = isGroq ? 'llama-3.1-70b-versatile' : 'google/gemini-2.0-flash-exp:free';
      const model = reqModel || process.env.LLM_MODEL || defaultModel;
      const endpoint = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';

      const messages: { role: string; content: string }[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `${provider} API Error (${res.status}): ${errText}` }, { status: res.status });
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({
        text,
        model,
        provider,
        usage: data.usage || null,
      });
    }

    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
