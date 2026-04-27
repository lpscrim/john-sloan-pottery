'use client'

import { useState } from "react";
import styles from "./NavIcon.module.css";

export default function NavIcon( { open, color, hoverColor } : { open: boolean, color: string, hoverColor?: string } ) {
  const [isHovered, setIsHovered] = useState(false);

  const currentColor = isHovered && hoverColor ? hoverColor : color;

  return (
    <div
      id="nav-icon"
      className={` ${styles.navIcon} ${open ? styles.open : ""} `}
      style={{ position: "relative", scale: "80%" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={{ background: `var(--${currentColor})` }}></span>
      <span style={{ background: `var(--${currentColor})` }}></span>
      <span style={{ background: `var(--${currentColor})` }}></span>
    </div>
  );
}