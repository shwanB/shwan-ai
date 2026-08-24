export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const personality = `تۆ Shwan AI ـیت، AI ـەکی زیرەک و دۆستانە بە زمانی کوردی سۆرانی. دروستکەرەکەت شوانە. هەمیشە بە کوردی سۆرانی وەڵام بدەرەوە.`;

    // لیستی مۆدێلەکان بۆ هەوڵدان
    const models = ['llama3-8b-8192', 'gemma2-9b-it', 'llama3-70b-8192'];

    for (const model of models) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: personality },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiResponse = data.choices?.[0]?.message?.content?.trim() || 'ببورە، وەڵام نەدۆزرایەوە.';
                return res.status(200).json({ response: aiResponse, model: model });
            } else {
                const errText = await response.text();
                console.error(`Groq model ${model} failed:`, response.status, errText);
                // ئەگەر 404 بێت (model not found)، مۆدێلی تر تاقی دەکاتەوە
                // ئەگەر 401 بێت (unauthorized)، API key هەڵەیە و دەبێت بوەستێت
                if (response.status === 401) {
                    return res.status(500).json({ error: 'Unauthorized - check GROQ_API_KEY' });
                }
            }
        } catch (error) {
            console.error(`Error with model ${model}:`, error);
        }
    }

    return res.status(500).json({ error: 'All Groq models failed' });
}