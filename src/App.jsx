import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import About from "./components/About";
import Products from "./components/Products";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import CustomCursor from "./components/CustomCursor";

function App() {
  return (
    <Router>
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
