import { useEffect, useMemo, useState } from "react";

const fruits = [
  {
    name: "orange",
    icon: (
      <>
        <circle cx="32" cy="35" r="20" />
        <path d="M31 15c1-7 6-11 13-11-1 7-5 11-13 11Z" />
        <path
          d="M31 15c-1-5-4-8-8-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    name: "pear",
    icon: (
      <>
        <path
          d="M37 20c1-4-1-9-5-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M36 17c4-5 9-6 14-4-3 6-8 8-14 4Z" />
        <path d="M32 17c-7 0-10 7-11 13-1 5-8 9-8 18 0 9 8 13 19 13s19-4 19-13c0-9-7-13-8-18-1-6-4-13-11-13Z" />
      </>
    ),
  },
  {
    name: "strawberry",
    icon: (
      <>
        <path d="M15 24c2 19 10 32 17 36 7-4 15-17 17-36-10-5-24-5-34 0Z" />
        <path d="m32 22-6-9 7 3 5-7 1 9 9 2-9 5-7-3Z" />
        <g fill="#242424">
          <circle cx="24" cy="32" r="1.5" />
          <circle cx="38" cy="32" r="1.5" />
          <circle cx="29" cy="42" r="1.5" />
          <circle cx="42" cy="42" r="1.5" />
          <circle cx="33" cy="52" r="1.5" />
        </g>
      </>
    ),
  },
  {
    name: "apple",
    icon: (
      <>
        <path
          d="M32 19c0-6 3-11 8-14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M35 15c5-6 11-7 17-4-4 7-10 9-17 4Z" />
        <path d="M32 22c-7-6-20-3-20 10 0 14 10 29 20 29s20-15 20-29c0-13-13-16-20-10Z" />
      </>
    ),
  },
  {
    name: "cherries",
    icon: (
      <>
        <path
          d="M23 39C25 23 31 13 42 8M43 9c-1 12 3 21 9 28M41 9c-8 1-13-2-16-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="20" cy="47" r="11" />
        <circle cx="49" cy="46" r="11" />
      </>
    ),
  },
];

function shuffledFruitIndexes() {
  return fruits.map((_, index) => index).sort(() => Math.random() - 0.5);
}

function Preloader() {
  const sequence = useMemo(shuffledFruitIndexes, []);
  const [step, setStep] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const fruitInterval = window.setInterval(() => {
      setStep((current) => current + 1);
    }, 640);
    const exitTimer = window.setTimeout(() => setIsLeaving(true), 1450);
    const removeTimer = window.setTimeout(() => {
      document.body.style.overflow = previousOverflow;
      setIsVisible(false);
    }, 2350);

    return () => {
      window.clearInterval(fruitInterval);
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!isVisible) return null;

  const fruit = fruits[sequence[step % sequence.length]];

  return (
    <div
      className={`preloader${isLeaving ? " preloader--leaving" : ""}`}
      aria-hidden="true"
    >
      <svg
        key={step}
        className="preloader__fruit"
        viewBox="0 0 64 64"
        role="img"
        aria-label={fruit.name}
      >
        {fruit.icon}
      </svg>
    </div>
  );
}

export default Preloader;
