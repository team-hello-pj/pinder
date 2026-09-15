// legacy/Community.dc.html 의 REGIONS / SEED_POSTS / TRENDING_DESTINATIONS / POPULAR_TAGS 를 그대로 옮겼다.
// MOCK: 실제 연동 시 posts 를 서버 API 응답으로 교체하고, 좋아요/북마크/댓글 액션을 API 호출로 교체.

export const REGIONS = [
  '전체',
  '서울',
  '강원',
  '경기',
  '경남',
  '경북',
  '광주',
  '대구',
  '대전',
  '부산',
  '세종',
  '울산',
  '인천',
  '전남',
  '전북',
  '제주',
  '충남',
  '충북',
];

export interface Reply {
  id: string;
  author: string;
  text: string;
  liked: boolean;
  likeCount: number;
}

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  liked: boolean;
  likeCount: number;
  replies: Reply[];
}

export interface Post {
  id: string;
  author: string;
  avatarInitial: string;
  place: string;
  region: string;
  time: string;
  timestamp: number;
  caption: string;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  tags: string[];
  isMine: boolean;
  comments: CommentItem[];
  commentDraft: string;
}

interface SeedComment {
  author: string;
  text: string;
}

interface SeedPost {
  id: string;
  author: string;
  avatarInitial: string;
  place: string;
  region: string;
  time: string;
  timestamp: number;
  caption: string;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  tags: string[];
  isMine: boolean;
  comments: SeedComment[];
}

const SEED_POSTS: SeedPost[] = [
  {
    id: 'p1',
    author: '민준',
    avatarInitial: '민',
    place: '제주도',
    region: '제주',
    time: '2일 전',
    timestamp: Date.now() - 2 * 86_400_000,
    caption: '성산일출봉 근처 카페에서 본 바다뷰가 최고였어요 🌊',
    liked: false,
    likeCount: 24,
    bookmarked: false,
    tags: ['제주여행', '성산일출봉'],
    isMine: false,
    comments: [{ author: '서연', text: '저도 가보고 싶어요!' }],
  },
  {
    id: 'p2',
    author: '나',
    avatarInitial: '나',
    place: '부산',
    region: '부산',
    time: '5일 전',
    timestamp: Date.now() - 5 * 86_400_000,
    caption: '광안리 야경 산책 다녀왔습니다',
    liked: true,
    likeCount: 41,
    bookmarked: false,
    tags: ['부산야경', '광안리'],
    isMine: true,
    comments: [],
  },
  {
    id: 'p3',
    author: '서연',
    avatarInitial: '서',
    place: '강릉',
    region: '강원',
    time: '1일 전',
    timestamp: Date.now() - 1 * 86_400_000,
    caption: '안목해변 커피거리 완전 추천이에요 ☕',
    liked: false,
    likeCount: 12,
    bookmarked: false,
    tags: ['강릉카페'],
    isMine: false,
    comments: [],
  },
];

export function seedPosts(): Post[] {
  return SEED_POSTS.map((p) => ({
    ...p,
    commentDraft: '',
    comments: p.comments.map((c, i) => ({
      id: `${p.id}-c${i}`,
      liked: false,
      likeCount: 0,
      replies: [],
      ...c,
    })),
  }));
}

export const TRENDING_DESTINATIONS = [
  { name: '부산 해운대 & 광안리', count: '1,420개' },
  { name: '제주 애월 한담해안길', count: '980개' },
  { name: '강릉 안목해변 카페거리', count: '750개' },
];

export const POPULAR_TAGS = ['부산야경', '제주카페투어', '국내서핑', '감성숙소', '주말드라이브'];
