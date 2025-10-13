// CustomCursor.jsx
import React, { useEffect, useState } from "react";

const CustomCursor = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [trailingPos, setTrailingPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const followMouse = () => {
      setTrailingPos((prev) => {
        const dx = mousePos.x - prev.x;
        const dy = mousePos.y - prev.y;
        return {
          x: prev.x + dx * 0.25, // 0.1 = slower trailing speed
          y: prev.y + dy * 0.25,
        };
      });
      requestAnimationFrame(followMouse);
    };
    followMouse();
  }, [mousePos]);

  return (
    <>
      {/* Main cursor */}
      <div
        className=" hidden lg:block custom-cursor"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
        }}
      />

      {/* Trailing smaller cursor */}
      <div
        className="hidden lg:block custom-cursor trailing"
        style={{
          left: `${trailingPos.x}px`,
          top: `${trailingPos.y}px`,
        }}
      />
    </>
  );
};

export default CustomCursor;
