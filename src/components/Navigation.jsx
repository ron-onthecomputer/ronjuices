import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-scroll";
import { navLinks } from "../data/navigation";
import BubbleMenu from "./BubbleMenu";
import { DEFAULT_ITEMS } from "../data/navigation";
import useCartStore, { selectCartCount } from "../stores/useCartStore";
import CartDrawer from "./CartDrawer";
import { useNavigate } from "react-router-dom";
import { useProductCatalog } from "../contexts/ProductCatalog";

const CartButton = ({ className = "", isOpen, onClick }) => {
  const cartCount = useCartStore(selectCartCount);
  const displayCount = cartCount > 99 ? "99+" : cartCount;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative montserrat grid h-11 w-11 place-items-center rounded-full border  text-[#3E0162]  hover:border-[#3E0162]  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7E57C2] focus-visible:ring-offset-2 ${className}`}
      aria-label={`Open basket, ${cartCount} ${
        cartCount === 1 ? "item" : "items"
      }`}
      aria-expanded={isOpen}
      aria-controls="shopping-basket"
    >
      <i className="bi bi-cart2 text-2xl" aria-hidden="true"></i>
      <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#3E0162] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#f5f0e8]">
        {displayCount}
      </span>
    </button>
  );
};

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const navigate = useNavigate();
  const { byId } = useProductCatalog();

  const underlineRef = useRef(null);
  const linkRefs = useRef({});

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
          <div className="hidden md:block flex-shrink-0 ">
            <Link
              to="home"
              smooth={true}
              duration={300}
              className="cursor-pointer"
            >
              <img src="/images/logo.png" alt="logo" className="w-28 h-auto" />
            </Link>
          </div>
          <div className="hidden md:block relative">
            <div className="flex space-x-8 relative pb-2">
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
                        : "text-[#1E1E1E] hover:text-[#7E57C2]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5">
            <Link
              to="products"
              smooth={true}
              duration={500}
              className="btn-secondary cursor-pointer px-3 text-sm py-2 grot"
            >
              Order now
            </Link>
            <CartButton
              isOpen={isCartOpen}
              onClick={() => setIsCartOpen(true)}
            />
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
            <CartButton
              className="fixed right-24 top-8 z-[100] h-10 w-10"
              isOpen={isCartOpen}
              onClick={() => setIsCartOpen(true)}
            />
          </div>
        </div>
      </div>
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        productsById={byId}
        onCheckout={() => {
          setIsCartOpen(false);
          navigate("/checkout");
        }}
      />
    </nav>
  );
};

export default Navigation;
