"use client";
import React, { useState, useRef } from "react";
import ProjectCard from "./ProjectCard";
import ProjectTag from "./ProjectTag";
import { motion, useInView } from "framer-motion";

const projectsData = [
  {
    id: 1,
    title: "This React Portfolio Website",
    description: "Project 1 description",
    image: "",
    tag: ["All", "Web"],
    gitUrl: "https://github.com/hurstcorey/MyPortfolioSite",
    previewUrl: "/",
  },
  {
    id: 2,
    title: "Fate RRPG React Native App",
    description: "Project 2 description",
    image: "",
    tag: ["All","Mobile","Web"],
    gitUrl: "/",
    previewUrl: "/",
  },
  {
    id: 3,
    title: "Blog Website",
    description: "My Personal Blog where I talk about my life, experiences, and interest",
    image: "/images/projects/Coreyblog.png",
    tag: ["All","blog","Web"],
    gitUrl: "https://support.google.com/blogger/answer/1623800?hl=en",
    previewUrl: "https://blog.cohurst.co/",
  },
  {
    id: 4,
    title: "MyAssistant PWA App",
    description: "Project 4 description",
    image: "",
    tag: ["All", "Mobile"],
    gitUrl: "/",
    previewUrl: "/",
  },
];

const ProjectsSection = () => {
  const [tag, setTag] = useState("All");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const handleTagChange = (newTag: any) => {
    setTag(newTag);
  };

  const filteredProjects = projectsData.filter((project) =>
    project.tag.includes(tag)
  );

  const cardVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  };

  return (
    <section id="projects">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Projects
      </h2>
      <div className="text-white flex flex-row justify-center items-center gap-2 py-6">
        <ProjectTag
          onClick={handleTagChange}
          name="All"
          isSelected={tag === "All"}
        />
        <ProjectTag
          onClick={handleTagChange}
          name="Art"
          isSelected={tag === "Art"}
        />
        <ProjectTag
          onClick={handleTagChange}
          name="Mobile Apps"
          isSelected={tag === "Mobile"}
        />
        <ProjectTag
          onClick={handleTagChange}
          name="Streaming"
          isSelected={tag === "Streaming"}
        />
        <ProjectTag
          onClick={handleTagChange}
          name="Web Apps"
          isSelected={tag === "Web"}
        />
        <ProjectTag
          onClick={handleTagChange}
          name="Writing"
          isSelected={tag === "Writing"}
        />
      </div>
      <ul ref={ref} className="grid md:grid-cols-3 gap-8 md:gap-12">
        {filteredProjects.map((project, index) => (
          <motion.li
            key={project.id}
            variants={cardVariants}
            initial="initial"
            animate={isInView ? "animate" : "initial"}
            transition={{ duration: 0.3, delay: index * 0.4 }}
          >
            <ProjectCard
              key={project.id}
              title={project.title}
              description={project.description}
              imgUrl={project.image}
              gitUrl={project.gitUrl}
              previewUrl={project.previewUrl}
            />
          </motion.li>
        ))}
      </ul>
    </section>
  );
};

export default ProjectsSection;