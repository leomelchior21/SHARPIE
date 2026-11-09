import { afterEach, describe, expect, it, vi } from "vitest";
import { freshShop, loadShop, saveShop } from "./logic";

const remoteRow = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("../../../lib/progressStore", () => ({ loadProgress: vi.fn(async () => remoteRow.value) }));
const { mergeRepair, restoreRepair } = await import("./remote");

describe("Repair Shop progress across tablets", () => {
  afterEach(() => { localStorage.clear(); remoteRow.value = null; });

  it("only ever adds levels and repairs from the dashboard copy", () => {
    const here = { ...freshShop(), fixed: 2, made: { arcade: 2 as number } };
    const merged = mergeRepair(here, [1, 2, 3], 5);
    expect(merged).toMatchObject({ fixed: 5, made: { arcade: 2, vending: 1, jukebox: 1 }, tutorial: true });
    // Nothing new: the same save comes back, untouched.
    expect(mergeRepair(merged, [1, 2], 3)).toBe(merged);
  });

  it("restores a student's cleared levels on a new tablet, and saves them there", async () => {
    remoteRow.value = { codes: { finalProject: { repairLevels: [1, 2], repairFixed: 3 } } };
    saveShop("newtablet", { ...freshShop(), coins: 7 });
    const back = await restoreRepair("newtablet");
    expect(back).toMatchObject({ coins: 7, fixed: 3, made: { arcade: 1, vending: 1 } });
    expect(loadShop("newtablet").made).toEqual({ arcade: 1, vending: 1 });
  });

  it("does nothing offline or without a copy", async () => {
    expect(await restoreRepair("nobody")).toBeNull();
    expect(loadShop("nobody")).toEqual(freshShop());
  });
});
