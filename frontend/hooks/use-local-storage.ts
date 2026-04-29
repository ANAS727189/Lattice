"use client";

import { useState } from "react";

export function useLocalStorage(key: string) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(key) ?? "";
  });

  function save(nextValue: string) {
    setValue(nextValue);
    if (nextValue) {
      window.localStorage.setItem(key, nextValue);
    } else {
      window.localStorage.removeItem(key);
    }
  }

  return [value, save] as const;
}
