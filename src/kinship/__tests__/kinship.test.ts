import { describe, expect, it } from 'vitest';
import type { FamilyData, Gender, Person } from '../../model/types';
import { buildGraph } from '../../model/familyGraph';
import { computeKinship } from '../resolver';

/** 테스트 픽스처: 4대 + 시가/처가 포함 가상 가족 */
function makeFixture(): FamilyData {
  const persons: Record<string, Person> = {};
  const add = (
    id: string,
    name: string,
    gender: Gender,
    birthYear?: number,
    fatherId?: string,
    motherId?: string,
  ): Person => {
    const p: Person = { id, name, gender, birthYear, fatherId, motherId, spouseIds: [] };
    persons[id] = p;
    return p;
  };
  const marry = (a: string, b: string) => {
    persons[a].spouseIds.push(b);
    persons[b].spouseIds.push(a);
  };

  // 증조부모 (부계)
  add('ggfa', '증조할아버지', 'male', 1905);
  add('ggmo', '증조할머니', 'female', 1908);
  marry('ggfa', 'ggmo');
  // 조부모 세대: 할아버지 + 할아버지의 형
  add('gfa', '할아버지', 'male', 1930, 'ggfa', 'ggmo');
  add('gfaB', '큰할아버지', 'male', 1928, 'ggfa', 'ggmo');
  add('gmo', '할머니', 'female', 1933);
  marry('gfa', 'gmo');
  add('gfaBW', '큰할아버지처', 'female', 1931);
  marry('gfaB', 'gfaBW');
  // 5촌 당숙, 6촌 재종, 7촌
  add('dangsuk', '당숙', 'male', 1957, 'gfaB', 'gfaBW');
  add('dangsukW', '당숙모', 'female', 1959);
  marry('dangsuk', 'dangsukW');
  add('jaejong', '재종', 'male', 1987, 'dangsuk', 'dangsukW');
  add('jaejongW', '재종처', 'female', 1989);
  marry('jaejong', 'jaejongW');
  add('chon7', '칠촌', 'male', 2015, 'jaejong', 'jaejongW');
  // 부모 세대 (부계)
  add('father', '아버지', 'male', 1960, 'gfa', 'gmo');
  add('uncle1', '큰아버지', 'male', 1955, 'gfa', 'gmo');
  add('uncle1W', '큰어머니', 'female', 1957);
  marry('uncle1', 'uncle1W');
  add('aunt', '고모', 'female', 1965, 'gfa', 'gmo');
  add('auntH', '고모부', 'male', 1963);
  marry('aunt', 'auntH');
  // 외가
  add('mgfa', '외할아버지', 'male', 1932);
  add('mgmo', '외할머니', 'female', 1935);
  marry('mgfa', 'mgmo');
  add('mother', '어머니', 'female', 1963, 'mgfa', 'mgmo');
  marry('father', 'mother');
  add('muncle', '외삼촌', 'male', 1958, 'mgfa', 'mgmo');
  add('muncleW', '외숙모', 'female', 1960);
  marry('muncle', 'muncleW');
  add('maunt', '이모', 'female', 1968, 'mgfa', 'mgmo');
  add('mauntH', '이모부', 'male', 1966);
  marry('maunt', 'mauntH');
  // 사촌들
  add('cousin1', '사촌형', 'male', 1985, 'uncle1', 'uncle1W');
  add('cousin1W', '사촌형수', 'female', 1987);
  marry('cousin1', 'cousin1W');
  add('cousin1S', '당질', 'male', 2012, 'cousin1', 'cousin1W');
  add('cousinGJ', '고종사촌', 'male', 1992, 'auntH', 'aunt');
  add('mcousin', '외사촌', 'female', 1988, 'muncle', 'muncleW');
  add('micousin', '이종사촌', 'male', 1995, 'mauntH', 'maunt');
  // 나 + 형제
  add('ego', '나', 'male', 1990, 'father', 'mother');
  add('brother', '형', 'male', 1988, 'father', 'mother');
  add('brotherW', '형수', 'female', 1989);
  marry('brother', 'brotherW');
  add('brotherS', '조카', 'male', 2016, 'brother', 'brotherW');
  add('sister', '여동생', 'female', 1993, 'father', 'mother');
  add('sisterH', '매제', 'male', 1992);
  marry('sister', 'sisterH');
  add('sisterS', '생질', 'male', 2020, 'sisterH', 'sister');
  // 처가
  add('wF', '장인', 'male', 1962);
  add('wM', '장모', 'female', 1965);
  marry('wF', 'wM');
  add('wife', '아내', 'female', 1991, 'wF', 'wM');
  marry('ego', 'wife');
  add('wB', '처남', 'male', 1994, 'wF', 'wM');
  add('wOZ', '처형', 'female', 1989, 'wF', 'wM');
  add('wOZH', '처형남편', 'male', 1988);
  marry('wOZ', 'wOZH');
  // 자녀 + 사돈
  add('son', '아들', 'male', 2018, 'ego', 'wife');
  add('sonW', '며느리감', 'female', 2019);
  marry('son', 'sonW');
  add('sdF', '사돈', 'male', 1990);
  add('sdM', '사부인', 'female', 1992);
  marry('sdF', 'sdM');
  persons['sonW'].fatherId = 'sdF';
  persons['sonW'].motherId = 'sdM';
  add('grandson', '손자', 'male', 2045, 'son', 'sonW');
  // 연결되지 않은 인물
  add('stranger', '남', 'male', 1990);

  return { schemaVersion: 1, egoId: 'ego', persons };
}

