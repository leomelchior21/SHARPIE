import { loadProgress as loadRemote } from "../../../lib/progressStore";
import { parseFinalProjectSync } from "../../../lib/finalProjectSync";
import { allMachines, loadShop, saveShop, type Shop } from "./logic";

/*
 * The Repair Shop saves on the device; the teacher dashboard keeps a copy of the levels cleared.
 * A student who changes tablet gets those levels back, so the copy (and the dashboard) never goes down.
 */

/** Levels cleared elsewhere come back. It only ever adds: levels, repairs and the tutorial being done. */
export function mergeRepair(shop: Shop, levels: number[], fixed: number): Shop {
  const made = { ...shop.made };
  let changed = fixed > shop.fixed;
  for (const n of levels) {
    const m = allMachines[n - 1];
    if (m && !(made[m] ?? 0)) { made[m] = 1; changed = true; }
  }
  if (!changed) return shop;
  return { ...shop, made, fixed: Math.max(shop.fixed, fixed), tutorial: shop.tutorial || levels.length > 0 };
}

const restoring = new Map<string, Promise<Shop | null>>();
/** Once a visit: read the dashboard copy, add what this device is missing and save it here. null: nothing to add. */
export function restoreRepair(login: string): Promise<Shop | null> {
  let done = restoring.get(login);
  if (!done) {
    done = loadRemote(login).then((row) => {
      const remote = parseFinalProjectSync(row?.codes?.finalProject);
      if (!remote) return null;
      const shop = loadShop(login), merged = mergeRepair(shop, remote.repairLevels, remote.repairFixed);
      if (merged === shop) return null;
      saveShop(login, merged);
      return merged;
    }).catch(() => null);
    restoring.set(login, done);
  }
  return done;
}
