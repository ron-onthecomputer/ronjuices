import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Home from "./components/Home";
import About from "./components/About";
import Products from "./components/Products";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import CustomCursor from "./components/CustomCursor";
import Preloader from "./components/Preloader";
import Checkout from "./pages/Checkout";
import PaymentReturn from "./pages/PaymentReturn";
import OrderLookup from "./pages/OrderLookup";
import Admin from "./pages/Admin";
import { ProductCatalogProvider } from "./contexts/ProductCatalog";

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const frame = requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <Router>
      <Preloader />
      <ScrollToHash />
      <ProductCatalogProvider>
      <div className="min-h-screen bg-secondary-50 overflow-hidden">
        <CustomCursor />
        <Navigation />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Home />
                <About />
                <Products />
                <Contact />
                <Footer />
              </>
            }
          />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/payment-return" element={<PaymentReturn />} />
          <Route path="/orders" element={<OrderLookup />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
      </ProductCatalogProvider>
    </Router>
  );
}

export default App;