const graph = buildGraph(makeFixture());
const kin = (base: string, target: string) => computeKinship(graph, base, target);

describe('직계·형제', () => {
  it('아버지 / 아들 (역방향)', () => {
    expect(kin('ego', 'father')).toMatchObject({ casual: '아버지', formal: '부친', chon: 1 });
    expect(kin('father', 'ego')).toMatchObject({ casual: '아들', chon: 1 });
  });
  it('어머니는 혈연 경로(M)로 계산 (아버지의 아내 아님)', () => {
    expect(kin('ego', 'mother').tokens).toEqual(['M']);
  });
  it('조부모/외조부모/증조/고조', () => {
    expect(kin('ego', 'gfa').casual).toBe('할아버지');
    expect(kin('ego', 'mgfa').casual).toBe('외할아버지');
    expect(kin('ego', 'ggfa').casual).toBe('증조할아버지');
    expect(kin('son', 'ggfa').casual).toBe('고조할아버지');
  });
  it('형(남ego) / 서방님(형수→나, 기혼)', () => {
    expect(kin('ego', 'brother').casual).toBe('형');
    expect(kin('brotherW', 'ego').casual).toBe('서방님');
  });
  it('여동생 / 아가씨(형수→여동생)', () => {
    expect(kin('ego', 'sister').casual).toBe('여동생');
    expect(kin('brotherW', 'sister').casual).toBe('아가씨');
  });
});

describe('3촌·4촌', () => {
  it('큰아버지 (백부) / 큰어머니', () => {
    expect(kin('ego', 'uncle1')).toMatchObject({ casual: '큰아버지', formal: '백부', chon: 3 });
    expect(kin('ego', 'uncle1W').casual).toBe('큰어머니');
  });
  it('고모/고모부/외삼촌/외숙모/이모/이모부', () => {
    expect(kin('ego', 'aunt').casual).toBe('고모');
    expect(kin('ego', 'auntH').casual).toBe('고모부');
    expect(kin('ego', 'muncle').casual).toBe('외삼촌');
    expect(kin('ego', 'muncleW').casual).toBe('외숙모');
    expect(kin('ego', 'maunt').casual).toBe('이모');
    expect(kin('ego', 'mauntH').casual).toBe('이모부');
  });
  it('사촌 (나이 접미 포함)', () => {
    expect(kin('ego', 'cousin1')).toMatchObject({ casual: '사촌 형', chon: 4 });
    expect(kin('ego', 'cousinGJ').casual).toBe('고종사촌 동생');
    expect(kin('ego', 'mcousin').casual).toBe('외사촌 누나');
    expect(kin('ego', 'micousin').casual).toBe('이종사촌 동생');
  });
  it('큰할아버지 (조부의 형)', () => {
    expect(kin('ego', 'gfaB').casual).toBe('큰할아버지');
  });
});

