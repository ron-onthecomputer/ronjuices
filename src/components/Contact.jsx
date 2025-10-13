import React, { useState } from "react";
import { faqs } from "../data/faqs";
import Accordion from "./Accordion";

const Contact = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex((prevIndex) => (prevIndex === index ? null : index));
  };
  return (
    <section id="contact" className="py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-4xl font-bold text-[#3E0162] font-askey">
          Any Questions? We got you
        </h2>

        {/* Accordion */}
        <div className="mt-12 montserrat">
          {faqs.map((item, index) => (
            <Accordion
              key={item.id}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>

        {/* Subscribe */}
        <div className="mt-16 rounded-3xl custom-class p-6 sm:p-8 relative ">
          <img
            src="/images/mint.png"
            alt="mint-leaves"
            className=" h-auto w-[40%] max-w-[500px]  absolute top-[-25%] right-[0] md:w-[20%]"
          />
          <div className="container px-4">
            <h3 className="text-2xl text-[#00544C] montserrat">Subscribe Us</h3>
            <p className="my-2 text-sm text-[#00544C] max-w-xl satoshi">
              Subscribe to our newsletter and be among the <br /> first to
              receive new updates
            </p>

            <form className="my-6 flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="E-mail"
                className="text-[#00544C] px-4 py-4 outline-none focus:ring-1 border-none focus:ring-primary-900 md:w-[50%]"
              />
              <button
                className="px-6 custom-button py-4 flex items-center relative rounded-full bg-[#00544C] text-white transition-all duration-500 md:w-[20%]
                lg:hover:w-[25%]
              "
              >
                Subscribe{" "}
                <i className="bi bi-arrow-up-right-circle absolute right-[5%] top-0 text-[2.5rem]"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
