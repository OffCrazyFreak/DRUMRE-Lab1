import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get("chain") || "konzum";

    const apiUrl = process.env.CIJENE_API_URL || "https://api.cijene.dev";
    const apiToken = process.env.CIJENE_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        {
          success: false,
          error: "API token not configured",
        },
        { status: 500 }
      );
    }

    // Fetch stores from cijene.dev API
    const response = await axios.get(`${apiUrl}/v1/${chain}/stores/`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: response.data.stores || [],
      chain: chain,
    });
  } catch (error) {
    console.error("Error fetching stores:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.detail || "Failed to fetch stores data",
          status: error.response?.status,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stores data",
      },
      { status: 500 }
    );
  }
}
