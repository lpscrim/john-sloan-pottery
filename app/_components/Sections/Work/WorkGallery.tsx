
"use client";

import  { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PhotoModal } from "./PhotoModal";
import { MainGallery } from "./MainGallery";
import type { GlazeEntry } from "@/app/_data/projects";

interface Project {
  id: number;
  title: string;
  categories: string[];
  glaze: GlazeEntry[];
  imageUrl: string;
  galleryImages?: string[];
  text?: string;
  price_hw: number;
  stock_level: number;
  stripe_price_id: string | null;
  mug_shape_slug?: string;
  shape_label?: string;
  etsy_listing_id?: string | null;
}

interface WorkGalleryProps {
  projects: Project[];
  categoryCounts: [string, number][];
  showCategories: boolean;
}

export default function WorkGallery({ projects, categoryCounts, showCategories }: WorkGalleryProps) {

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedGlazes, setSelectedGlazes] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<'in-stock' | 'all' | 'sold'>('in-stock');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState<number>(0);
  const [isProject, setIsProject] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [medium] = useState<string>("");
  const [glaze, setGlaze] = useState<GlazeEntry[]>([]);
  const [stripePriceId, setStripePriceId] = useState<string | null>(null);
  const [stockLevel, setStockLevel] = useState<number>(0);
  const [priceHw, setPriceHw] = useState<number>(0);
  const [mugShapeSlug, setMugShapeSlug] = useState<string | undefined>(undefined);
  const [shapeLabel, setShapeLabel] = useState<string | undefined>(undefined);
  const [etsyListingId, setEtsyListingId] = useState<string | null>(null);

  const lastOpenedProjectIdRef = useRef<string | null>(null);
  const lastAppliedCategoryFilterRef = useRef<string>('');

  // ── Live stock map (single batched poll) ─────────────────────────
  const [liveStock, setLiveStock] = useState<Record<string, number>>({});

  const allPriceIds = useMemo(
    () => projects.map((p) => p.stripe_price_id).filter((id): id is string => !!id),
    [projects]
  );

  useEffect(() => {
    if (allPriceIds.length === 0) return;
    const controller = new AbortController();

    async function pollStock() {
      try {
        const res = await fetch(
          `/api/stock?ids=${encodeURIComponent(allPriceIds.join(','))}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const { stock } = (await res.json()) as { stock: Record<string, number> };
        setLiveStock((prev) => {
          const changed = Object.keys(stock).some((k) => prev[k] !== stock[k]);
          return changed ? stock : prev;
        });
      } catch { /* ignore */ }
    }

    pollStock();
    const id = setInterval(pollStock, 30_000);
    return () => { controller.abort(); clearInterval(id); };
  }, [allPriceIds]);

  // Helper: get live stock for a price ID, falling back to server prop
  const getStock = useCallback(
    (project: Project) =>
      project.stripe_price_id && project.stripe_price_id in liveStock
        ? liveStock[project.stripe_price_id]
        : project.stock_level,
    [liveStock]
  );


  // Filtered projects by selected categories and stock filter
  const filteredProjects = useMemo(() => {
    let result = projects;
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.every(cat => p.categories.includes(cat)));
    }
    if (stockFilter === 'in-stock') {
      result = result.filter((p) => getStock(p) > 0);
    } else if (stockFilter === 'sold') {
      result = result.filter((p) => getStock(p) <= 0);
    }
    if (selectedGlazes.length > 0) {
      result = result.filter((p) => selectedGlazes.every(g => p.glaze.some(gl => gl.colour === g)));
    }
    return result;
  }, [projects, selectedCategories, selectedGlazes, stockFilter, getStock]);

  const inStockCount = useMemo(
    () => projects.filter((p) => getStock(p) > 0).length,
    [projects, getStock]
  );

  const soldCount = useMemo(
    () => projects.filter((p) => getStock(p) <= 0).length,
    [projects, getStock]
  );

  // Category counts
  const visibleCategoryCounts: Record<string, number> = filteredProjects.reduce((acc, project) => {
    project.categories.forEach((category) => {
      acc[category] = (acc[category] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Use the array of [category, count] pairs for all categories
  const sortedVisibleCategories: [string, number][] = categoryCounts
    .map(([cat]) => [cat, visibleCategoryCounts[cat] || 0] as [string, number])
    .sort((a, b) => Number(b[1]) - Number(a[1]));




  // Glaze counts (based on category + stock filtered projects, before glaze filter)
  const preGlazeFiltered = useMemo(() => {
    let result = projects;
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.every(cat => p.categories.includes(cat)));
    }
    if (stockFilter === 'in-stock') {
      result = result.filter((p) => getStock(p) > 0);
    } else if (stockFilter === 'sold') {
      result = result.filter((p) => getStock(p) <= 0);
    }
    return result;
  }, [projects, selectedCategories, stockFilter, getStock]);

  // All colours that exist before glaze/colour filtering (to keep greyed-out options visible)
  const knownGlazes = useMemo(() => {
    const seen = new Set<string>();
    preGlazeFiltered.forEach((p) => p.glaze.forEach((g) => { if (g.colour) seen.add(g.colour); }));
    return seen;
  }, [preGlazeFiltered]);

  // Colour counts from the already-filtered results so only co-existing colours are non-zero
  const allGlazes = useMemo(() => {
    const counts: Record<string, number> = {};
    knownGlazes.forEach((g) => { counts[g] = 0; });
    filteredProjects.forEach((p) => p.glaze.forEach((g) => { if (g.colour) counts[g.colour] = (counts[g.colour] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [filteredProjects, knownGlazes]);

  const toggleGlaze = (g: string) => {
    setSelectedGlazes((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  // Add/remove category handlers
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else if (visibleCategoryCounts[cat] > 0) {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Handler to open gallery
  const handleCardClick = (index: number, project: typeof projects[number]) => {
    const imgs = [project.imageUrl, ...(project.galleryImages || [])];
    setIsProject(true);
    setName(project.title);
    setModalImages(imgs);
    setModalIndex(0);
    setText(project.text || "");
    setGlaze(project.glaze ?? []);
    setStripePriceId(project.stripe_price_id ?? null);
    setStockLevel(getStock(project));
    setPriceHw(project.price_hw);
    setMugShapeSlug(project.mug_shape_slug ?? undefined);
    setShapeLabel(project.shape_label ?? undefined);
    setEtsyListingId(project.etsy_listing_id ?? null);
    setModalOpen(true);
    lastOpenedProjectIdRef.current = String(project.id);
    const next = new URLSearchParams(searchParams.toString());
    next.set("project", String(project.id));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Deep link: /shop?project={project.id}
  useEffect(() => {
    const fromQuery = Array.from(
      new Set(
        searchParams
          .getAll('category')
          .flatMap((value) => value.split(','))
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
    const key = fromQuery.join('|');
    if (key === lastAppliedCategoryFilterRef.current) return;
    lastAppliedCategoryFilterRef.current = key;
    setSelectedCategories(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    const projectParam = searchParams.get("project");
    if (!projectParam) return;

    const project = projects.find((p) => String(p.id) === projectParam);
    if (!project) return;

    if (lastOpenedProjectIdRef.current === projectParam) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      lastOpenedProjectIdRef.current = projectParam;

      setSelectedCategories([]);
      setSelectedGlazes([]);
      setStockFilter('all');

      const imgs = [project.imageUrl, ...(project.galleryImages || [])];
      setIsProject(true);
      setName(project.title);
      setText(project.text || "");
      setGlaze(project.glaze ?? []);
      setStripePriceId(project.stripe_price_id ?? null);
      setStockLevel(getStock(project));
      setPriceHw(project.price_hw);
      setMugShapeSlug(project.mug_shape_slug ?? undefined);
      setShapeLabel(project.shape_label ?? undefined);
      setEtsyListingId(project.etsy_listing_id ?? null);
      setModalImages(imgs);
      setModalIndex(0);
      setModalOpen(true);
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, projects, getStock]);

  // Close modal when back button removes the project param
  useEffect(() => {
    const projectParam = searchParams.get("project");
    if (!projectParam && modalOpen) {
      setModalOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keep modal stock in sync with live polling
  const displayedStockLevel = modalOpen && stripePriceId && stripePriceId in liveStock
    ? liveStock[stripePriceId]
    : stockLevel;

  const handleCloseModal = () => {
    router.back();
  };

  const handleThumbClick = (idx: number) => {
    setModalIndex(idx);
  };

  return (
    <section id="shop" className="min-h-[75svh] px-6 pt-2 w-full">
      {!modalOpen && <MainGallery
        getStockLevel={getStock}
        selectedCategories={selectedCategories}
        selectedGlazes={selectedGlazes}
        toggleGlaze={toggleGlaze}
        allGlazes={allGlazes}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        filteredProjects={filteredProjects}
        totalCount={projects.length}
        inStockCount={inStockCount}
        soldCount={soldCount}
        sortedVisibleCategories={sortedVisibleCategories}
        toggleCategory={toggleCategory}
        onCardClick={handleCardClick}
        showCategories={showCategories}
      /> }
      <PhotoModal
        isOpen={modalOpen}
        image={modalImages[modalIndex] || ""}
        images={modalImages}
        index={modalIndex}
        onClose={handleCloseModal}
        onPrev={() => setModalIndex((prev) => (prev > 0 ? prev - 1 : prev))}
        onNext={() => setModalIndex((prev) => (prev < modalImages.length - 1 ? prev + 1 : prev))}
        hasPrev={modalIndex > 0}
        isProject={isProject}
        hasNext={modalIndex < modalImages.length - 1}
        name={name}
        text={text}
        medium={medium}
        glaze={glaze}
        changePhotoId={handleThumbClick}
        stripePriceId={stripePriceId}
        stockLevel={displayedStockLevel}
        priceHw={priceHw}
        mugShapeSlug={mugShapeSlug}
        shapeLabel={shapeLabel}
        etsyListingId={etsyListingId}
      />
    </section>
  );

}
