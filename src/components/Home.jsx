import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const heroRef = useRef(null);
  const headlineRef = useRef(null);
  const descriptionRef = useRef(null);
  const buttonsRef = useRef(null);
  const orangeSlicesRef = useRef(null);
  const mintRef = useRef(null);
  const cansRef = useRef(null);
  const canRefs = useRef([]);
  const strawberriesRef = useRef(null);

  useEffect(() => {
    const cans = canRefs.current;
    const ctx = gsap.context(() => {
      // Hero section entrance animation
      gsap.fromTo(
        heroRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: "power2.out" }
      );

      // Headline animation
      gsap.fromTo(
        headlineRef.current.children,
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.2,
          ease: "power3.out",
          delay: 0.3,
        }
      );

      // Description animation
      gsap.fromTo(
        descriptionRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          delay: 0.8,
        }
      );

      // Buttons animation
      gsap.fromTo(
        buttonsRef.current.children,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          delay: 1.2,
        }
      );

      // Floating orange slices
      gsap.fromTo(
        orangeSlicesRef.current.children,
        { y: -50, opacity: 0, rotation: -10 },
        {
          y: 0,
          opacity: 1,
          rotation: 0,
          duration: 1.5,
          stagger: 0.2,
          ease: "power2.out",
          delay: 1.5,
        }
      );

      // Cans animation
      gsap.fromTo(
        cans[0],
        { y: 100, opacity: 0, rotation: 15 },
        {
          y: 0,
          opacity: 1,
          rotation: 15,
          duration: 1.5,
          ease: "power3.out",
          delay: 1.8,
        }
      );

      gsap.fromTo(
        cans[1],
        { y: 100, opacity: 0, rotation: -15 },
        {
          y: 0,
          opacity: 1,
          rotation: -15,
          duration: 1.5,
          ease: "power3.out",
          delay: 2.2,
        }
      );
      // Strawberries animation
      gsap.fromTo(
        strawberriesRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power2.out",
          delay: 2.5,
        }
      );

      // Continuous floating animation for orange slices
      gsap.to(orangeSlicesRef.current.children, {
        y: -20,
        duration: 3,
        ease: "power1.inOut",
        stagger: 0.7,
        repeat: -1,
        yoyo: true,
      });

      // Continuous floating animation for cans
      gsap.to(cansRef.current.children, {
        y: 50,
        duration: 4,
        ease: "power1.inOut",
        stagger: 0.3,
        repeat: -1,
        yoyo: true,
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={heroRef}
      className="min-h-screen bg-secondary-50 relative overflow-hidden flex"
    >
      {/* Decorative vertical lines */}

      <div className="max-w-7xl mx-auto px-4 md:mt-10 sm:px-6 lg:px-8  z-10 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 lg:gap-10 md:gap-0 items-center min-h-screen py-10  ">
          {/* Left Content */}
          <div className="space-y-8 md:h-[75%]  z-10 lg:h-full p-2">
            {/* Headline */}
            {/* Mint Leaves */}
            <img
              src="/images/mint.png"
              alt="mint-leaves"
              className=" h-auto w-[40%] max-w-[500px] md:w-[25%] md:right-[10%] absolute md:top-12 right-5 lg:top-20 lg:right-[45%] lg:w-[15%]"
            />
            <div ref={headlineRef} className="space-y-4 ">
              <h1 className="text-6xl md:text-6xl lg:text-8xl font-bold text-[#3E0162] leading-tight font-askey">
                <div className="relative lg:pb-5">Just say</div>
                <div className="relative lg:pb-5">goodbye to</div>
                <div className="relative ">
                  being{" "}
                  <span className="border-b-2 border-dashed border-primary-900">
                    thirsty
                  </span>
                  <div className="absolute"></div>
                </div>
              </h1>
            </div>
            {/* Description */}
            <div ref={descriptionRef}>
              <p className="text-lg md:text-xl text-primary-900 leading-relaxed max-w-lg font-clash-display py-1">
                Pure energy. Zero crash. <br /> 100% natural ingredients for
                unstoppable performance.
              </p>
            </div>

            {/* Buttons */}
            <div ref={buttonsRef} className="flex sm:flex-row gap-7 w-full">
              <button className="btn-primary md:py-6 w-[50%] md:w-[50%] lg:w-[40%] justify-around text-md">
                Order now{" "}
                <i className="bi bi-arrow-up-right-square text-[1.5rem] hover:text-primary-900"></i>
              </button>
              <button className="btn-secondary lg:w-[40%] md:w-[50%] w-[50%] courier-prime text-md">
                Explore more
              </button>
            </div>
          </div>
          {/* Floating Orange Slices */}
          <div
            ref={orangeSlicesRef}
            className="absolute opacity-70 lg:opacity-100 left-0 top-1/2 transform -translate-y-1/2 -translate-x-[10%] space-y-4 z-1 md:top-[25%] lg:left-0 lg:top-1/2 lg:transform lg:-translate-y-1/2 lg:-translate-x-[10%]"
          >
            <img
              src="/images/oranges.png"
              alt="floating oranges"
              className="floating element h-auto w-[70%] max-w-[500px]"
            />
          </div>
          {/* Right Content - Product Imagery */}
          <div className="w-full h-full">
            {/* Product Cans */}
            <div
              ref={cansRef}
              className="relative z-20 md:flex justify-center g-2 lg:h-full lg:w-full hidden md:h-[70%] md:w-full  "
            >
              {/* Blueberry Can */}
              <img
                ref={(el) => (canRefs.current[1] = el)}
                src="/images/blueberryCan.png"
                alt=""
                className="inset-0 w-full h-[60%] object-cover transform translate-x-[-10%] md:translate-x-[-30%]"
                style={{ animationDelay: "1s" }}
              />

              {/* Cranberry Can */}
              <img
                ref={(el) => (canRefs.current[0] = el)}
                src="/images/cranberryCan.png"
                alt="cranberry-can"
                className="absolute inset-0 w-full h-[80%] object-cover transform  translate-x-[20%] md:translate-x-5"
              />
            </div>

            {/* Blueberries */}
            <img
              ref={strawberriesRef}
              src="/images/blueberries.png"
              alt="floating blueberries"
              className="absolute bottom-0 h-auto lg:w-[20%] w-[60%] right-0 max-w-[500px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
