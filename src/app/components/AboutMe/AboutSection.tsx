"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SmartLink from "../Utilities/SmartLink";
import TabButton from "../TabButton";
import { NAV_HASH_EVENT } from "../Navigation/NavLink";

const TAB_DATA = [
  {
    title: "Skills",
    id: "skills",
    content: (
      <ul className="list-disc pl-2">
        <li>Cloud Hosting</li>
        <li>React & Next.js</li>
        <li>Serverless</li>
        <li>TypeScript</li>
        <li>Java Springboot</li>
        <li>API(s) and Microservices</li>
        <li>SQL & Graph DB(s), NoSQL(s)</li>
        
      </ul>
    ),
  },
  {
    title: "Education",
    id: "education",
    content: (
      <ul className="list-disc pl-2">
        <li>Bachelors of Computer Science</li>
        <li>Ohio University, Lancaster</li>
      </ul>
    ),
  },
  {
        title: "Certifications",
    id: "certifications",
    content: (
      <ul className="list-disc pl-2">
        <li>AWS Cloud Practitioner</li>
        <li>AWS Developer Certification</li>
        <li className="flex items-center gap-2">
          <SmartLink
            href="https://www.credly.com/badges/94f00762-be7c-4f89-8252-5765f9272067/public_url"
            ariaLabel="GenAI Application Developer certificate"
            size="md"
            variant="primary"
            iconPosition="right"
            className="text-teal-300 hover:text-teal-200"
          >
            GenAI Application Developer
          </SmartLink>
        </li>
      </ul>
    ),
  },
];

const AboutSection = () => {
  const [tab, setTab] = useState("skills");
  const handleTabChange = (id: string) => {
    setTab(id);
    };

  // The nav's "Engineer" link (#engineer) points at the Skills tab. Handle it on
  // load (arriving from another page) and on in-page nav clicks, which don't fire
  // hashchange because Next updates the URL with pushState.
  useEffect(() => {
    const showSkillsForEngineer = (hash: string) => {
      if (hash === "engineer") setTab("skills");
    };
    showSkillsForEngineer(window.location.hash.slice(1));
    const onNavHash = (e: Event) =>
      showSkillsForEngineer((e as CustomEvent<string>).detail);
    const onHashChange = () => showSkillsForEngineer(window.location.hash.slice(1));
    window.addEventListener(NAV_HASH_EVENT, onNavHash);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener(NAV_HASH_EVENT, onNavHash);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);


const selectedTab = TAB_DATA.find((t) => t.id === tab);
const tabContent = selectedTab ? selectedTab.content : null;

  return (
    <section className="text-white" id="mystory">
      <div className="md:grid md:grid-cols-2 gap-8 items-center py-8 px-4 xl:gap-16 sm:py-16 xl:px-16">
        <Image src="/images/Corey-Hurst-Metro-5.jpg" alt="" width={500} height={500} />
        <div className="mt-4 md:mt-0 text-left flex flex-col h-full">
          <h2 className="text-4xl font-bold text-white mb-4">My Story</h2>
          <p className="text-base lg:text-lg">
            I am a full stack web developer with a passion for creating
            interactive and responsive web applications. I have experience
            working with JavaScript, React, Redux, Node.js, Express, PostgreSQL,
            Sequelize, HTML, CSS, and Git. I am a quick learner and I am always
            looking to expand my knowledge and skill set. I am a team player and
            I am excited to work with others to create amazing applications.
          </p>
          <div id="engineer" className="flex flex-row justify-start mt-8 scroll-mt-28">
            <TabButton
              selectTab={() => handleTabChange("skills")}
              active={tab === "skills"}
            >
              {" "}
              Skills{" "}
            </TabButton>
            <TabButton
              selectTab={() => handleTabChange("education")}
              active={tab === "education"}
            >
              {" "}
              Education{" "}
            </TabButton>
            <TabButton
              selectTab={() => handleTabChange("certifications")}
              active={tab === "certifications"}
            >
              {" "}
              Certifications{" "}
            </TabButton>
          </div>
          <div className="mt-8">
            {tabContent}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;