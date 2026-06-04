import React, { createContext, useState } from "react";

export const CaptainContext = createContext();

export default function CaptainProvider({ children }) {
  const [captain, setCaptain] = useState(null);
  return (
    <CaptainContext.Provider value={{ captain, setCaptain }}>
      {children}
    </CaptainContext.Provider>
  );
}
