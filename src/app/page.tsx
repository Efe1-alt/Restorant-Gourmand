import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { MenuPreview } from "@/components/MenuPreview";
import { Gallery } from "@/components/Gallery";
import { SocialProof } from "@/components/SocialProof";
import { ReservationWidget } from "@/components/ReservationWidget";
import { LocationHours } from "@/components/LocationHours";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <MenuPreview />
        <Gallery />
        <SocialProof />
        <ReservationWidget />
        <LocationHours />
      </main>
      <Footer />
    </>
  );
}
