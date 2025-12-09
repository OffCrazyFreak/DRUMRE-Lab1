"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "@/lib/auth-client";
import { useUser } from "@/lib/user-context";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X, Link as LinkIcon } from "lucide-react";

const profileSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  imageUrl: z.url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditDialog({
  open,
  onOpenChange,
}: ProfileEditDialogProps) {
  const { data: session } = useSession();
  const { user: contextUser, updateUser } = useUser();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use context user if available, fall back to session user
  const user = contextUser || session?.user;

  // Track last login on mount
  useEffect(() => {
    if (user) {
      axios.post("/api/user/last-login").catch((error) => {
        console.error("Failed to update last login:", error);
      });
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.name || "",
      imageUrl: user?.image || "",
    },
  });

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (user && open) {
      reset({
        username: user.name || "",
        imageUrl: user.image || "",
      });
      setPreviewImage(user.image || null);
      setUploadedImage(null);
      // Detect if user has a blob image (starts with data:image)
      if (user.image && user.image.startsWith("data:image")) {
        setImageMode("upload");
        setUploadedImage(user.image);
      } else {
        setImageMode("url");
      }
    }
  }, [user, open, reset]);

  const imageUrl = watch("imageUrl");

  // Update preview when image URL changes
  const handleImageUrlChange = (url: string) => {
    setPreviewImage(url || null);
    setUploadedImage(null);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImage(base64String);
        setPreviewImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const payload: any = {
        username: data.username,
      };

      // Send image based on mode
      if (imageMode === "upload" && uploadedImage) {
        payload.imageBlob = uploadedImage;
      } else if (imageMode === "url" && data.imageUrl) {
        payload.imageUrl = data.imageUrl;
      }

      const response = await axios.patch("/api/user/profile", payload);
      return response.data;
    },
    onSuccess: (data) => {
      // Update the user context with the new data
      if (data.user) {
        updateUser(data.user);
      }
      onOpenChange(false);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.patch("/api/user/profile", {
        username: user?.name,
        deleteImage: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Update the user context
      if (data.user) {
        updateUser(data.user);
      }
      setPreviewImage(null);
      setUploadedImage(null);
      reset({
        username: user?.name || "",
        imageUrl: "",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleDeleteImage = () => {
    if (confirm("Are you sure you want to delete your profile picture?")) {
      deleteImageMutation.mutate();
    }
  };

  if (!user) {
    return null;
  }

  const currentImage = uploadedImage || previewImage || imageUrl || user.image;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be saved to your
            account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Profile Picture Preview */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={currentImage || ""}
                  alt={user.name || "User"}
                />
                <AvatarFallback className="text-2xl">
                  {user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {currentImage && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={handleDeleteImage}
                  disabled={deleteImageMutation.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          {/* Current Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Image Upload Options */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <Tabs
              value={imageMode}
              onValueChange={(v) => setImageMode(v as "url" | "upload")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-2">
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  {...register("imageUrl", {
                    onChange: (e) => handleImageUrlChange(e.target.value),
                  })}
                />
                {errors.imageUrl && (
                  <p className="text-sm text-red-500">
                    {errors.imageUrl.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your profile image
                </p>
              </TabsContent>

              <TabsContent value="upload" className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadedImage ? "Change Image" : "Choose Image"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Upload an image (max 5MB). Supported formats: JPG, PNG, GIF
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>

          {updateProfileMutation.isError && (
            <p className="text-sm text-red-500 text-center">
              Failed to update profile. Please try again.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
