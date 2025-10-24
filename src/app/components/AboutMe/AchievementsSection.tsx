"use client";
import React from "react";
import dynamic from "next/dynamic";

// @ts-ignore - react-animated-numbers has type compatibility issues with Next.js dynamic
const AnimatedNumbers = dynamic(() => import("react-animated-numbers"), {
  ssr: false,
}) as any;

const AchievementsSection = () => {
  const startDate = new Date('2014-06-01');
  const currentDate = new Date();
  const careerYears = currentDate.getFullYear() - startDate.getFullYear() + 
    (currentDate.getMonth() > startDate.getMonth() || 
     (currentDate.getMonth() === startDate.getMonth() && currentDate.getDate() >= startDate.getDate()) ? 0 : -1);

  const achievementsList = [
    {
      metric: "Projects",
      value: "4",
      postfix: "+",
    },
    {
      prefix: "~",
      metric: "Users",
      value: "10000",
    },
    {
      metric: "Certifications",
      value: "3",
    },
    {
      metric: "Years",
      value: careerYears.toString(),
    },
  ];

  return (
    <div className="py-8 px-4 xl:gap-16 sm:py-16 xl:px-16">
      <div className="sm:border-[#33353F] sm:border rounded-md py-8 px-16 flex flex-col sm:flex-row items-center justify-between">
        {achievementsList.map((achievement, index) => {
          return (
            <div
              key={index}
              className="flex flex-col items-center justify-center mx-4 my-4 sm:my-0"
            >
              <h2 className="text-white text-4xl font-bold flex flex-row">
                {achievement.prefix}
                <AnimatedNumbers
                  includeComma
                  animateToNumber={parseInt(achievement.value)}
                  locale="en-US"
                  className="text-white text-4xl font-bold"
                  configs={(_: any, idx: number) => {
                    return {
                      mass: 1,
                      friction: 100,
                      tensions: 140 * (idx + 1),
                    };
                  }}
                />
                {achievement.postfix}
              </h2>
              <p className="text-[#ADB7BE] text-base">{achievement.metric}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsSection;
