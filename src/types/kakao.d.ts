/**
 * Kakao Maps JS SDK 최소 타입 선언.
 * 지도 기능을 확장할 때 필요한 멤버만 여기에 추가한다. (공식 @types 패키지 없음)
 */
declare global {
  interface Window {
    kakao: {
      maps: {
        load(callback: () => void): void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
      };
    };
  }
}

export {};
