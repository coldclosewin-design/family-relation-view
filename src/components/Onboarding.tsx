import { useState } from 'react';
import type { Gender } from '../model/types';
import { useFamilyStore } from '../store/familyStore';

export function Onboarding() {
  const start = useFamilyStore((s) => s.start);
  const [name, setName] = useState('나');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    const year = birthYear.trim() === '' ? undefined : Number(birthYear);
    start({
      name: name.trim(),
      gender,
      birthYear: year !== undefined && Number.isInteger(year) ? year : undefined,
    });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h2>가족 호칭 계산기</h2>
        <p>
          가족 관계도를 만들면, 두 사람을 골라 <b>서로 부르는 호칭</b>을 알 수 있어요.
          <br />
          먼저 <b>나</b>부터 만들어 시작해 보세요.
        </p>
        <form
          className="person-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label>
            이름
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset>
            <legend>성별</legend>
            <label className="radio">
              <input type="radio" checked={gender === 'male'} onChange={() => setGender('male')} />
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
            출생년도 <span className="optional">(선택)</span>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="예: 1990"
            />
          </label>
          <button type="submit" className="primary" disabled={!name.trim()}>
            시작하기
          </button>
        </form>
      </div>
    </div>
  );
}
