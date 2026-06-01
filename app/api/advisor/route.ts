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
                    { role: "system", content: "You are an expert agricultural advisor helping Indian farmers. Give clear, simple, practical advice about crops, diseases, soil, and farming. Keep answers easy to understand. Suggest locally available solutions when possible." },
                    { role: "user", content: question }
                ],
                max_tokens: 1024,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json({ answer: "Groq error: " + JSON.stringify(data) });
        }
        const answer = data.choices[0].message.content;
        return NextResponse.json({ answer });
    } catch (error) {
        return NextResponse.json({ answer: "Catch error: " + error });
    }
}