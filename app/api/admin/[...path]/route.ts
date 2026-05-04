import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8081";

type AdminRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyAdminRequest(
  request: NextRequest,
  context: AdminRouteContext,
) {
  const { path } = await context.params;
  const endpoint = `${API_BASE_URL}/admin/${path.join("/")}${request.nextUrl.search}`;
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  try {
    const response = await fetch(endpoint, {
      method: request.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to connect to the admin server. Please make sure the backend is running on http://localhost:8081.",
      },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest, context: AdminRouteContext) {
  return proxyAdminRequest(request, context);
}

export async function POST(request: NextRequest, context: AdminRouteContext) {
  return proxyAdminRequest(request, context);
}

export async function PUT(request: NextRequest, context: AdminRouteContext) {
  return proxyAdminRequest(request, context);
}

export async function DELETE(request: NextRequest, context: AdminRouteContext) {
  return proxyAdminRequest(request, context);
}
