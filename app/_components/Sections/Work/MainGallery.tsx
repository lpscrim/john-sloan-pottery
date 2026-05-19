"use client";

import { Card } from "../../UI/Layout/Card";
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
}

export interface MainGalleryProps {
  selectedCategories: string[];
  selectedGlazes: string[];
  toggleGlaze: (g: string) => void;
  allGlazes: [string, number][];
  stockFilter: 'in-stock' | 'all' | 'sold';
  setStockFilter: React.Dispatch<React.SetStateAction<'in-stock' | 'all' | 'sold'>>;
  filteredProjects: Project[];
  totalCount: number;
  inStockCount: number;
  soldCount: number;
  sortedVisibleCategories: [string, number][];
  toggleCategory: (cat: string) => void;
  onCardClick: (index: number, project: Project) => void;
  getStockLevel: (project: Project) => number;
  showCategories: boolean;
}

export function MainGallery({
  selectedCategories,
  selectedGlazes,
  toggleGlaze,
  allGlazes,
  stockFilter,
  setStockFilter,
  filteredProjects,
  totalCount,
  inStockCount,
  soldCount,
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
              onClick={() => setStockFilter('in-stock')}
              className={`cursor-pointer transition-opacity ${stockFilter === 'in-stock' ? 'text-foreground' : 'text-foreground/50'}`}
            >
              In Stock <span className="text-accent">{inStockCount}</span>
            </button>
            <button
              onClick={() => setStockFilter('all')}
              className={`cursor-pointer transition-opacity ${stockFilter === 'all' ? 'text-foreground' : 'text-foreground/50'}`}
            >
              All <span className="text-accent">{totalCount}</span>
            </button>
            <button
              onClick={() => setStockFilter('sold')}
              className={`cursor-pointer transition-opacity ${stockFilter === 'sold' ? 'text-foreground' : 'text-foreground/50'}`}
            >
              Sold <span className="text-accent">{soldCount}</span>
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
                    className={`pr-1 py-1 rounded transition-colors cursor-pointer text-foreground ${isSelected ? "underline font-semibold" : ""} ${isUnselectable ? "opacity-30 cursor-not-allowed" : "hover:bg-background/10"}`}
                  >
                    {categoryStr}{" "}
                    <span className="text-accent">{count}</span>
                  </button>
                </span>
              );
            })}
          </div>
          )}
          {allGlazes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            {allGlazes.map(([glaze, count]) => {
              const isSelected = selectedGlazes.includes(glaze);
              const isUnselectable = count === 0;
              return (
                <button
                  key={glaze}
                  title={glaze}
                  onClick={() => !isUnselectable && toggleGlaze(glaze)}
                  disabled={isUnselectable}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background'
                      : isUnselectable
                      ? 'border-transparent opacity-25 cursor-not-allowed'
                      : 'border-transparent hover:border-foreground/40'
                  }`}
                  style={{ backgroundColor: glaze }}
                />
              );
            })}
          </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 px-0">
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
