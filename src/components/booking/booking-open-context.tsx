"use client";

import * as React from "react";

const BookingOpenContext = React.createContext(false);

export function BookingOpenProvider({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <BookingOpenContext.Provider value={open}>{children}</BookingOpenContext.Provider>
  );
}

export function useBookingOpen() {
  return React.useContext(BookingOpenContext);
}
