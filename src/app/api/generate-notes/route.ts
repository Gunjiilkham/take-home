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
        
        // Create a prompt for the OpenAI model
        const prompt = ` 
        You are an expert software developer and technical writer who specializes in creating dual-tone release notes.
        Given the following git diff from a pull request titled "${prTitle || 'Unititled PR'}" (PR #${prId || 'Unknown'}),
        generate two types of release notes:

        1. DEVELOPER NOTES: Concise, technical explanation focusing on what changed and why.
           Include specific file names, functions, or methods that were modified when relevant.
           Focus on implementation details that would be valuable to other developers.

        2. MARKETING NOTES: User-centric explanation highlighting the benefits of this change.
           Use simpler language and focus on how this improves the product for end users.
           Avoid technical jargon and focus on value delivered.

        Additionally, please identify:
        - Key contributors involved in this change (if you can find any in the diff)
        - Related issues or PRs mentioned in the diff or title

        Respond in the following format:
        DEVELOPER_NOTES: [Your technical notes here]
        MARKETING_NOTES: [Your user-centric notes here]

        Here is the git diff:
        \`\`\`
        ${diff}
        \`\`\`
        `;

        // Create a streaming response from OpenAI
        const stream = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini', 
            messages: [
                {role: 'system', content: 'You are a helpful assistant that generates release notes from git diffs.' },
                {role: 'user', content: prompt }
            ],
            stream: true,
        });

        // Set up streaming response
        const encoder = new TextEncoder();
        const customReadable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                }
                
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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