import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { EmergencyCase } from '../types';

const BROADCAST_NAME = 'gh_emergency_case_sync';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

/** Cross-tab / same-machine sync (works without Supabase). */
export function broadcastEmergencyCase(caseData: EmergencyCase): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const bc = new BroadcastChannel(BROADCAST_NAME);
  bc.postMessage({ type: 'case', payload: caseData });
  bc.close();
}

/** Upserts the full case to `emergency_cases` when Supabase is configured (Realtime for remote clients). */
export async function persistEmergencyCase(caseData: EmergencyCase): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from('emergency_cases').upsert(
    {
      id: caseData.id,
      case_payload: caseData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('[GoldenHour] emergency_cases upsert:', error.message);
  }
}

export function subscribeBroadcastEmergencyCases(
  onCase: (c: EmergencyCase) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const bc = new BroadcastChannel(BROADCAST_NAME);
  bc.onmessage = (e: MessageEvent) => {
    if (e.data?.type === 'case' && e.data.payload) {
      onCase(e.data.payload as EmergencyCase);
    }
  };
  return () => bc.close();
}

/** Supabase Realtime subscription for `emergency_cases` (hospital / multi-client). */
export function subscribeSupabaseEmergencyCases(onCase: (c: EmergencyCase) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  let channel: RealtimeChannel | null = supabase
    .channel('emergency_cases_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'emergency_cases' },
      (payload) => {
        const row = payload.new as { case_payload?: EmergencyCase } | null;
        if (row?.case_payload) onCase(row.case_payload);
      }
    )
    .subscribe();

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}
