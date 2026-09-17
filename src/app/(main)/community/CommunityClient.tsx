'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  addComment,
  addReply,
  createPost,
  deleteComment as apiDeleteComment,
  deletePost,
  deleteReply as apiDeleteReply,
  listPosts,
  listTrendingPlaces,
  MAX_POST_IMAGES,
  resizePostImageFile,
  togglePostBookmark,
  togglePostLike,
  toggleCommentLike as apiToggleCommentLike,
  toggleReplyLike as apiToggleReplyLike,
  updatePost,
  type PostView,
} from '@/lib/community';
import { avatarColorFor } from '@/lib/avatar';
import { formatRelativeTime } from '@/lib/format';
import { useSession } from '@/components/providers/SessionProvider';
import { Button, HighlightedCaption, Modal, PlaceholderImage } from '@/components/ui';

import { CommentThread } from './CommentThread';
import { POPULAR_TAGS, REGIONS } from './data';
import styles from './community.module.css';

type SortMode = 'popular' | 'latest' | 'oldest';
type ViewMode = 'list' | 'grid';

const PAGE_STEP = 5;
const INLINE_COMMENT_THRESHOLD = 4;

/** 답글까지 합친 총 댓글 수 (목록 카드/댓글 수 배지에 표시하는 값). */
function totalCommentCount(post: PostView): number {
  return post.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);
}

/** 게시물 사진 — 실제 첨부 사진이 있으면 그걸 보여주고, 없으면(마이그레이션 이전 글) 기존 PlaceholderImage 를 유지한다. */
function PostPhoto({ images, label }: { images: string[]; label: string }) {
  if (images.length === 0) return <PlaceholderImage label={label} />;
  // eslint-disable-next-line @next/next/no-img-element -- data URL 로 저장된 사진, next/image 최적화 대상 아님
  return <img src={images[0]} alt={label} className={styles.postPhotoImg} />;
}

/** 댓글 상세 팝업 상단의 작성자 글(제목). 3줄을 넘으면 "전체 보기/접기"로 잘라 보여준다. */
function PostCaption({ author, caption }: { author: string; caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, [caption]);

  return (
    <div className={styles.modalCaptionBlock}>
      <p ref={textRef} className={expanded ? styles.captionFull : styles.captionClamped}>
        <b>{author}</b> <HighlightedCaption text={caption} />
      </p>
      {overflowing ? (
        <button
          type="button"
          className={styles.captionToggleBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '접기' : '전체 보기'}
        </button>
      ) : null}
    </div>
  );
}

