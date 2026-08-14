import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardPlants, DashboardStock, DashboardToday } from "./types";

/**
 * `branchId` es opcional: si no se manda, el backend usa la sucursal del
 * usuario (y si tampoco tiene, agrega todas).
 */
interface BranchFilter {
  branchId?: number;
}

export const dashboardKeys = {
  all: ["dashboard"] as const,
  today: (filter: BranchFilter) => ["dashboard", "today", filter] as const,
  stock: (filter: BranchFilter) => ["dashboard", "stock", filter] as const,
  plants: (filter: BranchFilter) => ["dashboard", "plants", filter] as const,
};

export function useDashboardToday(filter: BranchFilter = {}) {
  return useQuery({
    queryKey: dashboardKeys.today(filter),
    queryFn: async () => {
      const { data } = await api.get<DashboardToday>("/api/dashboard/today", { params: filter });
      return data;
    },
  });
}

export function useDashboardStock(filter: BranchFilter = {}) {
  return useQuery({
    queryKey: dashboardKeys.stock(filter),
    queryFn: async () => {
      const { data } = await api.get<DashboardStock>("/api/dashboard/stock", { params: filter });
      return data;
    },
  });
}

export function useDashboardPlants(filter: BranchFilter = {}) {
  return useQuery({
    queryKey: dashboardKeys.plants(filter),
    queryFn: async () => {
      const { data } = await api.get<DashboardPlants>("/api/dashboard/plants", { params: filter });
      return data;
    },
  });
}
