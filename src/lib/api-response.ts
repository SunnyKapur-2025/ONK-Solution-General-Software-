import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function err(message: string, status: number = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function unauthorized() {
  return err("Unauthorized", 401);
}

export function forbidden(message: string = "Forbidden") {
  return err(message, 403);
}

export function notFound(message: string = "Not found") {
  return err(message, 404);
}

export function serverError(e: unknown) {
  const message =
    e instanceof Error ? e.message : typeof e === "string" ? e : "Internal server error";
  console.error("[serverError]", e);
  return err(message, 500);
}
