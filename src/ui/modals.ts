import { create } from 'zustand';
import type { Relation } from '../data/actions';

/** Fenêtres ouvrables depuis n'importe quel écran. */
export type ModalSpec =
  | { type: 'person'; personId?: string; relation?: Exclude<Relation, { kind: 'none' }> | { kind: 'none' } }
  | { type: 'link'; personId: string }
  | { type: 'union'; unionId: string }
  | { type: 'place'; placeId?: string; personIds?: string[] }
  | { type: 'photo'; mediaId?: string; personIds?: string[]; placeIds?: string[]; portraitFor?: string; coverFor?: string }
  | { type: 'photoView'; mediaId: string; list?: string[] }
  | { type: 'story'; storyId?: string; personIds?: string[]; placeIds?: string[] }
  | { type: 'event'; personId: string; eventId?: string }
  | { type: 'confirm'; title: string; text: string; confirmLabel: string; onConfirm: () => void };

interface ModalState {
  stack: ModalSpec[];
  open: (m: ModalSpec) => void;
  close: () => void;
  replace: (m: ModalSpec) => void;
}

export const useModals = create<ModalState>((set) => ({
  stack: [],
  open: (m) => set((s) => ({ stack: [...s.stack, m] })),
  close: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  replace: (m) => set((s) => ({ stack: [...s.stack.slice(0, -1), m] })),
}));

export const openModal = (m: ModalSpec) => useModals.getState().open(m);
export const closeModal = () => useModals.getState().close();

export function confirmAction(title: string, text: string, confirmLabel: string, onConfirm: () => void) {
  openModal({ type: 'confirm', title, text, confirmLabel, onConfirm });
}
