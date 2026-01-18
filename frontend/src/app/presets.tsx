import { createContext, useContext } from "react";
import type { Preset } from "../api/presets";

export type PresetsState = {
  presets: Preset[];
  loading: boolean;
  error: string | null;
};

export const PresetsContext = createContext<PresetsState>({
  presets: [],
  loading: true,
  error: null
});

export function usePresets() {
  return useContext(PresetsContext);
}
