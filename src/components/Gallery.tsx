import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { ImageReveal } from "./ImageReveal";
import { siteConfig } from "@/lib/site-config";

export function Gallery() {
  return (
    <section id="gallery" className="bg-cream-soft pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
            Всяко ястие има история
          </h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            Кратък поглед към кухнята и залата.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.galleryImages.map((src, i) => (
            <ScrollReveal key={src} delay={i * 0.06}>
              <div className="group relative isolate aspect-[4/3] overflow-hidden rounded-2xl [transform:translateZ(0)] shadow-black/0 transition-shadow duration-300 hover:shadow-xl hover:shadow-black/20">
                <ImageReveal delay={i * 0.04} className="absolute inset-0">
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-110"
                  />
                </ImageReveal>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
