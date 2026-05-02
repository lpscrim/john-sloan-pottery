"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import NavIcon from "../UI/Nav/NavIcon";
import { useCart } from "../Cart/CartContext";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [onHero, setOnHero] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isWorkPage = pathname === "/work";
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
      router.push("/" + hash);
    }
  };

  const isLight = !isWorkPage && !isAdminPage && onHero;

  return (
    <header className={`fixed text-2xl top-0 left-0 right-0 z-999 px-6 `}>
      {!isLight && (
        <div className="absolute inset-0 w-full h-full  bg-background z-0 pointer-events-none transition-all duration-500" />
      )}
      <div className="relative mx-auto py-2 z-10">
        <div className="relative flex items-center justify-between">
          {/* Logo with crossfade */}
          <button
            className="relative cursor-crosshair w-[50px] h-[50px] transition-colors duration-500"
            onClick={() => {
              conditionalScrollTo("");
              setIsMenuOpen(false);
            }}
          >
            <Image
              src="/LogoB.svg"
              alt="John Sloan Pottery"
              width={50}
              height={50}
              className={`transition-all duration-500 ${
                isLight
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100 pointer-events-auto"
              }`}
            />
            <Image
              src="/Logo.svg"
              alt="John Sloan Pottery"
              width={50}
              height={50}
              className={`absolute inset-0 transition-all duration-500 ${
                isLight
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            />
          </button>

          {/* Desktop Navigation — centred */}
          <nav className="hidden md:flex gap-8 absolute left-1/2 -translate-x-1/2">
            <button
              className={`relative nav text-2xl nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
            >
              <Link href="/work" className="cursor-crosshair">
                <span
                  className={`text-foreground transition-all duration-500 ${
                    isLight
                      ? "opacity-0 pointer-events-none"
                      : "opacity-100 pointer-events-auto"
                  }`}
                >
                  Work
                </span>
                <span
                  className={`text-card absolute left-0 top-0 transition-all duration-500 ${
                    isLight
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  Work
                </span>
              </Link>
            </button>
            <button
              className={`relative nav text-2xl cursor-crosshair nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
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
              className={`relative nav text-2xl cursor-crosshair nav-underline transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
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
            className={`hidden md:flex relative cursor-crosshair transition-colors duration-500 ${isLight ? "text-card" : "text-foreground"}`}
            onClick={toggleCart}
            aria-label="Open cart"
          >
            <span className="relative">
              <ShoppingBag size={22} strokeWidth={1.5} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none">
                  {count}
                </span>
              )}
            </span>
          </button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden cursor-crosshair -mr-4.75 -mt-4 -mb-3.75"
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
              <Link href="/work" className="cursor-crosshair">
                Work
              </Link>
            </button>
            <button
              onClick={() => setIsMenuOpen(false)}
              className={`nav pop-up-2 opacity-0 text-left transition-colors cursor-crosshair ${
                isLight ? "text-card " : "text-foreground "
              }`}
            >
              <Link href="/about" className="cursor-crosshair">
                About
              </Link>
            </button>
            <button
              className={`nav pop-up-3 opacity-0 text-left transition-colors cursor-crosshair ${
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
              className={`nav pop-up-4 opacity-0 text-left transition-colors cursor-crosshair ${
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
                  className={`${isLight ? "text-card " : "text-foreground "}`}
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
