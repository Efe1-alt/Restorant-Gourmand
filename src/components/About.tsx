import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { ImageReveal } from "./ImageReveal";
import { siteConfig } from "@/lib/site-config";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ScrollReveal>
          <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
            За нас
          </h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            Lake House е място край язовира в Пловдив, където прясната риба и
            доматите от градината стигат директно на масата. Тук храната се
            приготвя с внимание към детайла и уважение към традицията — без
            излишни претенции, само добра кухня и топло посрещане.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative isolate aspect-[4/3] overflow-hidden rounded-2xl [transform:translateZ(0)]">
            <ImageReveal className="absolute inset-0">
              <Image
                src={siteConfig.aboutImage.url}
                alt="Атмосферен кадър от залата"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </ImageReveal>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
