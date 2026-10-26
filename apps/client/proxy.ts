import { NextRequest, NextResponse } from "next/server";

// Метрики API не должны быть доступны через публичный домен.
const internalApiPath = /^\/api\/metrics(\/|$)/;

export function proxy(request: NextRequest) {
  if (internalApiPath.test(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  // Задел: когда появится cookie сессии, прокинуть её в Authorization для Nest.
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
