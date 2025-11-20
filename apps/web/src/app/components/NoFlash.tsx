"use client";
// This component ensures theme is applied immediately to prevent FOUC
export function NoFlash() {
  return null; // The blocking script in layout.tsx handles the theme setting
}

