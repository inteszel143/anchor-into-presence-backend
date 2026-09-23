import { NextResponse } from "next/server";

type ApiErrorOptions = {
  status?: number;
  message?: string;
};

export function apiErrorResponse(
  error: unknown,
  options: ApiErrorOptions = {}
) {
  const message =
    options.message ??
    (error instanceof Error ? error.message : "Internal server error");

  return NextResponse.json(
    { message, status: false },
    { status: options.status ?? 500 }
  );
}
