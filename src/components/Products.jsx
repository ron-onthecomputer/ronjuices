import React, { useMemo, useState } from "react";
import {
  products as allProducts,
  INITIAL_VISIBLE_COUNT,
  products,
} from "../data/products";
import { retailers } from "../data/retailers";
import { testimonials } from "../data/testimonials";
import ProductCard from "./ProductCard";
import Marquee from "react-fast-marquee";

const Products = () => {
  const [showAll, setShowAll] = useState(false);
  const firstRow = allProducts.slice(0, INITIAL_VISIBLE_COUNT);
  const extraRow = allProducts.slice(INITIAL_VISIBLE_COUNT);
  const visibleProducts = useMemo(
    () => (showAll ? allProducts : firstRow),
    [showAll]
  );

  const toggleShowAll = () => setShowAll((prev) => !prev);
  const iconClassName = `bi ${
    showAll ? "bi-arrow-up-right-square" : "bi-arrow-down-right-square"
  } text-[1.5rem] hover:text-primary-900`;

  return (
    <section id="products" className="py-20 bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-left ">
          <h2 className="text-4xl text-[#3E0162] mb-4 bagerich">
            The taste of Sensation
          </h2>
          <p className="text-lg text-primary-900 max-w-3xl montserrat">
            Here are our signature flavors,
            <br /> check them out!
          </p>
        </div>

        <div className="my-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {firstRow.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Extra products*/}
        <div
          className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-500 ease-out ${
            showAll
              ? "mt-6 max-h-[2000px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2"
          }`}
        >
          {extraRow.map((product, idx) => (
            <div
              key={product.id}
              className={`transition-all duration-500 ${
                showAll
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: showAll ? `${idx * 60}ms` : "0ms" }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="my-5 flex justify-center show-more relative">
          <button
            onClick={toggleShowAll}
            className="btn-primary rounded-full py-4 w-[50%] md:w-[30%] lg:w-[15%] justify-around text-md z-10 hover:bg-secondary-50"
          >
            {showAll ? "See less" : "See more"}
            <i className={iconClassName}></i>
          </button>
        </div>
        {/* Continuation content inside Products section */}
        <div className="mt-16  pt-16">
          <div className="text-center">
            <h3 className="text-5xl  text-primary-900 bagerich">
              Where to find Us
            </h3>
            <p className="mt-3 py-4 text-lg text-gray-600 montserrat">
              Available at major retailers nationwide
            </p>
          </div>
          <Marquee
            direction="right"
            className="grayscale contrast-100 brightness-5 mt-12"
            speed={100}
          >
            <div className="flex gap-6 items-center">
              {retailers.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-center h-36 mx-6 w-64 lg:w-full"
                >
                  <img
                    src={r.src}
                    alt={r.name}
                    className="w-full h-[90%] object-contain"
                  />
                </div>
              ))}
            </div>
          </Marquee>

          <div className="mt-20 text-center">
            <h3 className="text-2xl md:text-3xl py-4 text-[#1E1E1E] montserrat">
              Our Customers{" "}
              <span className="relative text-[#6847A2] span-underline reenie-beanie text-5xl">
                love us
              </span>
            </h3>
            <p className="py-5 text-[#1E1E1E] montserrat">
              Here is what they have to say about <br /> our products…
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className={` p-6 text-white h-64 montserrat`}
                style={{ backgroundColor: t.bg }}
              >
                <div className="text-2xl leading-none">“</div>
                <p className="mt-2 text-sm opacity-90">{t.quote}</p>”
                <div className="mt-6 flex items-center gap-3">
                  <i className="bi bi-person-circle text-4xl"></i>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs opacity-80">{t.source}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="google.com"
              className="reviews text-primary-900 border-b-2 border-dashed border-primary-900 py-2 satoshi relative"
            >
              Check out all the reviews{" "}
              <i className="bi bi-arrow-right-short text-2xl absolute transition duration-500"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Products;
