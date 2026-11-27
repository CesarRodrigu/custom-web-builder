import { useEffect, useState } from "react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  /** Display name of the product, used in every image alt text. */
  name: string;
  /** Image URLs of the product, in gallery order. */
  images: string[];
}

/**
 * Ecommerce gallery of a product: a swipeable main image with arrow controls
 * and a thumbnail strip that jumps to the selected picture.
 * @param props Product name and image list; `images` comes in gallery order.
 * @returns The gallery markup, or a placeholder when the product has no artwork.
 */
export function ProductGallery(props: Readonly<ProductGalleryProps>) {
  const { name, images } = props;
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!api) return;

    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on("select", updateCurrent);
    api.on("reInit", updateCurrent);

    return () => {
      api.off("select", updateCurrent);
      api.off("reInit", updateCurrent);
    };
  }, [api]);

  if (images.length === 0) {
    return (
      <AspectRatio
        ratio={4 / 3}
        className="flex w-full items-center justify-center rounded-2xl bg-linear-to-br from-muted to-secondary ring-1 ring-foreground/10"
        aria-hidden="true"
      >
        <span className="font-heading text-7xl font-semibold text-muted-foreground">
          {name.charAt(0)}
        </span>
      </AspectRatio>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Carousel
        setApi={setApi}
        opts={{ loop: hasMultipleImages }}
        className="w-full"
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={`${image}-${index}`}>
              <AspectRatio
                ratio={4 / 3}
                className="overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10"
              >
                <img
                  src={image}
                  alt={`${name} (${index + 1}/${images.length})`}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              </AspectRatio>
            </CarouselItem>
          ))}
        </CarouselContent>
        {hasMultipleImages && (
          <>
            <CarouselPrevious className="left-3 border-0 bg-background/80 backdrop-blur" />
            <CarouselNext className="right-3 border-0 bg-background/80 backdrop-blur" />
          </>
        )}
      </Carousel>

      {hasMultipleImages && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <Button
              key={`${image}-${index}`}
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-pressed={index === current}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "size-16 overflow-hidden rounded-lg p-0 ring-1 ring-foreground/10 hover:bg-transparent",
                index === current
                  ? "ring-2 ring-primary"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
