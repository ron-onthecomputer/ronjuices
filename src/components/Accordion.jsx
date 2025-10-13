export default function Accordion({ question, answer, isOpen, onToggle }) {
  return (
    <div className="accordion-div border-b border-gray-400 my-3 p-4">
      <button
        onClick={onToggle}
        className="h-full lg:mb-2 w-full text-left text-[#3E0162] flex font-medium justify-between items-center"
      >
        Q: {question}
        {isOpen ? (
          <i className="bi bi-dash text-xl"></i>
        ) : (
          <i className="bi bi-plus text-xl "></i>
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-44 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="mt-4 text-left opacity-70">{answer}</p>
      </div>
    </div>
  );
}
