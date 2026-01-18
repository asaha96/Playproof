import { NextResponse } from "next/server";
import { appConfig } from "@/server/config";

const ALLOWED_HEADERS = ["Content-Type", "Authorization"];

const normalizeOrigins = (origins: string[]) =>
  origins.map((origin) => origin.trim()).filter(Boolean);

const allowedOrigins = new Set(normalizeOrigins(appConfig.corsOrigins));

const resolveCorsOrigin = (request: Request): string => {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return allowedOrigins.values().next().value ?? "*";
  }

  if (allowedOrigins.has("*")) {
    return "*";
  }

  return allowedOrigins.has(requestOrigin) ? requestOrigin : (allowedOrigins.values().next().value ?? "null");
};

const withCors = (request: Request, methods: string[]): Headers => {
  const headers = new Headers();
  const origin = resolveCorsOrigin(request);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", methods.join(", "));
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
  if (origin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
};

export const jsonResponse = <T>(
  request: Request,
  data: T,
  init?: ResponseInit,
  methods: string[] = ["GET", "POST", "OPTIONS"]
) => {
  const headers = withCors(request, methods);
  if (init?.headers) {
    const extraHeaders = new Headers(init.headers);
    extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return NextResponse.json(data, { ...init, headers });
};

export const optionsResponse = (request: Request, methods: string[]) => {
  return new NextResponse(null, {
    status: 204,
    headers: withCors(request, methods),
  });
};
