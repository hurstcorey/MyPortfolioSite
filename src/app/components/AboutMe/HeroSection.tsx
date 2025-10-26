"use client";
import React, { useMemo } from "react";
import Image from "next/image";
import { TypeAnimation } from "react-type-animation";
import { motion } from "framer-motion";
import Link from "next/link";

const HeroSection = () => {
	// primary (short) and secondary (longer phrases) sequences
	const primarySequence = useMemo(() => ["Corey Hurst...", 2000], []);
	const secondarySequence = useMemo(
		() => ["a Software Engineer", 500, 
      "a Technologist", 500,
      "a Humanitarian", 500, 
      "a Mental health advocate", 500,
      "how might I help you?", 2500],
		[]
	);

	return (
		<section className="lg:py-16">
			<div className="grid grid-cols-1 sm:grid-cols-12">
				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="col-span-8 place-self-center text-center sm:text-left justify-self-start"
				>
					{/* Reserve a little vertical space to reduce jumpiness when subtitle changes */}
					<h1
						className="text-white mb-2 text-4xl sm:text-5xl lg:text-8xl lg:leading-normal font-extrabold"
						style={{ minHeight: "1.2em" }}
					>
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-600">
							Hello, I&apos;m{" "}
						</span>
						<br />
						{/* Primary short animation stays large and stable */}
						<TypeAnimation
							className="inline-block font-mono"
							sequence={primarySequence}
							wrapper="span"
							speed={50}
							repeat={Infinity}
						/>
					</h1>

					{/* Secondary subtitle for longer phrases (smaller, wraps naturally) */}
					<p
						className="text-[#ADB7BE] mb-4 font-mono text-lg sm:text-xl lg:text-2xl"
						style={{ maxWidth: "100%", overflowWrap: "anywhere" }}
					>
						<TypeAnimation
							className="inline-block"
							sequence={secondarySequence}
							wrapper="span"
							speed={40}
							repeat={Infinity}
						/>
					</p>

					<p className="text-[#ADB7BE] text-base sm:text-lg mb-6 lg:text-xl">
						This is a portfolio website built with Next.js and Tailwind CSS. Hosted on AWS
						via Amplify, S3, and CloudFront.
					</p>
					<div>
						<Link
							href="/#contact"
							className="px-6 inline-block py-3 w-full sm:w-fit rounded-full mr-4 bg-gradient-to-br from-primary-500 to-secondary-500 hover:bg-slate-200 text-white"
						>
							Hire Me
						</Link>
						<Link
							href="/cv/corey-hurst-cv.pdf"
							className="px-1 inline-block py-1 w-full sm:w-fit rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:bg-slate-800 text-white mt-3"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span className="block bg-[#121212] hover:bg-slate-800 rounded-full px-5 py-2">
								Download CV
							</span>
						</Link>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="col-span-4 place-self-center mt-4 lg:mt-0"
				>
					<div className="rounded-full bg-[#181818] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] relative">
						<Image
							src="/images/Corey-Hurst-1950s-2.jpg"
							alt="1950s Me"
							className="rounded-full absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"
							width={300}
							height={300}
						/>
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default HeroSection;
