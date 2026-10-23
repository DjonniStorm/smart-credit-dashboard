export const cookieName = "alfa_demo_session";
export const employeeCookieName = "alfa_employee_session";

export interface RequestLike {
  headers: { cookie?: string };
}

export function readCookie(
  request: RequestLike,
  name: string,
): string | undefined {
  const header = request.headers.cookie ?? "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
