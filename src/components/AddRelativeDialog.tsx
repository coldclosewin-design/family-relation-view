import { useState } from 'react';
import { canAddRelative, type PersonForm, type RelativeKind } from '../model/mutations';
import type { FamilyData, Gender } from '../model/types';
import { useFamilyStore } from '../store/familyStore';

const KIND_LABELS: Array<{ kind: RelativeKind; label: string }> = [
  { kind: 'father', label: '아버지 추가' },
  { kind: 'mother', label: '어머니 추가' },
  { kind: 'spouse', label: '배우자 추가' },
  { kind: 'child', label: '자녀 추가' },
  { kind: 'sibling', label: '형제자매 추가' },
];

type Mode = { view: 'menu' } | { view: 'form'; kind: RelativeKind } | { view: 'edit' };

export function AddRelativeDialog({ data, anchorId }: { data: FamilyData; anchorId: string }) {
  const closeDialog = useFamilyStore((s) => s.closeDialog);
  const addRelative = useFamilyStore((s) => s.addRelative);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const removePerson = useFamilyStore((s) => s.removePerson);

  const anchor = data.persons[anchorId];
  const isEgo = anchorId === data.egoId;
  const [mode, setMode] = useState<Mode>({ view: 'menu' });
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState('');

  if (!anchor) return null;

  const startForm = (kind: RelativeKind) => {
    setName('');
    if (kind === 'father') setGender('male');
    else if (kind === 'mother') setGender('female');
    else if (kind === 'spouse') setGender(anchor.gender === 'male' ? 'female' : 'male');
    else setGender('male');
    setBirthYear('');
    setMode({ view: 'form', kind });
  };

  const startEdit = () => {
    setName(anchor.name);
    setGender(anchor.gender);
    setBirthYear(anchor.birthYear ? String(anchor.birthYear) : '');
    setMode({ view: 'edit' });
  };

  const buildForm = (): PersonForm | null => {
    if (!name.trim()) return null;
    const year = birthYear.trim() === '' ? undefined : Number(birthYear);
    if (year !== undefined && (!Number.isInteger(year) || year < 1800 || year > 2200)) return null;
    return { name: name.trim(), gender, birthYear: year };
  };

  const submit = () => {
    const form = buildForm();
    if (!form) return;
    if (mode.view === 'form') addRelative(anchorId, mode.kind, form);
    else if (mode.view === 'edit') updatePerson(anchorId, form);
  };

  const genderLocked =
    mode.view === 'form' && (mode.kind === 'father' || mode.kind === 'mother');

  return (
    <div className="dialog-overlay" onClick={closeDialog}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {mode.view === 'menu' && (
          <>
            <h3 className="dialog-title">{anchor.name}</h3>
            <div className="menu-list">
              {KIND_LABELS.map(({ kind, label }) => {
                const reason = canAddRelative(data, anchorId, kind);
                return (
                  <button
                    key={kind}
                    className="menu-item"
                    disabled={reason !== null}
                    title={reason ?? undefined}
                    onClick={() => startForm(kind)}
                  >
                    {label}
                    {reason && <span className="menu-reason">{reason}</span>}
                  </button>
                );
              })}
              <hr />
              <button className="menu-item" onClick={startEdit}>
                정보 수정
              </button>
              <button
                className="menu-item danger"
                disabled={isEgo}
                title={isEgo ? "'나'는 삭제할 수 없습니다." : undefined}
                onClick={() => {
                  if (window.confirm(`${anchor.name} 님을 삭제할까요?`)) removePerson(anchorId);
                }}
              >
                삭제
              </button>
            </div>
            <button className="dialog-close" onClick={closeDialog}>
              닫기
            </button>
          </>
        )}

        {(mode.view === 'form' || mode.view === 'edit') && (
          <>
            <h3 className="dialog-title">
              {mode.view === 'edit'
                ? `${anchor.name} 정보 수정`
                : `${anchor.name}의 ${KIND_LABELS.find((k) => k.kind === mode.kind)?.label}`}
            </h3>
            <form
              className="person-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label>
                이름
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 김철수, 고모1"
                />
              </label>
              <fieldset disabled={genderLocked}>
                <legend>성별</legend>
                <label className="radio">
                  <input
                    type="radio"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                  />
                  남
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                  />
                  여
                </label>
              </fieldset>
              <label>
                출생년도 <span className="optional">(선택 — 형/동생 구분에 사용)</span>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="예: 1965"
                />
              </label>
              <div className="form-actions">
                <button type="button" onClick={() => setMode({ view: 'menu' })}>
                  뒤로
                </button>
                <button type="submit" className="primary" disabled={!buildForm()}>
                  {mode.view === 'edit' ? '저장' : '추가'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
