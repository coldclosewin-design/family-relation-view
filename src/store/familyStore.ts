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
  /** 모든 카드에 '나' 기준 호칭 라벨 표시 */
  labelMode: boolean;
  /** 검색 점프 등 특정 인물로 화면 이동 요청 */
  focusRequest: { id: string; nonce: number } | null;
  helpOpen: boolean;
  /** 도움말을 한 번이라도 봤는지 (첫 방문 자동 표시용, 저장됨) */
  hasSeenHelp: boolean;
  /** 원가족 트리를 접어둔 배우자 멤버 id 목록 (저장됨) */
  collapsedInLaws: string[];

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
  toggleLabelMode: () => void;
  focusPerson: (id: string) => void;
  setHelpOpen: (open: boolean) => void;
  toggleInLawCollapse: (memberId: string) => void;
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => ({
      data: null,
      baseId: undefined,
      targetId: undefined,
      dialogAnchorId: null,
      error: null,
      labelMode: false,
      focusRequest: null,
      helpOpen: false,
      hasSeenHelp: false,
      collapsedInLaws: [],

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

      toggleLabelMode: () => set({ labelMode: !get().labelMode }),

      focusPerson: (id) =>
        set({ focusRequest: { id, nonce: (get().focusRequest?.nonce ?? 0) + 1 } }),

      setHelpOpen: (open) => set({ helpOpen: open, hasSeenHelp: get().hasSeenHelp || open }),

      toggleInLawCollapse: (memberId) => {
        const cur = get().collapsedInLaws;
        set({
          collapsedInLaws: cur.includes(memberId)
            ? cur.filter((id) => id !== memberId)
            : [...cur, memberId],
        });
      },
    }),
    {
      name: 'family-relation-view:data:v1',
      partialize: (state) => ({
        data: state.data,
        labelMode: state.labelMode,
        hasSeenHelp: state.hasSeenHelp,
        collapsedInLaws: state.collapsedInLaws,
      }),
    },
  ),
);
