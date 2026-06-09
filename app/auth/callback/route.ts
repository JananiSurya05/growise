import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { origin } = new URL(request.url);
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/growise_pending_role=([^;]+)/);
    const role = match ? match[1] : "consumer";

    return NextResponse.redirect(new URL(`/${role}`, origin));
}