"use client";
import React from "react";
import projectsData from "../Projects/projectsData";
import AnimatedNumber from "../Utilities/AnimatedNumber";

// Utility function to calculate full years between two dates
function calculateYearsBetweenDates(startDate: Date, endDate: Date): number {
  let years = endDate.getFullYear() - startDate.getFullYear();
  if (
    endDate.getMonth() < startDate.getMonth() ||
    (endDate.getMonth() === startDate.getMonth() && endDate.getDate() < startDate.getDate())
  ) {
    years--;
  }
  return years;
}

const AchievementsSection = () => {
  const startDate = new Date('2014-06-01');
  const currentDate = new Date();
  const careerYears = calculateYearsBetweenDates(startDate, currentDate);

const achievementsList = [
    {
      metric: "Projects",
      value: projectsData.length.toString(),
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
                <AnimatedNumber
                  value={parseInt(achievement.value || "0", 10)}
                  duration={700}
                  locale="en-US"
                  useSeparator={true}
                  className="text-white text-4xl font-bold"
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
