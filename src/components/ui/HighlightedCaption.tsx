import { Fragment } from 'react';

export interface HighlightedCaptionProps {
  text: string;
  /** true 면 본문은 숨기고 #태그만 뽑아서 보여준다 (글쓰기 폼의 태그 미리보기용). */
  tagsOnly?: boolean;
}

/**
 * 글 속 "#태그"만 브랜드 색으로 강조해서 렌더링한다.
 * legacy/Community.dc.html 의 renderCaption / renderTagsOnly 를 그대로 옮겼다.
 */
export function HighlightedCaption({ text, tagsOnly = false }: HighlightedCaptionProps) {
  if (tagsOnly) {
    const tags = text.match(/#[^\s#]+/g) ?? [];
    return (
      <>
        {tags.map((tag, i) => (
          <span key={i} style={{ color: 'var(--pd-link)', fontWeight: 700, marginRight: 6 }}>
            {tag}
          </span>
        ))}
      </>
    );
  }

  const parts = text.split(/(#[^\s#]+)/g);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part.startsWith('#') ? (
            <span style={{ color: 'var(--pd-link)', fontWeight: 700 }}>{part}</span>
          ) : (
            part
          )}
        </Fragment>
      ))}
    </>
  );
}
