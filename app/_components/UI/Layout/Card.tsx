import { ImageWithFallback } from "./ImageWithFallback";

export function Card(project: {
  imageUrl: string;
  title: string;
  categories: string[];
  galleryImages?: string[];
  imageSizes?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageQuality?: number | string;
  handleOnClick?: () => void;
}) {
  const useFill = project.imageWidth == null || project.imageHeight == null;

  return (
    <div onClick={project.handleOnClick} className="group relative aspect-4/5 bg-muted overflow-hidden mb-0 rounded-xs cursor-crosshair">
      <ImageWithFallback
        src={project.imageUrl}
        alt={project.title}
        sizes={project.imageSizes}
        fill={useFill}
        width={!useFill ? project.imageWidth : undefined}
        height={!useFill ? project.imageHeight : undefined}
        quality={project.imageQuality}
        className={`w-full h-full object-cover transition-all duration-500 scale-110 group-hover:scale-115 ${
          project.categories.includes("B+W")
            ? "grayscale"
            : ""
        }`}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
    </div>
  );
}
