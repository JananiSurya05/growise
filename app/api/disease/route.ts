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
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert plant pathologist helping Indian farmers. When given a description of a plant problem, identify the most likely disease or issue and provide: 1) Disease name 2) Cause 3) Symptoms to look for 4) Treatment using locally available products 5) Prevention tips. Keep it practical and simple."
                    },
                    {
                        role: "user",
                        content: `A farmer has uploaded a photo of their plant that appears to have some disease or problem. Based on common plant diseases in Tamil Nadu, India, please provide a detailed diagnosis and treatment plan. Assume the photo shows visible symptoms like discoloration, spots, wilting, or pest damage. Give a realistic and helpful response as if you can see the plant.`
                    }
                ],
                max_tokens: 1024,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ result: "Error: " + JSON.stringify(data) });
        }

        const result = data.choices[0].message.content;
        return NextResponse.json({ result });

    } catch (error) {
        return NextResponse.json({ result: "Error: " + error });
    }
}