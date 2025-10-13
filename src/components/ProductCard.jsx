const ProductCard = ({ product }) => {
  return (
    <div
      className={`group product-tile relative h-[60vh] ${
        product.backgroundColor
      }  shadow-md transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${
        product.defaultHovered ? "hovered" : ""
      }`}
    >
      <img
        src={product.src}
        alt="flavor-can"
        className="absolute inset-0 w-full h-[90%] object-cover transition-all duration-500"
      />
      {product.mostPopular && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 text-xs font-semibold text-white/90 montserrat">
          <i className="bi bi-suit-heart-fill"></i>
          <span>Most Popular</span>
        </div>
      )}

      <div
        className={`h-32 mt-6 absolute bottom-0 w-full flex-1 bg-white p-3 transition-all duration-300  group-hover:opacity-100  hovered:opacity-100`}
      >
        <h3
          className={`mt-4 montserrat text-md font-semibold ${product.accentColor}`}
        >
          {product.name}
        </h3>
        {/*Hover Message*/}
        <div className="product-description hidden transition-all duration-300">
          <p className={`montserrat my-1 ${product.accentColor}`}>
            {product.description}
          </p>
          <i className={`bi bi-bag-plus text-2xl ${product.accentColor}`}></i>
        </div>{" "}
        <div className="container ">
          <div>
            <span className="courier-prime">{product.volume}</span>
          </div>
          <div
            className={`inline-flex self-start px-3 py-1  text-xs font-semibold montserrat ${product.fruitBadgeBg}`}
          >
            100% Natural
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
