import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FamilyData } from '../model/types';
import {
  addRelative,
  createInitialData,
  MutationError,
  removePerson,
  setSiblingOrder,
  updatePerson,
  type PersonForm,
  type RelativeKind,
  type SiblingPlacement,
} from '../model/mutations';

interface FamilyStore {
  data: FamilyData | null;
  baseId?: string;
  targetId?: string;
  /** 가족 추가/수정 다이얼로그의 앵커 인물 */
  dialogAnchorId: string | null;
  error: string | null;

  start: (form: PersonForm) => void;
  addRelative: (
    anchorId: string,
    kind: RelativeKind,
    form: PersonForm,
    placement?: SiblingPlacement,
  ) => void;
  reorderSiblings: (orderedIds: string[]) => void;
  updatePerson: (id: string, patch: Partial<PersonForm>) => void;
  removePerson: (id: string) => void;
  selectPerson: (id: string) => void;
  clearSelection: () => void;
  swapSelection: () => void;
  openDialog: (anchorId: string) => void;
  closeDialog: () => void;
  importData: (data: FamilyData) => void;
  reset: () => void;
  setError: (msg: string | null) => void;
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => ({
      data: null,
      baseId: undefined,
      targetId: undefined,
      dialogAnchorId: null,
      error: null,

      start: (form) => set({ data: createInitialData(form) }),

      addRelative: (anchorId, kind, form, placement) => {
        const { data } = get();
        if (!data) return;
        try {
          set({ data: addRelative(data, anchorId, kind, form, placement), dialogAnchorId: null });
        } catch (e) {
          set({ error: e instanceof MutationError ? e.message : '추가에 실패했습니다.' });
        }
      },

      reorderSiblings: (orderedIds) => {
        const { data } = get();
        if (!data) return;
        set({ data: setSiblingOrder(data, orderedIds) });
      },

      updatePerson: (id, patch) => {
        const { data } = get();
        if (!data) return;
        try {
          set({ data: updatePerson(data, id, patch), dialogAnchorId: null });
        } catch (e) {
          set({ error: e instanceof MutationError ? e.message : '수정에 실패했습니다.' });
        }
      },

      removePerson: (id) => {
        const { data, baseId, targetId } = get();
        if (!data) return;
        try {
          set({
            data: removePerson(data, id),
            baseId: baseId === id ? undefined : baseId,
            targetId: targetId === id ? undefined : targetId,
            dialogAnchorId: null,
          });
        } catch (e) {
          set({ error: e instanceof MutationError ? e.message : '삭제에 실패했습니다.' });
        }
      },

      selectPerson: (id) => {
        const { baseId, targetId } = get();
        if (baseId === undefined) set({ baseId: id });
        else if (id === baseId) set({ baseId: undefined, targetId: undefined });
        else if (id === targetId) set({ targetId: undefined });
        else set({ targetId: id });
      },

      clearSelection: () => set({ baseId: undefined, targetId: undefined }),

      swapSelection: () => {
        const { baseId, targetId } = get();
        if (baseId && targetId) set({ baseId: targetId, targetId: baseId });
      },

      openDialog: (anchorId) => set({ dialogAnchorId: anchorId }),
      closeDialog: () => set({ dialogAnchorId: null }),

      importData: (data) =>
        set({ data, baseId: undefined, targetId: undefined, dialogAnchorId: null }),

      reset: () => set({ data: null, baseId: undefined, targetId: undefined, dialogAnchorId: null }),

      setError: (msg) => set({ error: msg }),
    }),
    {
      name: 'family-relation-view:data:v1',
      partialize: (state) => ({ data: state.data }),
    },
  ),
);
