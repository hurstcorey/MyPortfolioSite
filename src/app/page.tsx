import HeroSection from "./components/AboutMe/HeroSection";
import Navbar from "./components/Navigation/Navbar";
import AboutSection from "./components/AboutMe/AboutSection";
import AchievementsSection from "./components/AboutMe/AchievementsSection";
import ProjectsSection from "./components/Projects/ProjectsSection";
import ListsPreview from "./components/Lists/ListsPreview";
import EmailSection from "./components/Utilities/EmailSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#121212]">
      <Navbar />
      <div className="container mt-24 mx-auto px-12 py-4">
        <HeroSection />
        <AchievementsSection />
        <AboutSection />
        <ProjectsSection />
        <ListsPreview />
        <EmailSection />
      </div>
      <Footer />
    </main>
  );
}
