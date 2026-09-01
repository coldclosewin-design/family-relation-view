import { describe, expect, it } from 'vitest';
import { decodeShareData, encodeShareData } from '../shareLink';
import { createInitialData, addRelative } from '../../model/mutations';

describe('공유 링크 인코딩', () => {
  const sample = () => {
    let d = createInitialData({ name: '나', gender: 'male', birthYear: 1990 });
    d = addRelative(d, d.egoId, 'father', { name: '아버지', gender: 'male', birthYear: 1960 });
    d = addRelative(d, d.egoId, 'mother', { name: '어머니', gender: 'female', birthYear: 1963 });
    return d;
  };

  it('인코딩 → 디코딩 왕복이 데이터를 보존한다', () => {
    const data = sample();
    const decoded = decodeShareData(encodeShareData(data));
    expect(decoded).toEqual(data);
  });

  it('압축 문자열은 URL에 안전한 문자만 사용한다', () => {
    const payload = encodeShareData(sample());
    expect(payload).toMatch(/^[A-Za-z0-9+\-$_.!*'()]+$/);
    expect(payload.length).toBeGreaterThan(0);
  });

  it('손상된 페이로드는 null', () => {
    expect(decodeShareData('!!!broken!!!')).toBeNull();
    expect(decodeShareData(encodeShareData(sample()).slice(0, 10))).toBeNull();
  });
});
