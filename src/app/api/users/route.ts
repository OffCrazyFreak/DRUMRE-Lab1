import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export async function GET() {
  try {
    // Get session from headers
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = client.db(process.env.MONGODB_DB);
    const users = await db.collection("user").find({}).toArray();

    // Convert _id to id if needed and convert any stored imageBlob to a data URL
    const formattedUsers = users.map((user) => {
      let image = user.image;

      // If an image blob is stored, convert it to a base64 data URL for the client
      if (!image && user.imageBlob) {
        try {
          const base64Image = `data:image/png;base64,${user.imageBlob.buffer.toString(
            "base64"
          )}`;
          image = base64Image;
        } catch (e) {
          console.error(
            "Failed to convert imageBlob to base64 for user",
            user._id,
            e
          );
        }
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get session from headers
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids }: { ids: string[] } = await req.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    const db = client.db(process.env.MONGODB_DB);

    // Convert ids to ObjectIds
    const objectIds = ids.map((id) => new ObjectId(id));

    const result = await db.collection("user").deleteMany({
      _id: { $in: objectIds },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    return NextResponse.json(
      { error: "Failed to delete users" },
      { status: 500 }
    );
  }
}
