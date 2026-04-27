"use client";

import { Card } from "../../UI/Layout/Card";

interface Project {
  id: number;
  title: string;
  categories: string[];
  medium: string;
  glaze: string[];
  imageUrl: string;
  galleryImages?: string[];
  text?: string;
  price_hw: number;
  stock_level: number;
  stripe_price_id: string | null;
}

export interface MainGalleryProps {
  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  inStockOnly: boolean;
  setInStockOnly: React.Dispatch<React.SetStateAction<boolean>>;
  filteredProjects: Project[];
  totalCount: number;
  inStockCount: number;
  sortedVisibleCategories: [string, number][];
  toggleCategory: (cat: string) => void;
  onCardClick: (index: number, project: Project) => void;
  getStockLevel: (project: Project) => number;
  showCategories: boolean;
}

export function MainGallery({
  selectedCategories,
  setSelectedCategories,
  inStockOnly,
  setInStockOnly,
  filteredProjects,
  totalCount,
  inStockCount,
  sortedVisibleCategories,
  toggleCategory,
  onCardClick,
  getStockLevel,
  showCategories,
}: MainGalleryProps) {
  return (
    <>
      <div className="pt-12 pb-4 px-0 rounded-xs flex flex-wrap gap-4 w-full">
        <div className="xl:w-1/2 text-base sm:text-lg py-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedCategories([]);
                setInStockOnly(false);
              }}
              className={`cursor-crosshair transition-opacity ${selectedCategories.length === 0 && !inStockOnly ? "text-foreground" : "text-foreground/50"}`}
            >
              All [{totalCount}]
            </button>
            <button
              onClick={() => {
                setInStockOnly(!inStockOnly);
              }}
              className={`cursor-crosshair transition-opacity ${inStockOnly ? "text-foreground font-semibold" : "text-foreground/50"}`}
            >
              Available [{inStockCount}]
            </button>
          </div>
          {showCategories && (
          <div className="flex flex-wrap gap-0 mt-2">
            {sortedVisibleCategories.map(([category, count]) => {
              const categoryStr = String(category);
              const isSelected = selectedCategories.includes(categoryStr);
              const isUnselectable = count === 0;
              return (
                <span
                  key={categoryStr}
                  className="inline-flex items-center text-base sm:text-lg transition-opacity"
                >
                  <button
                    onClick={() =>
                      !isUnselectable && toggleCategory(categoryStr)
                    }
                    disabled={isUnselectable}
                    className={`pr-1 py-1 rounded transition-colors cursor-crosshair text-foreground ${isSelected ? "underline font-semibold" : ""} ${isUnselectable ? "opacity-30 cursor-not-allowed" : "hover:bg-background/10"}`}
                  >
                    {categoryStr}{" "}
                    <span className="text-foreground/60">[{count}]</span>
                  </button>
                </span>
              );
            })}
          </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 px-0">
        {filteredProjects.map((project, idx) => (
          <div key={project.id} className="relative group">
            <Card
              key={project.id}
              categories={project.categories}
              imageUrl={project.imageUrl}
              galleryImages={project.galleryImages}
              title={project.title}
              imageSizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              imageWidth={900}
              imageHeight={1125}
              imageQuality="auto:eco"
              handleOnClick={() => onCardClick(idx, project)}
            />
            <div className="absolute inset-x-0 text-lg top-8 px-4 group-hover:opacity-100 opacity-0 flex flex-col group-hover:mt-2 z-60 transition-all duration-500 pointer-events-none max-w-full">
              <h3 className="invisible tracking-tight text-background wrap-break-word">
                {project.title}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-background wrap-break-word max-w-full">
                {/*<span className="wrap-break-word max-w-full">
                  [{project.categories.join(", ")}]
                </span>*/}
                <span className="invisible">{project.year}</span>
              </div>
              {getStockLevel(project) === 0 && (
                <h3 className="text-background">SOLD OUT</h3>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
