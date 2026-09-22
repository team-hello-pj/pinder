'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ImageCropModal.module.css';

export interface ImageCropModalProps {
  open: boolean;
  /** 자르기 전 원본 이미지 (data URL 또는 object URL). */
  imageSrc: string | null;
  /** 가로/세로 비율. 기본 4:3(게시물 사진 표시 비율과 동일). */
  aspectRatio?: number;
  jpegQuality?: number;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

const FRAME_WIDTH = 320;
const OUTPUT_LONG_SIDE = 1280;

/**
 * 사진을 고른 뒤, 실제 게시물에 표시되는 비율(기본 4:3)로 위치/확대를 직접 맞추고 잘라내는
 * 모달. object-fit:cover 로 자동 크롭하면 원하지 않는 부분이 잘릴 수 있어, 드래그로 위치를
 * 옮기고 슬라이더로 확대해 원하는 구도를 직접 고를 수 있게 한다.
 */
export function ImageCropModal({
  open,
  imageSrc,
  aspectRatio = 4 / 3,
  jpegQuality = 0.82,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const frameHeight = Math.round(FRAME_WIDTH / aspectRatio);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // 모달이 새로 열리거나(=새 사진을 자를 차례가 되거나) 다른 사진으로 바뀌면 위치/확대를 초기화한다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 사진이 바뀔 때 한 번만 초기화한다
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNaturalSize(null);
  }, [open, imageSrc]);

  if (!open || !imageSrc) return null;

  const baseScale = naturalSize
    ? Math.max(FRAME_WIDTH / naturalSize.w, frameHeight / naturalSize.h)
    : 1;
  const scale = baseScale * zoom;
  const dispW = naturalSize ? naturalSize.w * scale : FRAME_WIDTH;
  const dispH = naturalSize ? naturalSize.h * scale : frameHeight;

  const clampOffset = (x: number, y: number) => ({
    x: Math.min(0, Math.max(FRAME_WIDTH - dispW, x)),
    y: Math.min(0, Math.max(frameHeight - dispH, y)),
  });

  const onImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth || 1;
    const h = img.naturalHeight || 1;
    const bs = Math.max(FRAME_WIDTH / w, frameHeight / h);
    const dw = w * bs;
    const dh = h * bs;
    setNaturalSize({ w, h });
    // 처음 열었을 때는 이미지 가운데가 프레임 가운데에 오도록 시작한다.
    setOffset({ x: (FRAME_WIDTH - dw) / 2, y: (frameHeight - dh) / 2 });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.startOffsetX + dx, dragRef.current.startOffsetY + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onZoomChange = (value: number) => {
    setZoom(value);
    if (!naturalSize) return;
    const bs = Math.max(FRAME_WIDTH / naturalSize.w, frameHeight / naturalSize.h);
    const s = bs * value;
    const dw = naturalSize.w * s;
    const dh = naturalSize.h * s;
    setOffset((prev) => ({
      x: Math.min(0, Math.max(FRAME_WIDTH - dw, prev.x)),
      y: Math.min(0, Math.max(frameHeight - dh, prev.y)),
    }));
  };

  const handleConfirm = () => {
    if (!naturalSize || !imgRef.current) return;
    const outW = aspectRatio >= 1 ? OUTPUT_LONG_SIDE : Math.round(OUTPUT_LONG_SIDE * aspectRatio);
    const outH = Math.round(outW / aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // 미리보기 프레임(FRAME_WIDTH x frameHeight)과 좌표계가 같으므로, 배율만 출력 크기에 맞춰
    // 그대로 확대해서 그리면 미리보기에서 본 그대로가 잘린다.
    const k = outW / FRAME_WIDTH;
    ctx.drawImage(imgRef.current, offset.x * k, offset.y * k, dispW * k, dispH * k);
    onConfirm(canvas.toDataURL('image/jpeg', jpegQuality));
  };

  return (
    <Modal open={open} title="사진 위치 조정" onClose={onCancel}>
      <p className={styles.desc}>드래그해서 위치를 옮기고, 슬라이더로 확대할 수 있어요.</p>
      <div
        className={styles.frame}
        style={{ width: FRAME_WIDTH, height: frameHeight }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 캔버스로 직접 그려서 잘라내야 해서 next/image 를 쓸 수 없다 */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt=""
          onLoad={onImageLoad}
          draggable={false}
          className={styles.dragImg}
          style={{
            width: dispW,
            height: dispH,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        />
      </div>
      <div className={styles.zoomRow}>
        <span className={styles.zoomIcon}>−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className={styles.zoomSlider}
          aria-label="확대"
        />
        <span className={styles.zoomIcon}>+</span>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={!naturalSize}>
          적용
        </Button>
      </div>
    </Modal>
  );
}
