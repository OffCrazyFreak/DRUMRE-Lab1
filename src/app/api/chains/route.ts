import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
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

    // Fetch chains from cijene.dev API
    const response = await axios.get(`${apiUrl}/v1/chains/`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    return NextResponse.json({
      success: true,
      chains: response.data.chains || [],
    });
  } catch (error) {
    console.error("Error fetching chains:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.detail || "Failed to fetch chains data",
          status: error.response?.status,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch chains data",
      },
      { status: 500 }
    );
  }
}
