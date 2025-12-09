import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MongoClient, Binary, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export async function PATCH(req: NextRequest) {
  try {
    // Get session from headers
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username, imageUrl, imageBlob, deleteImage } = body;

    // Connect to database
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    // Prepare update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (username !== undefined) {
      updateData.name = username;
    }

    // Handle image updates
    if (deleteImage) {
      // Delete both image URL and blob
      updateData.image = null;
      updateData.imageBlob = null;
    } else {
      // Priority: blob > URL
      if (imageBlob) {
        // Store image as binary blob
        const base64Data = imageBlob.split(",")[1] || imageBlob;
        const buffer = Buffer.from(base64Data, "base64");
        updateData.imageBlob = new Binary(buffer);
        updateData.image = null; // Clear URL when using blob
      } else if (imageUrl !== undefined) {
        updateData.image = imageUrl || null;
        updateData.imageBlob = null; // Clear blob when using URL
      }
    }

    // Build query - try both _id (as ObjectId) and id field
    const query = ObjectId.isValid(session.user.id)
      ? { _id: new ObjectId(session.user.id) }
      : { id: session.user.id };

    // Update user in MongoDB
    const result = await db.collection("user").updateOne(query, {
      $set: updateData,
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Fetch updated user
    const updatedUser = await db.collection("user").findOne(query);

    // Convert blob to base64 for client if it exists
    let userResponse = { ...updatedUser };
    if (updatedUser?.imageBlob) {
      const base64Image = `data:image/png;base64,${updatedUser.imageBlob.buffer.toString(
        "base64"
      )}`;
      userResponse = {
        ...updatedUser,
        image: base64Image,
        imageBlob: undefined, // Don't send raw blob to client
      };
    }

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user profile with image
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    // Build query - try both _id (as ObjectId) and id field
    const query = ObjectId.isValid(session.user.id)
      ? { _id: new ObjectId(session.user.id) }
      : { id: session.user.id };

    const user = await db.collection("user").findOne(query);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert blob to base64 if it exists
    let userResponse = { ...user };
    if (user.imageBlob) {
      const base64Image = `data:image/png;base64,${user.imageBlob.buffer.toString(
        "base64"
      )}`;
      userResponse = {
        ...user,
        image: base64Image,
        imageBlob: undefined,
      };
    }

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