describe('5촌·6촌·폴백', () => {
  it('당숙(5촌)/당숙모', () => {
    expect(kin('ego', 'dangsuk')).toMatchObject({ casual: '당숙', formal: '종숙', chon: 5 });
    expect(kin('ego', 'dangsukW').casual).toBe('당숙모');
  });
  it('당질(사촌의 아들, 5촌)', () => {
    expect(kin('ego', 'cousin1S')).toMatchObject({ casual: '오촌 조카', formal: '당질', chon: 5 });
  });
  it('재종(6촌)', () => {
    expect(kin('ego', 'jaejong')).toMatchObject({ casual: '육촌 형', formal: '재종', chon: 6 });
  });
  it('7촌은 촌수 폴백', () => {
    expect(kin('ego', 'chon7')).toMatchObject({ kind: 'fallback', casual: '7촌 친척', chon: 7 });
  });
  it('미연결 인물은 관계 없음', () => {
    expect(kin('ego', 'stranger').kind).toBe('none');
  });
  it('본인', () => {
    expect(kin('ego', 'ego').casual).toBe('본인');
  });
});

describe('조카', () => {
  it('형의 아들 → 조카(질)', () => {
    expect(kin('ego', 'brotherS')).toMatchObject({ casual: '조카', formal: '질', chon: 3 });
  });
  it('남ego: 여동생의 아들 → 생질, 여ego(이모): 자매의 아들 → 이질', () => {
    expect(kin('ego', 'sisterS').formal).toBe('생질');
    expect(kin('maunt', 'ego').formal).toBe('이질');
  });
});

describe('형제자매의 배우자', () => {
  it('남ego: 형수님/매제, 여ego: 새언니', () => {
    expect(kin('ego', 'brotherW').casual).toBe('형수님');
    expect(kin('ego', 'sisterH').casual).toBe('매제');
    expect(kin('sister', 'brotherW').casual).toBe('새언니');
  });
  it('여ego: 언니의 남편 → 형부', () => {
    expect(kin('wife', 'wOZH').casual).toBe('형부');
  });
});

describe('처가 (남편 기준)', () => {
  it('장인/장모/처남/처형', () => {
    expect(kin('ego', 'wF').casual).toBe('장인어른');
    expect(kin('ego', 'wM').casual).toBe('장모님');
    expect(kin('ego', 'wB').casual).toBe('처남');
    expect(kin('ego', 'wOZ').casual).toBe('처형');
  });
  it('처형의 남편 → 형님(손위 동서)', () => {
    expect(kin('ego', 'wOZH')).toMatchObject({ casual: '형님', formal: '손위 동서' });
  });
  it('장인 → 사위', () => {
    expect(kin('wF', 'ego').casual).toBe('사위');
  });
});

describe('시가 (아내 기준)', () => {
  it('시아버지/시어머니/아주버님', () => {
    expect(kin('wife', 'father').casual).toBe('시아버지');
    expect(kin('wife', 'mother').casual).toBe('시어머니');
    expect(kin('wife', 'brother').casual).toBe('아주버님');
  });
  it('시부모 → 며느리', () => {
    expect(kin('father', 'wife').casual).toBe('며느리');
  });
});

describe('사돈', () => {
  it('아들의 배우자의 부모 → 사돈어른/사부인', () => {
    expect(kin('father', 'wF').casual).toBe('사돈어른');
    expect(kin('ego', 'sdF').casual).toBe('사돈어른');
    expect(kin('ego', 'sdM').casual).toBe('사부인');
  });
});

describe('전수 스모크: 모든 쌍 양방향 계산', () => {
  it('크래시 없이 항상 비어있지 않은 결과를 낸다', () => {
    const ids = Object.keys(graph.persons);
    for (const a of ids) {
      for (const b of ids) {
        const r = kin(a, b);
        expect(r.casual.length).toBeGreaterThan(0);
        expect(typeof r.description).toBe('string');
      }
    }
  });
});
