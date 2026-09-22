'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  addComment,
  addReply,
  createPost,
  deleteComment as apiDeleteComment,
  deletePost,
  deleteReply as apiDeleteReply,
  getPostImages,
  listPosts,
  listTrendingPlaces,
  MAX_POST_IMAGES,
  togglePostBookmark,
  togglePostLike,
  toggleCommentLike as apiToggleCommentLike,
  toggleReplyLike as apiToggleReplyLike,
  updatePost,
  type PostView,
} from '@/lib/community';
import { formatRelativeTime } from '@/lib/format';
import { useSession } from '@/components/providers/SessionProvider';
import {
  AuthorAvatar,
  Button,
  HighlightedCaption,
  ImageCropModal,
  Modal,
  PlaceholderImage,
} from '@/components/ui';

import { CommentThread } from './CommentThread';
import { POPULAR_TAGS, REGIONS } from './data';
import styles from './community.module.css';

type SortMode = 'popular' | 'latest' | 'oldest';
type ViewMode = 'list' | 'grid';

const PAGE_STEP = 5;
const GRID_PAGE_STEP = 6;
const INLINE_COMMENT_THRESHOLD = 4;

/** 답글까지 합친 총 댓글 수 (목록 카드/댓글 수 배지에 표시하는 값). */
function totalCommentCount(post: PostView): number {
  return post.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);
}

/**
 * 게시물 사진 — 여러 장이면 좌우 화살표로 한 장씩 넘겨보고, 몇 번째/전체 장수를 보여준다.
 * 실제 첨부 사진이 없으면(마이그레이션 이전 글) 기존 PlaceholderImage 를 유지한다.
 * 우클릭 저장/드래그 저장/모바일 길게 눌러 저장을 막는다 — 완벽히 막을 수는 없지만
 * (스크린샷 등은 어차피 못 막는다) 실수로 쉽게 저장되는 건 줄인다.
 * interactive=false 면(그리드 썸네일처럼 이미 버튼 안에 들어가는 경우) 화살표 없이 장수만 표시한다
 * — 버튼 안에 버튼을 중첩할 수 없기 때문.
 */
function PostPhoto({
  images,
  label,
  interactive = true,
}: {
  images: string[];
  label: string;
  interactive?: boolean;
}) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return <PlaceholderImage label={label} />;

  const clampedIndex = Math.min(index, images.length - 1);
  const hasMultiple = images.length > 1;

  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => Math.max(0, i - 1));
  };
  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => Math.min(images.length - 1, i + 1));
  };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL 로 저장된 사진, next/image 최적화 대상 아님 */}
      <img
        src={images[clampedIndex]}
        alt={label}
        className={styles.postPhotoImg}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      />
      {hasMultiple ? (
        <>
          {interactive && clampedIndex > 0 ? (
            <button
              type="button"
              className={`${styles.postPhotoNavBtn} ${styles.postPhotoNavPrev}`}
              onClick={goPrev}
              aria-label="이전 사진"
            >
              ‹
            </button>
          ) : null}
          {interactive && clampedIndex < images.length - 1 ? (
            <button
              type="button"
              className={`${styles.postPhotoNavBtn} ${styles.postPhotoNavNext}`}
              onClick={goNext}
              aria-label="다음 사진"
            >
              ›
            </button>
          ) : null}
          <span className={styles.postPhotoCounter}>
            {clampedIndex + 1}/{images.length}
          </span>
        </>
      ) : null}
    </>
  );
}

/**
 * 게시물 본문(작성자 + 줄바꿈 유지된 캡션). 실제로 렌더링했을 때 5줄을 넘는 경우에만
 * "더보기/접기"를 보여준다 — 글자 수가 아니라 스크롤 높이 vs 실제 높이를 비교해
 * 진짜로 잘렸는지를 판단한다. 목록 카드와 댓글 상세 모달이 이 컴포넌트를 그대로 공유한다.
 */
function ClampedCaption({
  author,
  caption,
  className,
}: {
  author: string;
  caption: string;
  /** 폰트/색상/간격을 정하는 타이포그래피 클래스 — 접혔을 때는 여기에 captionLineClamp가 추가로 붙는다. */
  className: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, [caption]);

  return (
    <>
      <p ref={textRef} className={expanded ? className : `${className} ${styles.captionLineClamp}`}>
        <b>{author}</b> <HighlightedCaption text={caption} />
      </p>
      {overflowing ? (
        <button
          type="button"
          className={styles.captionToggleBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '접기' : '더보기'}
        </button>
      ) : null}
    </>
  );
}

