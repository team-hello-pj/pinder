'use client';

import { avatarColorFor } from '@/lib/avatar';

const DEFAULT_AVATAR_SRC = '/icons/mypage-default-avatar.png';

export interface AuthorAvatarProps {
  /** 이니셜/색상 배지로 대체될 때 쓰는 이름(닉네임 등). */
  name: string;
  /** 마이페이지에서 등록한 실제 프로필 사진(data URL). 없으면 null/undefined. */
  avatarUrl?: string | null;
  /** 이 아바타가 현재 로그인한 내 것인지 — 사진이 없어도 이니셜 대신 마이페이지 기본 사진을 보여준다. */
  isMine?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 커뮤니티 등에서 반복되는 작성자 아바타. 실제 프로필 사진이 있으면 그걸 보여주고,
 * 없으면 "나"는 마이페이지의 기본 사진을, 다른 사람은 기존처럼 이니셜 색상 배지를 보여준다.
 */
export function AuthorAvatar({ name, avatarUrl, isMine, className, style }: AuthorAvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 사용자가 올린 data URL 이라 next/image 최적화 대상이 아님
      <img src={avatarUrl} alt="" className={className} style={style} />
    );
  }
  if (isMine) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 정적 기본 아바타 이미지
      <img src={DEFAULT_AVATAR_SRC} alt="" className={className} style={style} />
    );
  }
  return (
    <span
      className={className}
      style={{
        ...style,
        background: avatarColorFor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
      }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
