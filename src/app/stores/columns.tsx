"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export type Store = {
  chain_code: string;
  code: string;
  type: string;
  address: string;
  city: string;
  zipcode: string;
  lat?: number;
  lon?: number;
};

export const columns: ColumnDef<Store>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "chain_code",
    header: "Chain Code",
  },
  {
    accessorKey: "code",
    header: "Code",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "city",
    header: "City",
  },
  {
    accessorKey: "zipcode",
    header: "Zipcode",
  },
  {
    accessorKey: "lat",
    header: "Latitude",
    cell: ({ row }) => {
      const lat = row.getValue("lat") as number;
      return lat ? lat.toFixed(6) : "N/A";
    },
  },
  {
    accessorKey: "lon",
    header: "Longitude",
    cell: ({ row }) => {
      const lon = row.getValue("lon") as number;
      return lon ? lon.toFixed(6) : "N/A";
    },
  },
];
