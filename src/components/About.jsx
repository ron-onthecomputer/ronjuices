import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const sectionRef = useRef(null);
  const pineappleRef = useRef(null);
  const imageContainerRef = useRef(null);
  const textContentRef = useRef(null);
  const strawberriesRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pineapple slices animation
      gsap.fromTo(
        pineappleRef.current.children,
        { y: -100, opacity: 0, rotation: -15 },
        {
          y: 0,
          opacity: 1,
          rotation: 0,
          duration: 1.2,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: pineappleRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Image container animation
      gsap.fromTo(
        imageContainerRef.current,
        { x: -100, opacity: 0, scale: 0.8 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: imageContainerRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Text content animation
      gsap.fromTo(
        textContentRef.current.children,
        { x: 100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.3,
          ease: "power3.out",
          scrollTrigger: {
            trigger: textContentRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Strawberries animation
      gsap.fromTo(
        strawberriesRef.current,
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: strawberriesRef.current,
            start: "top 90%",
            end: "bottom 10%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Continuous floating animation for pineapples
      gsap.to(pineappleRef.current.children, {
        y: -15,
        duration: 3,
        ease: "power1.inOut",
        stagger: 0.5,
        repeat: -1,
        yoyo: true,
        scrollTrigger: {
          trigger: pineappleRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      });

      // Continuous floating animation for strawberries
      gsap.to(strawberriesRef.current.children, {
        y: -10,
        duration: 2.5,
        ease: "power1.inOut",
        stagger: 0.3,
        repeat: -1,
        yoyo: true,
        scrollTrigger: {
          trigger: strawberriesRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="lg:py-20 bg-secondary-50 relative"
    >
      <div className="max-w-7xl md:h-[60vh] lg:h-full mx-auto px-4 sm:px-6 lg:px-8 md:flex relative items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center min-h-screen ">
          {/*Pineapple image*/}
          <div
            ref={pineappleRef}
            className="absolute opacity-60 lg:opacity-100 -left-8 z-1 space-y-4 lg:left-[20%] md:top-[0] lg:top-[15%]"
          >
            {" "}
            <img
              src="/images/pineapple.png"
              alt="pineapple-image"
              className="h-auto w-[80%] max-w-[500px]"
            />
          </div>

          {/* Left Side - Image Container */}
          {/* Main Image Container */}
          <div
            ref={imageContainerRef}
            className="relative custom-class rounded-3xl p-8 shadow-xl lg:h-[70%] lg:w-[80%] hidden lg:block"
          >
            <img
              src="/images/glass.png"
              alt="hand-holding-glass"
              className="absolute h-auto w-[90%] max-w-[500px] bottom-0 left-0"
            />
          </div>

          {/* Right Side - Text Content */}
          <div
            ref={textContentRef}
            className="space-y-8 md:absolute lg:relative"
          >
            {/* Headline */}
            <h2 className="text-5xl md:text-3xl font-semibold montserrat text-[#00544C]">
              Our Story
            </h2>

            {/* Story Text */}
            <div className="space-y-6">
              <p className="text-lg md:text-xl text-[#00544C] montserrat font-medium leading-relaxed">
                RonJuices began with a simple idea — real juice should taste
                like the fruit it comes from. What started as a small kitchen
                experiment quickly grew into a passion for creating juices that
                are as vibrant and refreshing as they are nourishing.
              </p>

              <p className="text-lg md:text-xl text-[#00544C] montserrat font-medium leading-relaxed">
                Every bottle of RonJuices is crafted with care, using only the
                best nature has to offer. We're here to bring a little more
                color, energy, and freshness to your day — one sip at a time.
              </p>
            </div>
          </div>
        </div>
        {/* Strawberries - Bottom Right */}

        <img
          ref={strawberriesRef}
          src="/images/strawberries.png"
          alt="strawberry-image"
          className=" h-auto w-[50%] max-w-[500px] absolute lg:bottom-0 bottom-0 right-0 lg:right-0 z-10 lg:w-[17%] md:w-[25%]"
        />
      </div>
    </section>
  );
};

export default About;
