export const fortunes: string[] = [
  "오늘은 뜻밖의 좋은 소식이 찾아올 거예요.",
  "작은 용기가 큰 변화를 만드는 하루입니다.",
  "그동안의 노력이 서서히 결실을 맺기 시작합니다.",
  "새로운 인연이 다가올 수 있으니 주변을 잘 살펴보세요.",
  "재물운이 상승하는 시기, 충동적인 소비는 조심하세요.",
];

export const luckyItems: string[] = [
  "우산",
  "손목시계",
  "노란색 머그컵",
  "책 한 권",
  "동전 지갑",
];

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