/** legacy/Community.dc.html 을 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function CommunityClient() {
  const router = useRouter();
  const { isLoggedIn, user } = useSession();
  const myAuthorName = user?.nickname || user?.name || '';
  const [posts, setPosts] = useState<PostView[]>([]);
  const [trending, setTrending] = useState<{ name: string; count: number }[]>([]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPlace, setDraftPlace] = useState('');
  const [draftCaption, setDraftCaption] = useState('');
  const [draftRegion, setDraftRegion] = useState(REGIONS[1]);
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<'idle' | 'loading'>('idle');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [regionExpanded, setRegionExpanded] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  const [profileAuthor, setProfileAuthor] = useState<string | null>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openReplyBoxes, setOpenReplyBoxes] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [commentModalId, setCommentModalId] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [commentDeleteTarget, setCommentDeleteTarget] = useState<{
    commentId: string;
    replyId?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPosts().then((list) => {
      if (!cancelled) setPosts(list);
    });
    listTrendingPlaces().then((list) => {
      if (!cancelled) setTrending(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!commentModalId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommentModalId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commentModalId]);

  const runSearch = () => {
    setSearchQuery(searchInput.trim());
    setVisibleCount(PAGE_STEP);
  };

  const requireLogin = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return false;
    }
    return true;
  };

  // ---- 좋아요 / 북마크 ----
  const toggleLike = (id: string) => {
    if (!requireLogin()) return;
    togglePostLike(id).then(setPosts);
  };
  const toggleBookmark = (id: string) => {
    if (!requireLogin()) return;
    togglePostBookmark(id).then(setPosts);
  };

  // ---- 댓글 / 답글 ----
  const toggleCommentLike = (commentId: string) => {
    if (!requireLogin()) return;
    apiToggleCommentLike(commentId).then(setPosts);
  };
  const toggleReplyLike = (_commentId: string, replyId: string) => {
    if (!requireLogin()) return;
    apiToggleReplyLike(replyId).then(setPosts);
  };
  const deleteComment = (commentId: string) => {
    if (!requireLogin()) return;
    setCommentDeleteTarget({ commentId });
  };
  const deleteReply = (commentId: string, replyId: string) => {
    if (!requireLogin()) return;
    setCommentDeleteTarget({ commentId, replyId });
  };
  const confirmDeleteComment = async () => {
    if (!commentDeleteTarget) return;
    const { replyId } = commentDeleteTarget;
    const next = replyId
      ? await apiDeleteReply(replyId)
      : await apiDeleteComment(commentDeleteTarget.commentId);
    setPosts(next);
    setCommentDeleteTarget(null);
  };
  const toggleReplyBox = (commentId: string) =>
    setOpenReplyBoxes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  const onReplyInput = (commentId: string, value: string) =>
    setReplyDrafts((prev) => ({ ...prev, [commentId]: value }));
  const submitReply = (_postId: string, commentId: string) => {
    if (!requireLogin()) return;
    const text = (replyDrafts[commentId] ?? '').trim();
    if (!text) return;
    addReply(commentId, text).then(setPosts);
    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
  };
  const onCommentInput = (id: string, value: string) =>
    setCommentDrafts((prev) => ({ ...prev, [id]: value }));
  const submitComment = (id: string) => {
    if (!requireLogin()) return;
    const text = (commentDrafts[id] ?? '').trim();
    if (!text) return;
    addComment(id, text).then(setPosts);
    setCommentDrafts((prev) => ({ ...prev, [id]: '' }));
  };
  // ---- 삭제 ----
  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setDeleteConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const next = await deletePost(pendingDeleteId);
    setPosts(next);
    setDeleteConfirmOpen(false);
    setPendingDeleteId(null);
  };

  // ---- 글쓰기 / 수정 ----
  const openComposer = () => {
    if (!requireLogin()) return;
    setComposerOpen(true);
    setEditingId(null);
    setDraftPlace('');
    setDraftCaption('');
    setDraftRegion(REGIONS[1]);
    setDraftImages([]);
    setPhotoError(null);
  };
  const openEditComposer = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    setComposerOpen(true);
    setEditingId(id);
    setDraftPlace(post.place);
    setDraftCaption(post.caption);
    setDraftRegion(post.region);
    setPhotoError(null);
  };
  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_POST_IMAGES - draftImages.length);
    e.target.value = '';
    if (files.length === 0) return;
    const resized = await Promise.all(files.map(resizePostImageFile));
    setDraftImages((prev) => [...prev, ...resized]);
    setPhotoError(null);
  };
  const removeDraftImage = (index: number) => {
    setDraftImages((prev) => prev.filter((_, i) => i !== index));
  };
  const showToast = (message: string) => {
    setToastMsg(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };
  const saveComposer = async () => {
    const place = draftPlace.trim();
    const caption = draftCaption.trim();
    if (!place || !caption) return;
    const tags = Array.from(caption.matchAll(/#(\S+)/g)).map((m) => m[1]);

    if (editingId) {
      const next = await updatePost(editingId, { place, region: draftRegion, caption, tags });
      setPosts(next);
      setComposerOpen(false);
      setEditingId(null);
      return;
    }

    if (draftImages.length === 0) {
      setPhotoError('사진을 1장 이상 첨부해주세요.');
      return;
    }
    setPhotoError(null);
    setComposerStatus('loading');
    const next = await createPost({
      place,
      region: draftRegion,
      caption,
      tags,
      images: draftImages,
    });
    setPosts(next);
    setSortMode('latest');
    setComposerStatus('idle');
    setComposerOpen(false);
    showToast('게시물 업로드가 완료되었어요');
  };

  // ---- 목록 필터/정렬 ----
  const byRegion =
    selectedRegion === '전체' ? posts : posts.filter((p) => p.region === selectedRegion);
  const q = searchQuery.trim().toLowerCase();
  const bySearch = q
    ? byRegion.filter(
        (p) => p.place.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q),
      )
    : byRegion;
  const filtered = showBookmarksOnly
    ? bySearch.filter((p) => p.bookmarked)
    : profileAuthor
      ? bySearch.filter((p) => p.author === profileAuthor)
      : bySearch;
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sortMode === 'popular') return b.likeCount - a.likeCount;
        if (sortMode === 'oldest') return a.timestamp - b.timestamp;
        return b.timestamp - a.timestamp;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtered 는 매 렌더 새 배열이라 참조 대신 정렬 기준만 의존성으로 둔다
    [sortMode, posts, selectedRegion, searchQuery, showBookmarksOnly, profileAuthor],
  );

  const visiblePosts = sorted.slice(0, visibleCount);
  const profilePost = profileAuthor ? posts.find((p) => p.author === profileAuthor) : null;
  const commentModalPost = commentModalId ? posts.find((p) => p.id === commentModalId) : null;

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.title}>커뮤니티</h1>
          <p className={styles.subtitle}>
            다녀온 여행지의 감상평을 공유하고 다양한 여행 꿀팁을 나누어보세요
          </p>
        </div>
        <div className={styles.searchWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 고정 정적 아이콘, next/image 최적화 불필요 */}
          <img src="/icons/pinder_ant.png" alt="" className={styles.searchAntIcon} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            placeholder="게시글 키워드로 검색 (여행지, 내용 등)"
            className={styles.searchInput}
          />
          <button
            type="button"
            className={styles.searchSubmitBtn}
            aria-label="검색"
            onClick={runSearch}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 고정 정적 아이콘, next/image 최적화 불필요 */}
            <img src="/icons/search-icon.png" alt="" />
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <div
          className={
            regionExpanded ? styles.regionOuter : `${styles.regionOuter} ${styles.regionCollapsed}`
          }
        >
          <button
            type="button"
            className={styles.regionToggle}
            onClick={() => setRegionExpanded((v) => !v)}
            aria-expanded={regionExpanded}
          >
            <span className={styles.regionToggleLabel}>지역 선택</span>
            <span aria-hidden>{regionExpanded ? '▴' : '▾'}</span>
          </button>
          <div className={styles.regionCol}>
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={
                  selectedRegion === r
                    ? `${styles.regionItem} ${styles.regionActive}`
                    : styles.regionItem
                }
                onClick={() => {
                  setSelectedRegion(r);
                  setProfileAuthor(null);
                  setVisibleCount(PAGE_STEP);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.mainCol}>
          <div className={styles.sortRow}>
            <div className={styles.sortOptions}>
              {(['popular', 'latest', 'oldest'] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={
                    sortMode === mode ? `${styles.sortBtn} ${styles.sortBtnActive}` : styles.sortBtn
                  }
                  onClick={() => setSortMode(mode)}
                >
                  {mode === 'popular' ? '인기순' : mode === 'latest' ? '최신순' : '오래된순'}
                </button>
              ))}
            </div>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={styles.viewBtn}
                style={{ color: viewMode === 'list' ? 'var(--pd-link)' : 'var(--pd-text-sub)' }}
                onClick={() => setViewMode('list')}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
                </svg>
                목록
              </button>
              <span className={styles.viewDivider} />
              <button
                type="button"
                className={styles.viewBtn}
                style={{ color: viewMode === 'grid' ? 'var(--pd-link)' : 'var(--pd-text-sub)' }}
                onClick={() => setViewMode('grid')}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="9.5" r="1.8" fill="currentColor" stroke="none" />
                  <path d="M21 15l-5-5-9 9" />
                </svg>
                사진
              </button>
            </div>
          </div>

          {profileAuthor ? (
            <div className={styles.profileBar}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setProfileAuthor(null)}
              >
                ←
              </button>
              <span
                className={styles.profileAvatar}
                style={{
                  background: avatarColorFor(profileAuthor),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {profileAuthor.slice(0, 1)}
              </span>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{profileAuthor}</div>
                <div className={styles.profilePostCount}>게시물 {filtered.length}개</div>
              </div>
              {profileAuthor === myAuthorName || profilePost?.isMine ? (
                <>
                  <button
                    type="button"
                    className={
                      showBookmarksOnly
                        ? `${styles.pillBtn} ${styles.pillBtnActive}`
                        : styles.pillBtn
                    }
                    onClick={() => setShowBookmarksOnly((v) => !v)}
                  >
                    <span
                      className={styles.iconMask}
                      style={{
                        width: 13,
                        height: 13,
                        maskImage: 'url(/icons/bookmark-icon.png)',
                        WebkitMaskImage: 'url(/icons/bookmark-icon.png)',
                        background: showBookmarksOnly ? '#2f6b45' : 'var(--pd-text)',
                      }}
                    />
                    저장
                  </button>
                  <button
                    type="button"
                    className={styles.pillBtn}
                    onClick={() => router.push('/my-page')}
                  >
                    프로필 설정
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {sorted.length === 0 ? (
            <p className={styles.empty}>{q ? '검색 결과가 없어요' : '아직 게시물이 없어요'}</p>
          ) : null}

          {viewMode === 'grid' ? (
            <div className={styles.grid}>
              {visiblePosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={styles.gridCell}
                  onClick={() => setProfileAuthor(post.author)}
                >
                  <PostPhoto images={post.images} label={`${post.place} 사진`} />
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.list}>
              {visiblePosts.map((post) => {
                const total = totalCommentCount(post);
                const showInlineAll = total < INLINE_COMMENT_THRESHOLD;
                const visibleComments = showInlineAll ? post.comments : post.comments.slice(0, 1);
                const likeColor = post.liked ? '#e5342e' : 'var(--pd-text-sub)';
                const bookmarkColor = post.bookmarked ? 'var(--pd-brand)' : 'var(--pd-text-sub)';
                return (
                  <article key={post.id} className={styles.postCard}>
                    <div className={styles.postHead}>
                      <button
                        type="button"
                        className={styles.postAvatarBtn}
                        onClick={() => setProfileAuthor(post.author)}
                      >
                        <span
                          className={styles.postAvatar}
                          style={{
                            background: avatarColorFor(post.author),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                          }}
                        >
                          {post.author.slice(0, 1)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.postAuthorBtn}
                        onClick={() => setProfileAuthor(post.author)}
                      >
                        <div className={styles.postAuthor}>{post.author}</div>
                        <div className={styles.postMeta}>
                          {post.place} · {formatRelativeTime(post.timestamp)}
                        </div>
                      </button>
                      {post.isMine ? (
                        <div className={styles.postOwnerActions}>
                          <button
                            type="button"
                            className={styles.textBtn}
                            onClick={() => openEditComposer(post.id)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className={styles.textBtnDanger}
                            onClick={() => requestDelete(post.id)}
                          >
                            삭제
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.postImage}>
                      <PostPhoto images={post.images} label={`${post.place} 사진`} />
                    </div>

                    <div className={styles.postBody}>
                      <div className={styles.postActions}>
                        <button
                          type="button"
                          className={styles.likeBtn}
                          style={{ color: likeColor }}
                          onClick={() => toggleLike(post.id)}
                        >
                          {post.liked ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={likeColor}>
                              <path d="M12 21s-6.7-4.35-9.3-8.1C1.1 10.6 1.6 7.4 4.2 5.7c2.2-1.4 5-.8 6.6 1.1l1.2 1.4 1.2-1.4c1.6-1.9 4.4-2.5 6.6-1.1 2.6 1.7 3.1 4.9 1.5 7.2C18.7 16.65 12 21 12 21Z" />
                            </svg>
                          ) : (
                            <span
                              className={styles.iconMask}
                              style={{
                                maskImage: 'url(/icons/heart.png)',
                                WebkitMaskImage: 'url(/icons/heart.png)',
                                background: likeColor,
                              }}
                            />
                          )}
                          <span>{post.likeCount}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.commentCountBtn}
                          onClick={() => setCommentModalId(post.id)}
                        >
                          <span
                            className={styles.iconMask}
                            style={{
                              maskImage: 'url(/icons/message-circle.png)',
                              WebkitMaskImage: 'url(/icons/message-circle.png)',
                              background: 'var(--pd-text-sub)',
                            }}
                          />
                          <span>{total}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.bookmarkBtn}
                          onClick={() => toggleBookmark(post.id)}
                          aria-label="저장"
                        >
                          {post.bookmarked ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarkColor}>
                              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
                            </svg>
                          ) : (
                            <span
                              className={styles.iconMask}
                              style={{
                                maskImage: 'url(/icons/bookmark-icon.png)',
                                WebkitMaskImage: 'url(/icons/bookmark-icon.png)',
                                background: bookmarkColor,
                              }}
                            />
                          )}
                        </button>
                      </div>

                      <p className={styles.caption}>
                        <b>{post.author}</b> <HighlightedCaption text={post.caption} />
                      </p>

                      {post.tags.length > 0 ? (
                        <div className={styles.tagRow}>
                          {post.tags.map((tag) => (
                            <span key={tag} className={styles.postTag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <CommentThread
                        comments={visibleComments}
                        openReplyBoxes={openReplyBoxes}
                        replyDrafts={replyDrafts}
                        onToggleCommentLike={(commentId) => toggleCommentLike(commentId)}
                        onToggleReplyLike={(commentId, replyId) =>
                          toggleReplyLike(commentId, replyId)
                        }
                        onToggleReplyBox={toggleReplyBox}
                        onReplyInput={onReplyInput}
                        onReplySubmit={(commentId) => submitReply(post.id, commentId)}
                        onDeleteComment={deleteComment}
                        onDeleteReply={deleteReply}
                      />

                      {!showInlineAll ? (
                        <button
                          type="button"
                          className={styles.moreCommentsBtn}
                          onClick={() => setCommentModalId(post.id)}
                        >
                          댓글 {total}개 더보기
                        </button>
                      ) : null}

                      <div className={styles.commentInputRow}>
                        <input
                          value={commentDrafts[post.id] ?? ''}
                          onChange={(e) => onCommentInput(post.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitComment(post.id);
                          }}
                          placeholder="댓글 달기..."
                          className={styles.commentInput}
                        />
                        <button
                          type="button"
                          className={styles.postBtn}
                          onClick={() => submitComment(post.id)}
                        >
                          게시
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {sorted.length > visibleCount ? (
            <button
              type="button"
              className={styles.showMoreBtn}
              onClick={() => setVisibleCount((v) => v + PAGE_STEP)}
            >
              더보기
            </button>
          ) : null}
        </div>

        <div className={styles.sideCol}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardHead}>
              <span className={styles.sideCardHeadLeft}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 고정 정적 아이콘 */}
                <img src="/icons/flame.png" alt="" className={styles.sideCardHeadIcon} />
                이번 주 인기 여행지
              </span>
              <span className={styles.liveTag}>실시간</span>
            </div>
            <div className={styles.trendingList}>
              {trending.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  className={styles.trendingItem}
                  onClick={() => {
                    const keyword = t.name.split(' ')[0];
                    setSearchInput(keyword);
                    setSearchQuery(keyword);
                    setVisibleCount(PAGE_STEP);
                  }}
                >
                  <span
                    className={styles.trendingRank}
                    style={{ color: i === 0 ? 'var(--pd-link)' : 'var(--pd-text-sub)' }}
                  >
                    {i + 1}
                  </span>
                  <span className={styles.trendingInfo}>
                    <span className={styles.trendingName}>{t.name}</span>
                    <span className={styles.trendingCount}>게시글 {t.count}개</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sideCard}>
            <div className={styles.sideCardHead}>
              <span className={styles.sideCardHeadLeft}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 고정 정적 아이콘 */}
                <img src="/icons/tag.png" alt="" className={styles.sideCardHeadIconSm} />
                추천 태그
              </span>
            </div>
            <div className={styles.tagCloud}>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.cloudTag}
                  onClick={() => {
                    setSearchInput(tag);
                    setSearchQuery(tag);
                    setVisibleCount(PAGE_STEP);
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className={styles.writeBtn} onClick={openComposer}>
            여행 후기 쓰기
            {/* eslint-disable-next-line @next/next/no-img-element -- 고정 정적 아이콘 */}
            <img src="/icons/pencil-line.png" alt="" className={styles.writeBtnIcon} />
          </button>
          <button
            type="button"
            className={styles.myProfileBtn}
            onClick={() => {
              if (!requireLogin()) return;
              setProfileAuthor(myAuthorName);
            }}
          >
            내 프로필 보기
          </button>
        </div>
      </div>

      {/* 글쓰기 / 수정 */}
      <Modal
        open={composerOpen}
        title={editingId ? '후기 수정' : '여행 후기 쓰기'}
        onClose={() => setComposerOpen(false)}
      >
        {editingId ? (
          <div className={styles.composerPhoto}>
            <PlaceholderImage label="사진을 추가해주세요" />
          </div>
        ) : (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>사진</span>
            <div className={styles.composerPhotoPicker}>
              {draftImages.map((src, i) => (
                <div key={i} className={styles.composerPhotoThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL 미리보기, next/image 최적화 대상 아님 */}
                  <img src={src} alt="" className={styles.composerPhotoThumbImg} />
                  <button
                    type="button"
                    className={styles.composerPhotoRemoveBtn}
                    onClick={() => removeDraftImage(i)}
                    aria-label="사진 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {draftImages.length < MAX_POST_IMAGES ? (
                <button
                  type="button"
                  className={styles.composerPhotoAddBtn}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <span className={styles.composerPhotoAddIcon}>+</span>
                  <span>사진 추가</span>
                </button>
              ) : null}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.hiddenFileInput}
                onChange={onPickImages}
              />
            </div>
            {photoError ? <p className={styles.photoError}>{photoError}</p> : null}
          </div>
        )}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>여행지</span>
          <input
            value={draftPlace}
            onChange={(e) => setDraftPlace(e.target.value)}
            className={styles.fieldInput}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>지역</span>
          <select
            value={draftRegion}
            onChange={(e) => setDraftRegion(e.target.value)}
            className={styles.fieldInput}
          >
            {REGIONS.slice(1).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>감상평</span>
          <textarea
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            rows={3}
            placeholder="#태그를 달면 초록색으로 표시돼요"
            className={styles.fieldTextarea}
          />
          {draftCaption ? (
            <p className={styles.tagPreview}>
              <HighlightedCaption text={draftCaption} tagsOnly />
            </p>
          ) : null}
        </div>
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setComposerOpen(false)}
            disabled={composerStatus === 'loading'}
          >
            취소
          </Button>
          <Button size="sm" onClick={saveComposer} disabled={composerStatus === 'loading'}>
            {composerStatus === 'loading' ? '게시물을 올리고 있어요' : '게시'}
          </Button>
        </div>
      </Modal>

      {/* 댓글 상세: 좌측 사진 / 우측 댓글창 2단 구조 */}
      {commentModalPost ? (
        <div className={styles.commentModalOverlay} onClick={() => setCommentModalId(null)}>
          <div className={styles.commentModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.commentModalPhoto}>
              <PostPhoto
                images={commentModalPost.images}
                label={`${commentModalPost.place} 사진`}
              />
            </div>
            <div className={styles.commentModalRight}>
              <div className={styles.commentModalHead}>
                <span
                  className={styles.postAvatar}
                  style={{
                    background: avatarColorFor(commentModalPost.author),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {commentModalPost.author.slice(0, 1)}
                </span>
                <div className={styles.commentModalHeadInfo}>
                  <div className={styles.postAuthor}>{commentModalPost.author}</div>
                  <div className={styles.postMeta}>
                    {commentModalPost.place} · {formatRelativeTime(commentModalPost.timestamp)}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.commentModalCloseBtn}
                  onClick={() => setCommentModalId(null)}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>

              <div className={styles.commentModalScroll}>
                <PostCaption author={commentModalPost.author} caption={commentModalPost.caption} />
                {commentModalPost.comments.length === 0 ? (
                  <p className={styles.empty}>아직 댓글이 없어요</p>
                ) : (
                  <CommentThread
                    comments={commentModalPost.comments}
                    openReplyBoxes={openReplyBoxes}
                    replyDrafts={replyDrafts}
                    onToggleCommentLike={(commentId) => toggleCommentLike(commentId)}
                    onToggleReplyLike={(commentId, replyId) => toggleReplyLike(commentId, replyId)}
                    onToggleReplyBox={toggleReplyBox}
                    onReplyInput={onReplyInput}
                    onReplySubmit={(commentId) => submitReply(commentModalPost.id, commentId)}
                    onDeleteComment={deleteComment}
                    onDeleteReply={deleteReply}
                  />
                )}
              </div>

              <div className={styles.commentModalLikeBar}>
                <button
                  type="button"
                  className={styles.likeBtn}
                  style={{ color: commentModalPost.liked ? '#e5342e' : 'var(--pd-text-sub)' }}
                  onClick={() => toggleLike(commentModalPost.id)}
                >
                  {commentModalPost.liked ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill={commentModalPost.liked ? '#e5342e' : 'var(--pd-text-sub)'}
                    >
                      <path d="M12 21s-6.7-4.35-9.3-8.1C1.1 10.6 1.6 7.4 4.2 5.7c2.2-1.4 5-.8 6.6 1.1l1.2 1.4 1.2-1.4c1.6-1.9 4.4-2.5 6.6-1.1 2.6 1.7 3.1 4.9 1.5 7.2C18.7 16.65 12 21 12 21Z" />
                    </svg>
                  ) : (
                    <span
                      className={styles.iconMask}
                      style={{
                        maskImage: 'url(/icons/heart.png)',
                        WebkitMaskImage: 'url(/icons/heart.png)',
                        background: 'var(--pd-text-sub)',
                      }}
                    />
                  )}
                  <span>{commentModalPost.likeCount}</span>
                </button>
              </div>

              <div className={styles.commentModalInputRow}>
                <input
                  value={commentDrafts[commentModalPost.id] ?? ''}
                  onChange={(e) => onCommentInput(commentModalPost.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitComment(commentModalPost.id);
                  }}
                  placeholder="댓글 달기..."
                  className={styles.commentInput}
                />
                <button
                  type="button"
                  className={styles.postBtn}
                  onClick={() => submitComment(commentModalPost.id)}
                >
                  게시
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 삭제 확인 */}
      <Modal
        open={deleteConfirmOpen}
        title="삭제하시겠습니까?"
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <p className={styles.deleteDesc}>삭제한 게시물은 되돌릴 수 없어요</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
            취소
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>
            삭제
          </Button>
        </div>
      </Modal>

      {/* 댓글/답글 삭제 확인 */}
      <Modal
        open={Boolean(commentDeleteTarget)}
        title="삭제하시겠습니까?"
        onClose={() => setCommentDeleteTarget(null)}
      >
        <p className={styles.deleteDesc}>
          삭제한 {commentDeleteTarget?.replyId ? '답글은' : '댓글은'} 되돌릴 수 없어요
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setCommentDeleteTarget(null)}>
            취소
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDeleteComment}>
            삭제
          </Button>
        </div>
      </Modal>

      {toastVisible ? (
        <div className={styles.toast}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7BCB93"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}
