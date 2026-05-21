import type { GlazeEntry } from "@/app/_data/projects";
import { useEffect, useCallback, useRef, useState } from "react";

import { ImageWithFallback } from "../../UI/Layout/ImageWithFallback";
import Button from "../../UI/Layout/Button";
import { useSwipeable } from "react-swipeable";
import { BuyButton } from "../../UI/Layout/BuyButton";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('v.etsystatic.com');
}

interface PhotoModalProps {
  isOpen: boolean;
  image: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isProject: boolean;
  name: string;
  text?: string;
  medium?: string;
  glaze?: GlazeEntry[];
  images?: string[];
  index?: number;
  changePhotoId?: (idx: number) => void;
  stripePriceId: string | null;
  stockLevel: number;
  priceHw: number;
  mugShapeSlug?: string;
  shapeLabel?: string;
  etsyListingId?: string | null;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  isProject,
  name,
  text,
  medium,
  glaze,
  images = [],
  index = 0,
  changePhotoId = () => {},
  stripePriceId,
  stockLevel,
  priceHw,
  mugShapeSlug,
  shapeLabel,
  etsyListingId,
}) => {
  // Refs for thumbnails
  const stripRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastWheelAtRef = useRef<number>(0);

  // Loading progress bar ied to load event;)
  const [loadProgress, setLoadProgress] = useState(0);
  const [showLoadProgress, setShowLoadProgress] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const progressTimerRef = useRef<number | null>(null);
  const progressHideTimerRef = useRef<number | null>(null);
  const progressStartedForImageRef = useRef<string | null>(null);

  const [thumbStripTop, setThumbStripTop] = useState<number | null>(null);

  const startProgress = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (progressHideTimerRef.current !== null) {
      window.clearTimeout(progressHideTimerRef.current);
      progressHideTimerRef.current = null;
    }

    setShowLoadProgress(true);
    setLoadProgress(6);

    // Fake progress: climb quickly to ~85%, then slow.
    progressTimerRef.current = window.setInterval(() => {
      setLoadProgress((p) => {
        if (p >= 92) return p;
        const step = p < 60 ? 9 : p < 80 ? 4 : 1;
        return Math.min(92, p + step);
      });
    }, 120);
  }, []);

  const finishProgress = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setLoadProgress(100);
    progressHideTimerRef.current = window.setTimeout(() => {
      setShowLoadProgress(false);
      setLoadProgress(0);
      progressHideTimerRef.current = null;
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (progressHideTimerRef.current !== null) {
        window.clearTimeout(progressHideTimerRef.current);
        progressHideTimerRef.current = null;
      }
    };
  }, []);

  const positionThumbStrip = useCallback(() => {
    if (!isOpen) return;
    if (images.length <= 1) return;

    const stripEl = stripRef.current;
    const viewerEl = viewerRef.current;
    if (!stripEl || !viewerEl) return;

    const viewerRect = viewerEl.getBoundingClientRect();
    const stripRect = stripEl.getBoundingClientRect();

    // Use the *maximum* image height (from class max-h-[82vh]) so position
    // doesn't change when an image renders shorter (e.g. landscape).
    const MAX_IMAGE_VH = 0.82;
    const maxImageHeight = Math.min(
      viewerRect.height,
      window.innerHeight * MAX_IMAGE_VH
    );
    const viewerCenterY = (viewerRect.top + viewerRect.bottom) / 2;
    const maxImageBottom = viewerCenterY + maxImageHeight / 2;

    // Midpoint between bottom of max image area and bottom of screen
    const targetCenterY = (maxImageBottom + window.innerHeight) / 2;
    let nextTop = targetCenterY - stripRect.height / 2;

    // Keep it on-screen
    const minTop = 8;
    const maxTop = window.innerHeight - stripRect.height - 8;
    nextTop = Math.max(minTop, Math.min(maxTop, nextTop));

    setThumbStripTop(nextTop);
  }, [isOpen, images.length]);

  // Center active thumbnail when index changes
  useEffect(() => {
    if (!isOpen) return;
    if (images.length <= 1) return;

    const stripEl = stripRef.current;
    const activeThumb = thumbRefs.current[index];
    if (!stripEl || !activeThumb) return;

    const stripRect = stripEl.getBoundingClientRect();
    const thumbRect = activeThumb.getBoundingClientRect();

    const delta =
      thumbRect.left -
      stripRect.left +
      thumbRect.width / 2 -
      stripRect.width / 2;

    stripEl.scrollTo({
      left: stripEl.scrollLeft + delta,
      behavior: "smooth",
    });
  }, [index, images.length, isOpen]);

  // Reposition the strip when the modal opens, the image changes, or viewport resizes
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(positionThumbStrip);
    const onResize = () => positionThumbStrip();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, image, positionThumbStrip]);

  const startProgressIfNeeded = useCallback(() => {
    if (!image) return;
    if (progressStartedForImageRef.current === image) return;
    progressStartedForImageRef.current = image;
    startProgress();
  }, [image, startProgress]);

  const handleThumbWheel = useCallback(
    (e: WheelEvent) => {
      if (images.length < 2) return;

      // Ignore tiny trackpad noise
      if (Math.abs(e.deltaY) < 4) return;

      // Throttle so one scroll gesture = one step
      const now = performance.now();
      if (now - lastWheelAtRef.current < 120) return;
      lastWheelAtRef.current = now;

      // Don’t scroll the page behind the modal
      e.preventDefault();

      if (e.deltaY < 0 && index > 0) {
        changePhotoId(index - 1);
      } else if (e.deltaY > 0 && index < images.length - 1) {
        changePhotoId(index + 1);
      }
    },
    [images.length, index, changePhotoId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const el = modalRef.current;
    if (!el) return;

    el.addEventListener("wheel", handleThumbWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleThumbWheel as EventListener);
    };
  }, [isOpen, handleThumbWheel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    },
    [isOpen, onClose, onPrev, onNext, hasPrev, hasNext]
  );

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (hasNext) {
        onNext();
      }
    },
    onSwipedRight: () => {
      if (hasPrev) {
        onPrev();
      }
    },
    trackMouse: true,
  });

  const { ref: swipeableRef, ...swipeHandlers } = handlers;

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      ref={(el) => {
        modalRef.current = el;
        swipeableRef(el);
      }}
      className="fixed inset-0 top-14 z-50 flex flex-col bg-background"
      {...swipeHandlers}
    >
      <div className="relative py-0 flex flex-row w-full justify-between z-100 bg-background ">
        <div className="flex px-6 w-full items-center z-100">
          {isProject && (
            <span className="text-foreground text-xl">
              {name} 
            </span>
          )}
          {!isProject && <span className="opacity-0">{"0"}</span>}
        </div>
        <div className="flex flex-row items-center mr-3 w-60">
            <div className="flex justify-center w-20 text-foreground z-100">
              <BuyButton
                stripePriceId={stripePriceId}
                stockLevel={stockLevel}
                priceHw={priceHw}
                name={name}
                imageUrl={images[0] || image}
                mugShapeSlug={mugShapeSlug}
                glaze={glaze}
              />
            </div>
            <div className="flex justify-center w-20  text-foreground z-100">
              {isProject && (
              <Button onClick={() => setTextOpen(!textOpen)} size="md">
                Info
              </Button>
              )}
            </div>
          <div className="flex justify-center w-20 text-foreground z-100">
            <Button onClick={onClose} size="md">
              Back
            </Button>
          </div>
        </div>
      </div>
      {showLoadProgress && (
        <div className="relative mx-6 z-100 h-0.5 bg-foreground/20 overflow-hidden">
          <div
            className="h-full bg-foreground transition-[width] duration-150 ease-out"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      )}
      {isProject && (
        <div
          className={` flex w-full border-b border-muted z-90 py-16 bg-background items-center -translate-y-100 opacity-0 ${
            textOpen ? "translate-y-0 opacity-100" : ""
          }  transition-all duration-300 ease-in-out overflow-y-auto z-40`}
        >
          <div className="max-w-3xl mx-auto px-6 text-center text-foreground flex flex-col gap-3">
            {text && <p className="whitespace-pre-line text-lg">{text}</p>}
            <p className="text-foreground/60 text-base">
              {[shapeLabel, glaze?.map(g => g.name).join(', '), medium].filter(Boolean).join(' · ')}
              {priceHw > 0 && <span className="ml-2">· £{(priceHw / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })}</span>}
            </p>
          </div>
        </div>
      )}
      <div
        ref={viewerRef}
        className="fixed items-center justify-center inset-0 top-10 z-60 pt-10 flex"
      >
        {hasPrev && (
          <button
            className="absolute z-80 cursor-chevron-left focus:outline-none left-0 top-1/2 -translate-y-1/2 text-foreground text-3xl h-[85svh] w-1/2"
            onClick={() => {
              startProgress();
              onPrev();
            }}
            aria-label="Previous"
          ></button>
        )}
        <div
          ref={(el) => {
            imageWrapRef.current = el;
            startProgressIfNeeded();
          }}
          className=""
        >
        
          {isVideoUrl(image) ? (
            <video
              key={image}
              src={image}
              autoPlay
              loop
              muted
              playsInline
              className="max-h-[82vh] max-w-[90vw] object-contain"
              onLoadedData={() => {
                finishProgress();
                positionThumbStrip();
              }}
            />
          ) : (
            <ImageWithFallback
              src={image}
              alt="Gallery"
              width={1200}
              height={800}
              fill={false}
              sizes="90vw"
              className="max-h-[82vh] max-w-[90vw] object-contain"
              onLoad={() => {
                finishProgress();
                positionThumbStrip();
              }}
            />
          )}
          {isProject && stockLevel <= 0 && (
            <span className="flex w-full justify-center text-foreground/80 text-lg -mb-4 pt-2 pointer-events-none z-999">
              Sold out
            </span>
          )}
          {isProject && stockLevel > 0 && !etsyListingId && (
            <span className="flex w-full justify-center text-foreground/80 text-lg -mb-4 pt-2 pointer-events-none z-999">
              Website exclusive  - £{(priceHw / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </span>
          )}
          {isProject && stockLevel > 0 && etsyListingId && priceHw > 0 && (
            <span className="flex w-full justify-center text-foreground/80 text-lg -mb-4 pt-2 pointer-events-none z-999">
              £{(priceHw / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>
        {hasNext && (
          <button
            className="absolute z-80 cursor-chevron-right focus:outline-none right-0 top-1/2 -translate-y-1/2 text-foreground text-3xl h-[85svh] w-1/2"
            onClick={() => {
              startProgress();
              onNext();
            }}
            aria-label="Next"
          ></button>
        )}
      </div>
      
      {/* Tiny scrollable thumbnail strip */}
      {images.length > 1 && (
        <div
          ref={stripRef}
          className="fixed left-0 right-0 px-4 flex items-center overflow-x-auto w-full space-x-0 mt-1 hide-scrollbar z-80"
          style={thumbStripTop === null ? undefined : { top: thumbStripTop }}
        >
          {images.map((img, idx) => (
            <button
              key={img + idx}
              ref={(el) => {
                thumbRefs.current[idx] = el;
              }}
              onClick={() => changePhotoId(idx)}
              className={` ${
                idx === index ? " shadow-lg" : ""
              } rounded-none overflow-x-hidden  focus:outline-none shrink-0`}
              style={{ width: 30, height: 40 }}
            >
              {isVideoUrl(img) ? (
                <div
                  className={`w-full h-full flex items-center justify-center bg-foreground/20 ${
                    idx === index ? "brightness-110" : "brightness-50"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-foreground"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <ImageWithFallback
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  width={30}
                  height={40}
                  fill={false}
                  sizes="30px"
                  className={`object-cover h-full ${
                    idx === index ? "brightness-110" : "brightness-50"
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
