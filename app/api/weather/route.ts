import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const key = process.env.OPENWEATHER_API_KEY;

    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city},IN&appid=${key}`
    );

    const data = await response.json();

    if (data.cod !== 200) {
        return NextResponse.json({ error: "City not found" });
    }

    return NextResponse.json(data);
}