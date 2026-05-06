import { authStore } from "@/store/auth";
import { counterStore } from "@/store/counter";
import {
  fetchUserSettings,
  upsertUserSettings,
  type CloudSettingsRow,
} from "@/services/supabase/userSettings";

/**
 * Cross-device settings sync.
 *
 *  - On login: pull cloud settings → merge into local store (cloud wins).
 *  - On any local change: debounce 600ms, then push to cloud.
 *  - Solo / signed-out: zero network.
 */

let pushTimer: number | null = null;
let pendingPatch: Partial<Omit<CloudSettingsRow, "updated_at">> = {};

function flushPush() {
  pushTimer = null;
  const userId = authStore.getState().user?.id;
  if (!userId) return;
  if (Object.keys(pendingPatch).length === 0) return;
  const patch = pendingPatch;
  pendingPatch = {};
  void upsertUserSettings(patch);
}

export function queueSettingsPush(
  patch: Partial<Omit<CloudSettingsRow, "updated_at">>,
): void {
  if (!authStore.getState().user?.id) return;
  pendingPatch = { ...pendingPatch, ...patch };
  if (pushTimer !== null) clearTimeout(pushTimer);
  pushTimer = window.setTimeout(flushPush, 600);
}

export async function pullUserSettings(): Promise<void> {
  const userId = authStore.getState().user?.id;
  if (!userId) return;
  try {
    const cloud = await fetchUserSettings();
    if (!cloud) {
      // First-time login on this account → seed cloud from current local state
      const s = counterStore.getState();
      void upsertUserSettings({
        daily_goal: s.dailyGoal,
        mantra: s.mantra,
        haptics: s.settings.haptics,
        sound: s.settings.sound,
        reminder_enabled: s.settings.reminderEnabled,
        reminder_time: s.settings.reminderTime,
      });
      return;
    }
    // Cloud wins: apply silently (don't re-push).
    counterStore.applyRemoteSettings({
      dailyGoal: cloud.daily_goal,
      mantra: cloud.mantra ?? undefined,
      settings: {
        haptics: cloud.haptics,
        sound: cloud.sound,
        reminderEnabled: cloud.reminder_enabled,
        reminderTime: cloud.reminder_time,
      },
    });
  } catch (err) {
    console.warn("[settingsSync] pull failed", err);
  }
}

export function flushSettingsPushNow(): void {
  if (pushTimer !== null) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  flushPush();
}
