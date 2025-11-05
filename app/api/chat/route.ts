interface Message {
  role: 'user' | 'model';
  text: string;
}

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const {
      messages,
      apiKey: reqApiKey,
      modelName: reqModelName,
    }: {
      messages: Message[];
      apiKey?: string;
      modelName?: string;
    } = await req.json();

    const apiKey = reqApiKey || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response('API key not configured', { status: 500 });
    }

    const modelName = reqModelName || 'gemini-2.5-flash-lite';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const formattedContents = messages.map((msg) => ({
      parts: [{ text: msg.text }],
      role: msg.role,
    }));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: formattedContents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API Error:', errorText);
      return new Response(`API Error: ${errorText}`, {
        status: response.status,
      });
    }

    if (!response.body) {
      return new Response('Empty API response', { status: 500 });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');

          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataString = line.substring(6);
              try {
                const data = JSON.parse(dataString);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(new TextEncoder().encode(text));
                }
              } catch {
                // Ignore incomplete JSON
              }
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}