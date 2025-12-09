"use client";

import { columns, Store } from "./columns";
import { DataTable } from "./data-table";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

async function getStores(): Promise<Store[]> {
  const response = await fetch("/api/stores");
  if (!response.ok) {
    throw new Error("Failed to fetch stores");
  }
  const data = await response.json();
  return data.data || [];
}

export default function StoresPage() {
  const {
    data: stores = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stores"],
    queryFn: getStores,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading stores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center text-red-500">
          Error loading stores: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Stores <Badge variant="secondary">{stores.length}</Badge>
        </h1>
        <p className="text-muted-foreground">
          Manage all stores in the system.
        </p>
      </div>
      <DataTable columns={columns} data={stores} />
    </div>
  );
}
