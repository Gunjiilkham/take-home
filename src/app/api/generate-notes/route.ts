import {OpenAI} from 'openai';
import {NextResponse} from 'next/server';

// Initialize OpenAI client
const openai = new OpenAI ({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge'; // Use edge runtime for streaming

export async function POST(request: Request) {
    try {
        const { diff, prTitle, prId } = await request.json();

        if (!diff) {
            return NextResponse.json({ error: 'Missing diff content' }, {status: 400});
        }

        const prompt = `

        
        `;

        // Create a streaming repsonse from OpenAI
        const stream = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini', 
            messages: [
                {role: 'system', content: 'You are a helpful assistant that generates release notes from git diffs.' },
            ],
            stream: true,
        });

        // Set up streaming response
        const encoder = new TextEncoder();
        const customReadable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if(content) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content})}\n\n`));
                    }
                }
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
            },
        });

        return new Response(customReadable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Error generating notes:', error);
        return NextResponse.json(
            {error: 'Failed to generate notes', details: (error as Error).message },
            { status: 500}
        );
    }
}