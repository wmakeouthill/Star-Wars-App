import { create } from 'zustand';

type ImageEditModeState = {
  isEnabled: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
};

export const useImageEditModeStore = create<ImageEditModeState>((set) => ({
  isEnabled: false,
  enable: () => set({ isEnabled: true }),
  disable: () => set({ isEnabled: false }),
  toggle: () => set((prev) => ({ isEnabled: !prev.isEnabled })),
}));

