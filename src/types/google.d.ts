/**
 * Google Identity Services(GSI) 최소 타입 선언.
 * 필요한 멤버만 추가한다 (공식 @types 패키지 없음).
 */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: { type?: string; theme?: string; size?: string; width?: number },
          ): void;
        };
      };
    };
  }
}

export {};
