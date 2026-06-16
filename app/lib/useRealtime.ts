"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { supabase } from "./supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeOptions<T extends Record<string, unknown>> {
  table: string;
  event?: PostgresEvent;
  filter?: string;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T, old: Partial<T>) => void;
  onDelete?: (old: Partial<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export function useRealtimeTable<T extends Record<string, unknown>>(
  channelName: string,
  options: RealtimeOptions<T>,
  enabled: boolean = true,
) {
  const optsRef = useRef(options);
  useLayoutEffect(() => {
    optsRef.current = options;
  });

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: options.event ?? "*",
          schema: "public",
          table: options.table,
          ...(options.filter ? { filter: options.filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const opts = optsRef.current;
          opts.onChange?.(payload);
          if (payload.eventType === "INSERT") opts.onInsert?.(payload.new as T);
          if (payload.eventType === "UPDATE") opts.onUpdate?.(payload.new as T, payload.old as Partial<T>);
          if (payload.eventType === "DELETE") opts.onDelete?.(payload.old as Partial<T>);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, options.table, options.filter, options.event]);
}

// Convenience hook for farmer: subscribes to new orders for this farmer
export function useFarmerOrderStream(
  farmerId: string | undefined,
  onNewOrder: (order: Record<string, unknown>) => void,
) {
  useRealtimeTable<Record<string, unknown>>(
    `farmer-orders-${farmerId}`,
    {
      table: "orders",
      event: "INSERT",
      filter: farmerId ? `farmer_id=eq.${farmerId}` : undefined,
      onInsert: onNewOrder,
    },
    Boolean(farmerId),
  );
}

// Consumer: live order status updates
export function useConsumerOrderUpdates(
  consumerId: string | undefined,
  onStatusChange: (order: Record<string, unknown>) => void,
) {
  useRealtimeTable<Record<string, unknown>>(
    `consumer-orders-${consumerId}`,
    {
      table: "orders",
      event: "UPDATE",
      filter: consumerId ? `consumer_id=eq.${consumerId}` : undefined,
      onUpdate: onStatusChange,
    },
    Boolean(consumerId),
  );
}

// Government: all new orders for live stream
export function useGovernmentOrderStream(
  onNewOrder: (order: Record<string, unknown>) => void,
  enabled: boolean = true,
) {
  useRealtimeTable<Record<string, unknown>>(
    "government-order-stream",
    { table: "orders", event: "INSERT", onInsert: onNewOrder },
    enabled,
  );
}

// Farmer: live crop inventory changes (e.g., quantity update when order placed)
export function useFarmerCropUpdates(
  farmerId: string | undefined,
  onUpdate: (crop: Record<string, unknown>) => void,
) {
  useRealtimeTable<Record<string, unknown>>(
    `farmer-crops-${farmerId}`,
    {
      table: "crops",
      event: "UPDATE",
      filter: farmerId ? `farmer_id=eq.${farmerId}` : undefined,
      onUpdate,
    },
    Boolean(farmerId),
  );
}
