import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(_request: NextRequest) {
  // Задел: когда появится cookie сессии, прокинуть её в Authorization для Nest.
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
