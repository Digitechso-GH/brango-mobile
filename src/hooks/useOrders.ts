import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAssignedOrders, updateOrderStatus, uploadEvidence, Order } from "../api/orders";
import { useStore } from "../store/useStore";

export const useOrders = () => {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["orders", token, user?.driverId],
    queryFn: () => fetchAssignedOrders(token || "", user?.driverId || ""),
    enabled: !!token && !!user?.driverId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order["status"] }) =>
      updateOrderStatus(token || "", orderId, status, user?.id || ""),
    onSuccess: (data) => {
      // Invalidar cache para refrescar datos automáticamente
      queryClient.invalidateQueries({ queryKey: ["orders", token] });
    },
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: ({ orderId, base64Image }: { orderId: string; base64Image: string }) =>
      uploadEvidence(token || "", orderId, base64Image),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", token] });
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
  };
};
