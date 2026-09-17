// legacy/Signup Screen.dc.html 의 TERMS_DATA 를 그대로 옮겼다.
// 실제 확정 약관으로 교체할 때는 이 배열만 수정하면 된다.

export interface TermsItem {
  key: 'service' | 'privacy' | 'marketing' | 'location';
  required: boolean;
  label: string;
  title: string;
  body: string;
}

export const TERMS_DATA: TermsItem[] = [
  {
    key: 'service',
    required: true,
    label: '[필수] 이용약관 동의',
    title: '이용약관',
    body: 'p:nder 서비스 이용에 관한 기본 약관입니다.\n\n1. 서비스 이용 조건\n2. 이용자의 의무\n3. 서비스 제공 및 변경\n4. 계약 해지',
  },
  {
    key: 'privacy',
    required: true,
    label: '[필수] 개인정보 수집·이용 동의',
    title: '개인정보 수집 및 이용 동의',
    body: '회원가입 및 서비스 제공을 위해 아래 정보를 수집합니다.\n\n수집 항목: 이름, 이메일, 아이디, 닉네임, 비밀번호\n이용 목적: 회원 식별, 서비스 제공\n보유 기간: 회원 탈퇴 시까지',
  },
  {
    key: 'marketing',
    required: false,
    label: '[선택] 마케팅 정보 수신 동의',
    title: '마케팅 정보 수신 동의',
    body: '신규 기능, 이벤트, 프로모션 등의 마케팅 정보를 이메일로 받아보실 수 있습니다.\n\n동의하지 않아도 서비스 이용에 제한이 없습니다.',
  },
  {
    key: 'location',
    required: false,
    label: '[선택] 위치정보 이용 동의',
    title: '위치정보 이용 동의',
    body: '지도에서 현재 위치를 표시하고 주변 방문지를 추천하는 데 위치정보를 이용합니다.\n\n동의하지 않아도 서비스 이용에 제한이 없으며, 위치 기반 기능만 사용할 수 없습니다.',
  },
];
