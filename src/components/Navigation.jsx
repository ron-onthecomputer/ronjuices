import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-scroll";
import { navLinks } from "../data/navigation";
import BubbleMenu from "./BubbleMenu";
import { DEFAULT_ITEMS } from "../data/navigation";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const underlineRef = useRef(null);
  const linkRefs = useRef({});

  // Scroll event to track active section
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const scrollPosition = window.scrollY + 100;

      for (let i = navLinks.length - 1; i >= 0; i--) {
        const section = document.getElementById(navLinks[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(navLinks[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animate underline position
  useEffect(() => {
    const activeEl = linkRefs.current[activeSection];
    const underline = underlineRef.current;

    if (activeEl && underline) {
      const { offsetLeft, offsetWidth } = activeEl;
      underline.style.transform = `translateX(${offsetLeft}px)`;
      underline.style.width = `${offsetWidth}px`;
    }
  }, [activeSection]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 lg:py-2 ${
        isScrolled
          ? "md:bg-[#f5f0e8]/90 md:backdrop-blur-md md:shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="hidden md:block flex-shrink-0">
            <Link
              to="home"
              smooth={true}
              duration={500}
              className="cursor-pointer"
            >
              <img src="/images/logo.png" alt="logo" className="w-40 h-auto " />
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden md:block relative">
            <div className="flex space-x-8 relative pb-2">
              {/* Animated Underline */}
              <div
                ref={underlineRef}
                className="absolute bottom-0 h-0.5 bg-[#7E57C2] transition-all duration-300 rounded-full"
                style={{ width: 0, transform: "translateX(0px)" }}
              />
              {navLinks.map((link) => (
                <div
                  key={link.id}
                  ref={(el) => (linkRefs.current[link.id] = el)}
                  className="relative"
                >
                  <Link
                    to={link.id}
                    smooth={true}
                    duration={500}
                    className={`px-3 py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer montserrat ${
                      activeSection === link.id
                        ? "text-[#7E57C2]"
                        : "text-[#3E0162] hover:text-[#7E57C2]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Order Now button */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="btn-primary py-3">Order now</button>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <BubbleMenu
              logo={
                <div className="flex items-center justify-center w-42 h-auto">
                  <Link
                    to="home"
                    smooth={true}
                    duration={500}
                    className="cursor-pointer block w-full h-full"
                  >
                    <img
                      src="/images/logo.png"
                      alt="logo"
                      className="w-full h-full object-contain transform translate-y-[-10%]"
                    />
                  </Link>
                </div>
              }
              items={DEFAULT_ITEMS}
              menuAriaLabel="Toggle navigation"
              menuContentColor="#111111"
              useFixedPosition={false}
              animationEase="back.out(1.5)"
              animationDuration={0.5}
              staggerDelay={0.12}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
