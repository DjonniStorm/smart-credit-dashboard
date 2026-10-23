import { NextResponse } from "next/server";

export function proxy() {
  // Задел: когда появится cookie сессии, прокинуть её в Authorization для Nest.
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
