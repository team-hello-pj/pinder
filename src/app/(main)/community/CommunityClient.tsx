'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  addComment,
  addReply,
  createPost,
  deletePost,
  listPosts,
  listTrendingPlaces,
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

/** legacy/Community.dc.html 을 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function CommunityClient() {
  const router = useRouter();
  const { isLoggedIn, isLoading: sessionLoading } = useSession();
  const authGateOpen = !sessionLoading && !isLoggedIn;
  const [posts, setPosts] = useState<PostView[]>([]);
  const [trending, setTrending] = useState<{ name: string; count: number }[]>([]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPlace, setDraftPlace] = useState('');
  const [draftCaption, setDraftCaption] = useState('');
  const [draftRegion, setDraftRegion] = useState(REGIONS[1]);

  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  const [profileAuthor, setProfileAuthor] = useState<string | null>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [openReplyBoxes, setOpenReplyBoxes] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [commentModalId, setCommentModalId] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);

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

  const requireLogin = () => {
    if (!isLoggedIn) {
      setLoginRequiredOpen(true);
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
  const toggleComments = (id: string) =>
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));

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
  };
  const openEditComposer = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    setComposerOpen(true);
    setEditingId(id);
    setDraftPlace(post.place);
    setDraftCaption(post.caption);
    setDraftRegion(post.region);
  };
  const saveComposer = async () => {
    const place = draftPlace.trim();
    const caption = draftCaption.trim();
    if (!place || !caption) return;
    const tags = Array.from(caption.matchAll(/#(\S+)/g)).map((m) => m[1]);
    const next = editingId
      ? await updatePost(editingId, { place, region: draftRegion, caption, tags })
      : await createPost({ place, region: draftRegion, caption, tags });
    setPosts(next);
    setComposerOpen(false);
    setEditingId(null);
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

  if (sessionLoading) return null; // 인증 상태 확인 중 (비로그인으로 오판하지 않도록 대기)

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <Modal
          open={authGateOpen}
          title="회원만 이용할 수 있어요"
          onClose={() => router.push('/')}
        >
          <p className={styles.deleteDesc}>
            로그인하면 커뮤니티의 다양한 기능을 이용할 수 있어요.
          </p>
          <div className={styles.modalActions}>
            <Button variant="secondary" size="sm" onClick={() => router.push('/login')}>
              로그인
            </Button>
            <Button size="sm" onClick={() => router.push('/signup')}>
              회원가입
            </Button>
          </div>
        </Modal>
      </div>
    );
  }

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
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_STEP);
            }}
            placeholder="게시글 키워드로 검색 (여행지, 내용 등)"
            className={styles.searchInput}
          />
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
        </div>
      </div>

      <div className={styles.row}>
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
                ☰ 목록
              </button>
              <span className={styles.viewDivider} />
              <button
                type="button"
                className={styles.viewBtn}
                style={{ color: viewMode === 'grid' ? 'var(--pd-link)' : 'var(--pd-text-sub)' }}
                onClick={() => setViewMode('grid')}
              >
                ⊞ 사진
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
              {profilePost?.isMine ? (
                <button
                  type="button"
                  className={
                    showBookmarksOnly ? `${styles.pillBtn} ${styles.pillBtnActive}` : styles.pillBtn
                  }
                  onClick={() => setShowBookmarksOnly((v) => !v)}
                >
                  🔖 저장
                </button>
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
                  <PlaceholderImage label={`${post.place} 사진`} />
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.list}>
              {visiblePosts.map((post) => {
                const expanded = Boolean(expandedComments[post.id]);
                const visibleComments = expanded ? post.comments : post.comments.slice(0, 1);
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
                      <PlaceholderImage label={`${post.place} 사진`} />
                    </div>

                    <div className={styles.postBody}>
                      <div className={styles.postActions}>
                        <button
                          type="button"
                          className={styles.likeBtn}
                          style={{ color: post.liked ? '#e5342e' : 'var(--pd-text-sub)' }}
                          onClick={() => toggleLike(post.id)}
                        >
                          {post.liked ? '♥' : '♡'} {post.likeCount}
                        </button>
                        <button
                          type="button"
                          className={styles.commentCountBtn}
                          onClick={() => setCommentModalId(post.id)}
                        >
                          💬 {post.comments.length}
                        </button>
                        <button
                          type="button"
                          className={styles.bookmarkBtn}
                          style={{
                            color: post.bookmarked ? 'var(--pd-brand)' : 'var(--pd-text-sub)',
                          }}
                          onClick={() => toggleBookmark(post.id)}
                        >
                          {post.bookmarked ? '🔖' : '📑'}
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
                      />

                      {!expanded && post.comments.length > 1 ? (
                        <button
                          type="button"
                          className={styles.moreCommentsBtn}
                          onClick={() => toggleComments(post.id)}
                        >
                          댓글 {post.comments.length - 1}개 더보기
                        </button>
                      ) : null}
                      {expanded && post.comments.length > 1 ? (
                        <button
                          type="button"
                          className={styles.moreCommentsBtn}
                          onClick={() => toggleComments(post.id)}
                        >
                          댓글 접기
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
              <span>🔥 이번 주 인기 여행지</span>
              <span className={styles.liveTag}>실시간</span>
            </div>
            <div className={styles.trendingList}>
              {trending.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  className={styles.trendingItem}
                  onClick={() => {
                    setSearchQuery(t.name.split(' ')[0]);
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
              <span>🏷 추천 태그</span>
            </div>
            <div className={styles.tagCloud}>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.cloudTag}
                  onClick={() => {
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
            여행 후기 쓰기 ✎
          </button>
        </div>
      </div>

      {/* 글쓰기 / 수정 */}
      <Modal
        open={composerOpen}
        title={editingId ? '후기 수정' : '여행 후기 쓰기'}
        onClose={() => setComposerOpen(false)}
      >
        <div className={styles.composerPhoto}>
          <PlaceholderImage label="사진을 추가해주세요" />
        </div>
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
          <Button variant="secondary" size="sm" onClick={() => setComposerOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={saveComposer}>
            게시
          </Button>
        </div>
      </Modal>

      {/* 댓글 상세 */}
      <Modal
        open={Boolean(commentModalPost)}
        title={commentModalPost ? `${commentModalPost.author}님의 게시물` : '게시물'}
        onClose={() => setCommentModalId(null)}
      >
        {commentModalPost ? (
          <div className={styles.commentModalBody}>
            <p className={styles.caption}>
              <b>{commentModalPost.author}</b>{' '}
              <HighlightedCaption text={commentModalPost.caption} />
            </p>
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
              />
            )}
            <div className={styles.commentInputRow}>
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
        ) : null}
      </Modal>

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

      {/* 로그인 필요 */}
      <Modal
        open={loginRequiredOpen}
        title="로그인이 필요해요"
        onClose={() => setLoginRequiredOpen(false)}
      >
        <p className={styles.deleteDesc}>글쓰기, 좋아요, 댓글은 로그인 후 이용할 수 있어요.</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setLoginRequiredOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={() => router.push('/login')}>
            로그인하기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
