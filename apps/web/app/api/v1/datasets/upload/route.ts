import { jsonResponse, optionsResponse } from "@/server/http";
import { woodwideClient } from "@/server/services/woodwide-client";

export const runtime = "nodejs";

interface UploadDatasetBody {
  name: string;
  data: string;
  overwrite?: boolean;
}

export async function POST(request: Request) {
  const methods = ["POST", "OPTIONS"];
  let body: UploadDatasetBody;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Invalid JSON body" }, { status: 400 }, methods);
  }

  const { name, data, overwrite = false } = body ?? {};
  if (!name || !data) {
    return jsonResponse(
      request,
      { error: "Missing required fields: name and data are required" },
      { status: 400 },
      methods
    );
  }

  try {
    const result = await woodwideClient.uploadDataset(name, data, overwrite);
    return jsonResponse(
      request,
      {
        success: true,
        datasetId: result.datasetId,
        datasetName: result.datasetName,
        rowCount: result.rowCount,
        columns: result.columns,
      },
      undefined,
      methods
    );
  } catch (error) {
    console.error("[API] Dataset upload failed:", error);
    return jsonResponse(
      request,
      {
        error: "Failed to upload dataset",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
      methods
    );
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request, ["POST", "OPTIONS"]);
}
