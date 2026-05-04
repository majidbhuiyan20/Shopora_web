import { adminRequest } from "./admin-client";
import type { Order, OrderListData, OrderStatus } from "../types";

export function listOrders() {
  return adminRequest<OrderListData>("orders");
}

export function updateOrderStatus(
  orderID: number,
  status: OrderStatus,
  note?: string,
) {
  return adminRequest<Order>(`orders/${orderID}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      note,
    }),
  });
}
