import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();
        const key = process.env.GROQ_API_KEY;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: { url: image }
                            },
                            {
                                type: "text",
                                text: `You are an expert plant pathologist helping Indian farmers in Tamil Nadu.

First, check if this image shows a plant or crop. 

If it is NOT a plant (e.g. a person, animal, object, building, etc.), respond with exactly:
"❌ This doesn't appear to be a plant photo. Please upload a clear photo of your crop or plant leaves showing the problem."

If it IS a plant, analyze it and provide:
1. 🌿 Plant identified
2. 🦠 Disease/Issue detected
3. 📋 Cause
4. 💊 Treatment (using locally available products in India)
5. 🛡️ Prevention tips

Keep the response practical and helpful for Indian farmers.`
                            }
                        ]
                    }
                ],
                max_tokens: 1024,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ result: "Error analyzing image. Please try again." });
        }

        const result = data.choices[0].message.content;
        return NextResponse.json({ result });

    } catch (error) {
        return NextResponse.json({ result: "Error: " + error });
    }
}
