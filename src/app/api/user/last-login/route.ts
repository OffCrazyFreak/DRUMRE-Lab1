import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(req: NextRequest) {
  try {
    // Get session from headers
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update last login timestamp
    const db = client.db(process.env.MONGODB_DB);

    // Build query - try both _id (as ObjectId) and id field
    const query = ObjectId.isValid(session.user.id)
      ? { _id: new ObjectId(session.user.id) }
      : { id: session.user.id };

    await db.collection("user").updateOne(query, {
      $set: {
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error updating last login:", error);
    return NextResponse.json(
      { error: "Failed to update last login" },
      { status: 500 }
    );
  }
}
