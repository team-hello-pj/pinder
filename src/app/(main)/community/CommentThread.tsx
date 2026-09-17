'use client';

import type { CommentView } from '@/lib/community';
import { AuthorAvatar } from '@/components/ui';

import styles from './community.module.css';

export interface CommentThreadProps {
  comments: CommentView[];
  openReplyBoxes: Record<string, boolean>;
  replyDrafts: Record<string, string>;
  onToggleCommentLike: (commentId: string) => void;
  onToggleReplyLike: (commentId: string, replyId: string) => void;
  onToggleReplyBox: (commentId: string) => void;
  onReplyInput: (commentId: string, value: string) => void;
  onReplySubmit: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteReply: (commentId: string, replyId: string) => void;
}

/**
 * 댓글 + 답글 목록. 피드 카드 안과 댓글 상세 모달 양쪽에서 재사용한다
 * (legacy 에서는 두 군데에 거의 같은 마크업이 중복돼 있었다).
 */
export function CommentThread({
  comments,
  openReplyBoxes,
  replyDrafts,
  onToggleCommentLike,
  onToggleReplyLike,
  onToggleReplyBox,
  onReplyInput,
  onReplySubmit,
  onDeleteComment,
  onDeleteReply,
}: CommentThreadProps) {
  return (
    <div className={styles.commentList}>
      {comments.map((cmt) => (
        <div key={cmt.id} className={styles.commentBlock}>
          <div className={styles.commentRow}>
            <AuthorAvatar
              name={cmt.author}
              avatarUrl={cmt.authorAvatarUrl}
              isMine={cmt.isMine}
              className={styles.commentAvatar}
            />
            <div className={styles.commentText}>
              <b>{cmt.author}</b> {cmt.text}
            </div>
            <button
              type="button"
              className={styles.commentLikeBtn}
              style={{ color: cmt.liked ? '#e5484d' : 'var(--pd-text-sub)' }}
              onClick={() => onToggleCommentLike(cmt.id)}
            >
              {cmt.liked ? '♥' : '♡'} {cmt.likeCount}
            </button>
            <button
              type="button"
              className={styles.replyToggleBtn}
              onClick={() => onToggleReplyBox(cmt.id)}
            >
              답글
            </button>
            {cmt.isMine ? (
              <button
                type="button"
                className={styles.commentDeleteBtn}
                onClick={() => onDeleteComment(cmt.id)}
              >
                삭제
              </button>
            ) : null}
          </div>

          {cmt.replies.map((rep) => (
            <div key={rep.id} className={styles.replyRow}>
              <AuthorAvatar
                name={rep.author}
                avatarUrl={rep.authorAvatarUrl}
                isMine={rep.isMine}
                className={styles.replyAvatar}
              />
              <div className={styles.replyText}>
                <b>{rep.author}</b> {rep.text}
              </div>
              <button
                type="button"
                className={styles.replyLikeBtn}
                style={{ color: rep.liked ? '#e5484d' : 'var(--pd-text-sub)' }}
                onClick={() => onToggleReplyLike(cmt.id, rep.id)}
              >
                {rep.liked ? '♥' : '♡'} {rep.likeCount}
              </button>
              {rep.isMine ? (
                <button
                  type="button"
                  className={styles.commentDeleteBtn}
                  onClick={() => onDeleteReply(cmt.id, rep.id)}
                >
                  삭제
                </button>
              ) : null}
            </div>
          ))}

          {openReplyBoxes[cmt.id] ? (
            <div className={styles.replyInputRow}>
              <input
                value={replyDrafts[cmt.id] ?? ''}
                onChange={(e) => onReplyInput(cmt.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onReplySubmit(cmt.id);
                }}
                placeholder="답글 달기..."
                className={styles.replyInput}
              />
              <button
                type="button"
                className={styles.postBtn}
                onClick={() => onReplySubmit(cmt.id)}
              >
                게시
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