/**
 * 목록 최초 조회(listPosts)가 끝나기 전 잠깐 보여주는 자리표시자.
 * .postCard 뼈대만 그대로 써서 실제 카드가 채워질 때 레이아웃이 튀지 않게 한다.
 */
function PostCardSkeleton() {
  return (
    <article className={styles.postCard} aria-hidden="true">
      <div className={styles.postHead}>
        <span className={`${styles.postAvatar} ${styles.skeletonBlock}`} />
        <div className={styles.skeletonTextGroup}>
          <span
            className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
            style={{ width: '35%' }}
          />
          <span
            className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
            style={{ width: '55%' }}
          />
        </div>
      </div>
      <div className={`${styles.postImage} ${styles.skeletonBlock}`} />
      <div className={styles.postBody}>
        <span
          className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
          style={{ width: '90%' }}
        />
        <span
          className={`${styles.skeletonLine} ${styles.skeletonBlock}`}
          style={{ width: '60%' }}
        />
      </div>
    </article>
  );
}

/** legacy/Community.dc.html 을 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function CommunityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedPostParamRef = useRef(false);
  const { isLoggedIn, isLoading: sessionLoading, user } = useSession();
  const myAuthorName = user?.nickname || user?.name || '';
  const [posts, setPosts] = useState<PostView[]>([]);
  // 최초 목록 조회(listPosts)가 끝나기 전까지는 posts가 그냥 빈 배열이라 "아직 게시물이
  // 없어요"로 잘못 보였다 — 로딩 중과 실제로 게시물이 0개인 상태를 구분해 스켈레톤을 보여준다.
  const [postsLoading, setPostsLoading] = useState(true);
  // 목록 응답(posts)에는 사진 원본이 빠져 있다 — 실제로 화면에 보이는 게시물의 사진만
  // postId 별로 따로 받아와 채워 넣는다(아래 이미지 지연 로딩 useEffect 참고).
  const [imagesByPostId, setImagesByPostId] = useState<Record<string, string[]>>({});
  const requestedImageIdsRef = useRef<Set<string>>(new Set());
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
  // 사진을 여러 장 고르면 하나씩 순서대로 4:3 위치 조정 팝업을 띄운다 — 아직 자르지 않고
  // 대기 중인 나머지 파일들과, 지금 자르는 중인 파일의 미리보기 URL을 들고 있는다.
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState('전체');
  // 접힘 상태는 767px 이하에서만 CSS로 반영된다(.regionCollapsed) — PC에서는 항상 펼쳐져 보인다.
  const [regionExpanded, setRegionExpanded] = useState(false);
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
    listPosts()
      .then((list) => {
        if (!cancelled) setPosts(list);
      })
      .finally(() => {
        if (!cancelled) setPostsLoading(false);
      });
    listTrendingPlaces().then((list) => {
      if (!cancelled) setTrending(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 알림에서 "/community?post=<id>" 로 들어온 경우, 게시물 목록이 로드되면 해당 게시물의
  // 상세(댓글) 모달을 자동으로 연다. 대상 게시물을 못 찾으면(삭제됨 등) 조용히 무시한다.
  useEffect(() => {
    if (appliedPostParamRef.current) return;
    const postId = searchParams.get('post');
    if (!postId) return;
    if (!posts.some((p) => p.id === postId)) return;
    appliedPostParamRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 게시물이 로드된 뒤 한 번만 연다
    setCommentModalId(postId);
  }, [posts, searchParams]);

  useEffect(() => {
    if (!commentModalId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommentModalId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commentModalId]);

  // "맨 위로" 버튼 — 300px 넘게 스크롤했을 때만 보여준다.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const runSearch = () => {
    setSearchQuery(searchInput.trim());
    setVisibleCount(viewMode === 'grid' ? GRID_PAGE_STEP : PAGE_STEP);
  };

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const requireLogin = () => {
    if (!isLoggedIn) {
      setAuthGateOpen(true);
      return false;
    }
    return true;
  };
  // 커뮤니티 탭에 처음 들어왔을 때도(특정 동작을 누르기 전이라도) 비로그인 상태면 바로 안내
  // 모달을 띄운다 — requireLogin() 이 쓰는 것과 같은 모달을 그대로 재사용한다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭에 들어왔을 때 한 번만 확인한다
    if (!sessionLoading && !isLoggedIn) setAuthGateOpen(true);
  }, [sessionLoading, isLoggedIn]);

  const openMyProfile = () => {
    if (!requireLogin()) return;
    setProfileAuthor(myAuthorName);
  };

  // ---- 좋아요 / 북마크 ----
  // 실패해도 아무 반응이 없으면 버튼이 안 눌리는 것처럼 보인다 — 실패를 토스트로 알린다.
  const onActionError = (err: unknown) =>
    showToast(err instanceof Error ? err.message : '요청을 처리하지 못했어요.');
  const toggleLike = (id: string) => {
    if (!requireLogin()) return;
    togglePostLike(id).then(setPosts).catch(onActionError);
  };
  const toggleBookmark = (id: string) => {
    if (!requireLogin()) return;
    togglePostBookmark(id).then(setPosts).catch(onActionError);
  };

  // ---- 댓글 / 답글 ----
  const toggleCommentLike = (commentId: string) => {
    if (!requireLogin()) return;
    apiToggleCommentLike(commentId).then(setPosts).catch(onActionError);
  };
  const toggleReplyLike = (_commentId: string, replyId: string) => {
    if (!requireLogin()) return;
    apiToggleReplyLike(replyId).then(setPosts).catch(onActionError);
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
    addReply(commentId, text).then(setPosts).catch(onActionError);
    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
  };
  const onCommentInput = (id: string, value: string) =>
    setCommentDrafts((prev) => ({ ...prev, [id]: value }));
  const submitComment = (id: string) => {
    if (!requireLogin()) return;
    const text = (commentDrafts[id] ?? '').trim();
    if (!text) return;
    addComment(id, text).then(setPosts).catch(onActionError);
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
    setCropQueue([]);
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
  /** 큐에 남은 파일이 있으면 그중 첫 장을 자르기 팝업에 띄운다. 없으면 팝업을 닫는다. */
  const advanceCropQueue = (queue: File[]) => {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!queue.length) {
      setCropQueue([]);
      return;
    }
    const [next, ...rest] = queue;
    setCropQueue(rest);
    setCropSrc(URL.createObjectURL(next));
  };
  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;

    // accept="image/*" 는 파일 선택창에서의 힌트일 뿐이라 드래그앤드롭 등으로는 우회될 수
    // 있다 — 영상 등 이미지가 아닌 파일은 여기서 한 번 더 걸러낸다.
    const imagesOnly = picked.filter((f) => f.type.startsWith('image/'));
    const rejectedCount = picked.length - imagesOnly.length;

    const remainingSlots = MAX_POST_IMAGES - draftImages.length;
    const files = imagesOnly.slice(0, remainingSlots);
    const overflowCount = imagesOnly.length - files.length;

    if (rejectedCount > 0) {
      setPhotoError('사진 파일만 첨부할 수 있어요 (영상은 지원하지 않아요).');
    } else if (overflowCount > 0) {
      setPhotoError(`사진은 최대 ${MAX_POST_IMAGES}장까지만 첨부할 수 있어요.`);
    } else {
      setPhotoError(null);
    }

    if (files.length === 0) return;
    advanceCropQueue(files);
  };
  const cancelCrop = () => advanceCropQueue(cropQueue);
  const confirmCrop = (dataUrl: string) => {
    setDraftImages((prev) => [...prev, dataUrl]);
    advanceCropQueue(cropQueue);
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
    try {
      const next = await createPost({
        place,
        region: draftRegion,
        caption,
        tags,
        images: draftImages,
      });
      setPosts(next);
      setSortMode('latest');
      setComposerOpen(false);
      showToast('게시물 업로드가 완료되었어요');
    } catch (err) {
      // createPost 가 실패해도 그냥 넘어가면(기존에는 여기서 던진 적이 없었다) 모달이 닫히고
      // "업로드가 완료되었어요" 토스트가 뜨는데 실제로는 게시물이 저장되지 않은 상태였다 —
      // 실패 메시지를 그대로 보여주고 모달을 열어 둔 채로 다시 시도할 수 있게 한다.
      setPhotoError(
        err instanceof Error ? err.message : '게시물을 올리지 못했어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setComposerStatus('idle');
    }
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

  /** 사진이 없어도(images가 빈 배열) imageCount로 알고 있으면 아직 안 불러온 것으로 본다. */
  const displayImagesOf = (post: PostView): string[] =>
    post.images.length > 0 ? post.images : (imagesByPostId[post.id] ?? []);

  // 화면에 실제로 보이는 게시물(목록/그리드에 노출 중인 것 + 댓글 상세 모달로 연 것)의
  // 사진만 그때그때 불러온다 — 게시물 전체 사진을 한 번에 받아오던 것이 최초 진입을
  // 느리게 만든 원인이었다. visiblePosts/commentModalPost는 매 렌더 새로 계산되는 값이라
  // effect가 자주 재실행되지만, requestedImageIdsRef가 게시물당 요청을 한 번으로 막아준다
  // (그래서 렌더마다 새로 생기는 값을 여기 의존성으로 둬도 안전하다 — 요청 자체가 중복되지 않음).
  useEffect(() => {
    const idsToFetch: string[] = [];
    const collect = (post: PostView | null | undefined) => {
      if (!post) return;
      if (
        post.imageCount > 0 &&
        post.images.length === 0 &&
        !requestedImageIdsRef.current.has(post.id)
      ) {
        requestedImageIdsRef.current.add(post.id);
        idsToFetch.push(post.id);
      }
    };
    visiblePosts.forEach(collect);
    collect(commentModalPost);
    idsToFetch.forEach((id) => {
      getPostImages(id).then((images) => {
        setImagesByPostId((prev) => ({ ...prev, [id]: images }));
      });
    });
  }, [visiblePosts, commentModalPost]);

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

      {/* 1024px 이하에서는 .sideCol(글쓰기/내 프로필 버튼이 있는 우측 사이드바)이 통째로
          숨겨져 두 버튼을 누를 방법이 없어진다 — 모바일 상단 영역에 같은 버튼을 그대로
          재사용해 노출한다. PC에서는 CSS로 숨긴다. */}
      <div className={styles.mobileActions}>
        <button type="button" className={styles.writeBtn} onClick={openComposer}>
          여행 후기 쓰기
          {/* eslint-disable-next-line @next/next/no-img-element -- 고정 정적 아이콘 */}
          <img src="/icons/pencil-line.png" alt="" className={styles.writeBtnIcon} />
        </button>
        <button type="button" className={styles.myProfileBtn} onClick={openMyProfile}>
          내 프로필 보기
        </button>
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
                  setVisibleCount(viewMode === 'grid' ? GRID_PAGE_STEP : PAGE_STEP);
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
                onClick={() => {
                  setViewMode('list');
                  setVisibleCount(PAGE_STEP);
                }}
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
                onClick={() => {
                  setViewMode('grid');
                  setVisibleCount(GRID_PAGE_STEP);
                }}
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
              <AuthorAvatar
                name={profileAuthor}
                avatarUrl={
                  profileAuthor === myAuthorName
                    ? (user?.avatarUrl ?? null)
                    : profilePost?.authorAvatarUrl
                }
                isMine={profileAuthor === myAuthorName}
                className={styles.profileAvatar}
              />
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

          {postsLoading ? (
            <div className={styles.list}>
              {Array.from({ length: 3 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {sorted.length === 0 ? (
                <p className={styles.empty}>
                  {!isLoggedIn
                    ? '로그인이 필요한 페이지예요.'
                    : q
                      ? '검색 결과가 없어요.'
                      : '아직 게시물이 없어요'}
                </p>
              ) : null}

              {viewMode === 'grid' ? (
                <div className={styles.grid}>
                  {visiblePosts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      className={styles.gridCell}
                      onClick={() => setCommentModalId(post.id)}
                    >
                      <PostPhoto
                        images={displayImagesOf(post)}
                        label={`${post.place} 사진`}
                        interactive={false}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.list}>
                  {visiblePosts.map((post) => {
                    const total = totalCommentCount(post);
                    const showInlineAll = total < INLINE_COMMENT_THRESHOLD;
                    const visibleComments = showInlineAll
                      ? post.comments
                      : post.comments.slice(0, 1);
                    const likeColor = post.liked ? '#e5342e' : 'var(--pd-text-sub)';
                    const bookmarkColor = post.bookmarked
                      ? 'var(--pd-brand)'
                      : 'var(--pd-text-sub)';
                    return (
                      <article key={post.id} className={styles.postCard}>
                        <div className={styles.postHead}>
                          <button
                            type="button"
                            className={styles.postAvatarBtn}
                            onClick={() => setProfileAuthor(post.author)}
                          >
                            <AuthorAvatar
                              name={post.author}
                              avatarUrl={post.authorAvatarUrl}
                              isMine={post.isMine}
                              className={styles.postAvatar}
                            />
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
                          <PostPhoto images={displayImagesOf(post)} label={`${post.place} 사진`} />
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
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill={bookmarkColor}
                                >
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

                          <ClampedCaption
                            author={post.author}
                            caption={post.caption}
                            className={styles.caption}
                          />

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
            </>
          )}

          {sorted.length > visibleCount ? (
            <button
              type="button"
              className={styles.showMoreBtn}
              onClick={() =>
                setVisibleCount((v) => v + (viewMode === 'grid' ? GRID_PAGE_STEP : PAGE_STEP))
              }
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
                    // 검색창에 채워만 두고, 실제 검색은 검색 버튼/Enter(runSearch)를 눌러야 실행된다.
                    const keyword = t.name.split(' ')[0];
                    setSearchInput(keyword);
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
                    // 검색창에 채워만 두고, 실제 검색은 검색 버튼/Enter(runSearch)를 눌러야 실행된다.
                    setSearchInput(tag);
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
          <button type="button" className={styles.myProfileBtn} onClick={openMyProfile}>
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
        {/* 수정 모드에서는 여행지/지역/감상평만 고칠 수 있고 사진은 그대로 유지된다 —
            그래서 사진 추가/삭제 UI 자체를 아예 보여주지 않는다(새 글 작성 때만 노출). */}
        {editingId ? null : (
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

      {/* 사진 위치 조정(4:3 크롭) — 여러 장을 골랐으면 한 장씩 순서대로 뜬다. */}
      <ImageCropModal
        open={cropSrc != null}
        imageSrc={cropSrc}
        onCancel={cancelCrop}
        onConfirm={confirmCrop}
      />

      {/* 댓글 상세: 좌측 사진 / 우측 댓글창 2단 구조 */}
      {commentModalPost ? (
        <div className={styles.commentModalOverlay} onClick={() => setCommentModalId(null)}>
          <div className={styles.commentModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.commentModalPhoto}>
              <PostPhoto
                images={displayImagesOf(commentModalPost)}
                label={`${commentModalPost.place} 사진`}
              />
            </div>
            <div className={styles.commentModalRight}>
              <div className={styles.commentModalHead}>
                <button
                  type="button"
                  className={styles.postAvatarBtn}
                  onClick={() => {
                    setProfileAuthor(commentModalPost.author);
                    setCommentModalId(null);
                  }}
                >
                  <AuthorAvatar
                    name={commentModalPost.author}
                    avatarUrl={commentModalPost.authorAvatarUrl}
                    isMine={commentModalPost.isMine}
                    className={styles.postAvatar}
                  />
                </button>
                <button
                  type="button"
                  className={`${styles.postAuthorBtn} ${styles.commentModalHeadInfo}`}
                  onClick={() => {
                    setProfileAuthor(commentModalPost.author);
                    setCommentModalId(null);
                  }}
                >
                  <div className={styles.postAuthor}>{commentModalPost.author}</div>
                  <div className={styles.postMeta}>
                    {commentModalPost.place} · {formatRelativeTime(commentModalPost.timestamp)}
                  </div>
                </button>
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
                <div className={styles.modalCaptionBlock}>
                  <ClampedCaption
                    author={commentModalPost.author}
                    caption={commentModalPost.caption}
                    className={styles.captionClamped}
                  />
                </div>
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

      {/* 비회원 안내 — 좋아요/북마크/글쓰기/댓글 등 로그인이 필요한 동작을 시도하면 뜬다.
          닫으면(X/ESC) 홈으로 돌려보낸다. */}
      <Modal
        open={authGateOpen}
        title="회원만 이용할 수 있어요"
        onClose={() => {
          setAuthGateOpen(false);
          router.push('/');
        }}
      >
        <p className={styles.deleteDesc}>
          로그인하면 커뮤니티의 다양한 기능을
          <br />
          이용할 수 있어요.
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

      {showScrollTop ? (
        <button
          type="button"
          className={styles.scrollTopBtn}
          onClick={scrollToTop}
          aria-label="맨 위로"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
