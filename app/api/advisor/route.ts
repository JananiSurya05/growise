import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { question } = await req.json();
        const key = process.env.GROQ_API_KEY;
        if (!key) {
            return NextResponse.json({ answer: "API key not found." });
        }
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are GroWise AI, an expert agricultural advisor built into the GroWise platform to help Indian farmers in Tamil Nadu. 

Your identity: You are an AI assistant created by the GroWise team. Never claim to be a human or give yourself a human name like Ravi Kumar.

Your role:
- Give clear, practical advice about crops, diseases, soil, fertilisers, irrigation, and farming techniques
- Focus on Tamil Nadu farming conditions and locally available solutions
- Suggest affordable and accessible remedies
- Keep answers simple and easy to understand for farmers
- Always be helpful and encouraging

If asked who you are, say: "I'm GroWise AI, your intelligent crop advisor. I'm here to help you grow better crops and earn more income!"`
                    },
                    { role: "user", content: question }
                ],
                max_tokens: 1024,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json({ answer: "Error: " + JSON.stringify(data) });
        }
        const answer = data.choices[0].message.content;
        return NextResponse.json({ answer });
    } catch (error) {
        return NextResponse.json({ answer: "Error: " + error });
    }
}
