import { create } from "zustand";

// Cross-screen bridge for the map. Coordinates use react-native-maps' shape:
// { latitude, longitude }.
const useMapStore = create((set) => ({
  location: null,
  destination: null,
  setLocation: (location) => set({ location }),
  setDestination: (destination) => set({ destination }),
  reset: () => set({ location: null, destination: null }),
}));

export default useMapStore;
