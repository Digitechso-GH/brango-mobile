import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAssignedOrders, updateOrderStatus, uploadEvidencePhoto, uploadGroupEvidencePhoto, Order } from "../api/orders.api";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { mapStatusToBackend } from "../constants/order-status";

export const useOrders = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["orders", token, user?.driverId],
    queryFn: () => fetchAssignedOrders(user?.driverId || undefined),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      latitude,
      longitude,
      reasonText,
    }: {
      orderId: string;
      status: Order["status"];
      latitude?: number;
      longitude?: number;
      reasonText?: string;
    }) =>
      updateOrderStatus(
        orderId,
        status,
        latitude,
        longitude,
        reasonText
      ),
    onSuccess: (_, variables) => {
      // 1. Actualización optimista e instantánea del cache local de React Query
      queryClient.setQueriesData({ queryKey: ["orders"] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((item: any) => {
          if (item.id === variables.orderId) {
            return {
              ...item,
              status: variables.status,
              reasonText: variables.reasonText !== undefined ? variables.reasonText : item.reasonText,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
      });

      // 2. Invalidar y refetchear inmediatamente en segundo plano
      queryClient.invalidateQueries({ queryKey: ["orders"], refetchType: "all" });
      queryClient.refetchQueries({ queryKey: ["orders"] });
    },
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: ({
      orderId,
      base64Image,
      signatureText,
    }: {
      orderId: string;
      base64Image: string;
      signatureText?: string;
    }) => uploadEvidencePhoto(orderId, base64Image, signatureText),
    onSuccess: (_, variables) => {
      queryClient.setQueriesData({ queryKey: ["orders"] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((item: any) => {
          if (item.id === variables.orderId) {
            return {
              ...item,
              evidenceUrl: variables.base64Image,
            };
          }
          return item;
        });
      });
 
      queryClient.invalidateQueries({ queryKey: ["orders"], refetchType: "all" });
      queryClient.refetchQueries({ queryKey: ["orders"] });
    },
  });

  const uploadGroupEvidenceMutation = useMutation({
    mutationFn: ({
      orderIds,
      base64Image,
      signatureText,
    }: {
      orderIds: string[];
      base64Image: string;
      signatureText?: string;
    }) => uploadGroupEvidencePhoto(orderIds, base64Image, signatureText),
    onSuccess: (_, variables) => {
      queryClient.setQueriesData({ queryKey: ["orders"] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((item: any) => {
          if (variables.orderIds.includes(item.id)) {
            return {
              ...item,
              evidenceUrl: variables.base64Image,
            };
          }
          return item;
        });
      });

      queryClient.invalidateQueries({ queryKey: ["orders"], refetchType: "all" });
      queryClient.refetchQueries({ queryKey: ["orders"] });
    },
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    refetch: ordersQuery.refetch,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    uploadEvidence: uploadEvidenceMutation.mutateAsync,
    isUploadingEvidence: uploadEvidenceMutation.isPending,
    uploadGroupEvidence: uploadGroupEvidenceMutation.mutateAsync,
    isUploadingGroupEvidence: uploadGroupEvidenceMutation.isPending,
  };
};
