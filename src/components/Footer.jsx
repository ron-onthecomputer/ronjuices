import React from "react";
import { socialIconsData } from "../data/footerData";
import { quickLinks } from "../data/footerData";
import { legalLinks } from "../data/footerData";
import { contactInfo } from "../data/footerData";

const Footer = () => {
  return (
    <footer className="py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-[#3E0162] montserrat">
          <div>
            <h4 className="text-xs font-bold tracking-widest">QUICK LINKS</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-accent-600">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest">
              HELP AND INFORMATION
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-accent-600">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest">CONTACT</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {contactInfo.map((item, index) => (
                <li key={index}>
                  <span className="font-semibold">{item.label}</span>
                  <br />
                  {item.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:justify-self-end">
            <h4 className="text-xs font-bold tracking-widest mb-4">
              Follow Us
            </h4>
            <div className="flex items-center gap-4 text-primary-900">
              {socialIconsData.map((icon, index) => {
                return (
                  <SocialIcons key={index} name={icon.name} url={icon.url} />
                );
              })}
            </div>
            <p className="mt-6 text-xs text-primary-900/70">
              2025 © RonJuices All rights Reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

function SocialIcons(props) {
  return (
    <a href={props.url}>
      <i className={`bi ${props.name} inline-grid h-8 w-8 text-3xl`}></i>
    </a>
  );
}
