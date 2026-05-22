"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import NavIcon from "../UI/Nav/NavIcon";
import { useCart } from "../Cart/CartContext";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const [onHero, setOnHero] = useState(pathname === "/");

  const isShopPage = pathname === "/shop";
  const isAdminPage = pathname.startsWith("/admin");
  const { count, toggleCart } = useCart();

  useEffect(() => {
    const hero = document.getElementById("home");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setOnHero(entry.isIntersecting),
      { threshold: 0.065 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  const conditionalScrollTo = (hash: string) => {
    if (pathname === "/") {
      if (hash === "") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.location.href = "/" + hash;
    }
  };

  const isLight = !isShopPage && !isAdminPage && onHero;

  return (
    <header className={`fixed text-2xl top-0 left-0 right-0 z-999 px-6 py-2`}>
      {!isLight && (
        <div className="absolute inset-0 w-full h-full  bg-background z-0 pointer-events-none transition-all duration-500" />
      )}
      <div className="relative mx-auto py-2 z-10 ">
        <div className="relative flex min-h-5.5 md:min-h-0 items-center justify-between">
          {/* Logo with crossfade */}
          <button
            className="relative cursor-pointer transition-colors duration-500 -mt-4 -mb-4"
            onClick={() => {
              conditionalScrollTo("");
              setIsMenuOpen(false);
            }}
          >
            <span className="relative block w-8.75 h-8.75">
              <Image
                src="/LogoB.webp"
                alt="John Sloan Pottery"
                fill
                sizes="35px"
                className={`object-contain transition-all nav-underline duration-500 ${
                  isLight
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100 pointer-events-auto"
                }`}
              />
              <Image
                src="/Logo.webp"
                alt="John Sloan Pottery"
                fill
                sizes="35px"
                className={`object-contain absolute top-0 left-0 transition-all nav-underline duration-500 brightness-200 ${
                  isLight
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
              />
            </span>
          </button>

          {/* Desktop Navigation — centred */}
          <nav className="hidden md:flex gap-8 absolute left-1/2 -translate-x-1/2">
            <button
              className={`relative nav text-2xl nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
            >
              <Link href="/shop" className="cursor-pointer">
                <span
                  className={`text-foreground transition-all duration-500 ${
                    isLight
                      ? "opacity-0 pointer-events-none"
                      : "opacity-100 pointer-events-auto"
                  }`}
                >
                  Shop
                </span>
                <span
                  className={`text-card absolute left-0 top-0 transition-all duration-500 ${
                    isLight
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  Shop
                </span>
              </Link>
            </button>
            <button
              className={`relative nav text-2xl cursor-pointer nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
            >
              <Link href="/about">
                <span
                  className={`text-foreground transition-all duration-500 ${
                    isLight
                      ? "opacity-0 pointer-events-none"
                      : "opacity-100 pointer-events-auto"
                  }`}
                >
                  About
                </span>
                <span
                  className={`text-card absolute left-0 top-0 transition-all duration-500 ${
                    isLight
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  About
                </span>
              </Link>
            </button>
            <button
              className={`relative nav text-2xl cursor-pointer nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
            >
              <Link href="/custom-mug">
                <span
                  className={`text-foreground transition-all duration-500 ${
                    isLight
                      ? "opacity-0 pointer-events-none"
                      : "opacity-100 pointer-events-auto"
                  }`}
                >
                  Create
                </span>
                <span
                  className={`text-card absolute left-0 top-0 transition-all duration-500 ${
                    isLight
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  Create
                </span>
              </Link>
            </button>
            <button
              className={`relative nav text-2xl cursor-pointer nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
              onClick={() => conditionalScrollTo("#contact")}
            >
              <span
                className={`text-foreground transition-all duration-500 ${
                  isLight
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100 pointer-events-auto"
                }`}
              >
                Contact
              </span>
              <span
                className={`text-card absolute left-0 top-0 transition-all duration-500 ${
                  isLight
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                Contact
              </span>
            </button>
          </nav>

          {/* Desktop Cart icon — right */}
          <button
            className={`hidden md:flex relative cursor-pointer transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
            onClick={toggleCart}
            aria-label="Open cart"
          >
            <span className="relative">
              <ShoppingBag size={22} strokeWidth={1.5} className="nav-underline"/>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none">
                  {count}
                </span>
              )}
            </span>
          </button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden cursor-pointer -mr-4.75 -mt-4 -mb-3.75"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <NavIcon
              color={isLight ? "background" : "foreground"}
              open={isMenuOpen}
              hoverColor={isLight ? "background" : "foreground"}
            />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className={`md:hidden flex flex-col gap-4 text-xl pt-4 `}>
            <button
              onClick={() => setIsMenuOpen(false)}
              className={`nav pop-up opacity-0 text-left transition-colors ${
                isLight ? "text-card " : "text-foreground "
              }`}
            >
              <Link href="/shop" className="cursor-pointer">
                Shop
              </Link>
            </button>
            <button
              onClick={() => setIsMenuOpen(false)}
              className={`nav pop-up-2 opacity-0 text-left transition-colors cursor-pointer ${
                isLight ? "text-card " : "text-foreground "
              }`}
            >
              <Link href="/about" className="cursor-pointer">
                About
              </Link>
            </button>
            <button
              onClick={() => setIsMenuOpen(false)}
              className={`nav pop-up-3 opacity-0 text-left transition-colors cursor-pointer ${
                isLight ? "text-card " : "text-foreground "
              }`}
            >
              <Link href="/custom-mug" className="cursor-pointer">
                Create
              </Link>
            </button>
            <button
              className={`nav pop-up-4 opacity-0 text-left transition-colors cursor-pointer ${
                isLight ? "text-card " : "text-foreground "
              }`}
              onClick={() => {
                conditionalScrollTo("#contact");
                setIsMenuOpen(false);
              }}
            >
              Contact
            </button>
            <button
              className={`nav pop-up-5 opacity-0 text-left transition-colors cursor-pointer ${
                isLight ? "text-card " : "text-foreground "
              }`}
              onClick={() => {
                toggleCart();
                setIsMenuOpen(false);
              }}
            >
              Cart
              {count > 0 && (
                <span
                  className={` ${isLight ? "text-card " : "text-foreground "}`}
                >
                  {" "}
                  [{count}]
                </span>
              )}
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
