import React, { useContext, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";

import api from "../../lib/api";
import socket from "../../lib/socket";
import useMapStore from "../../store/useMapStore";
import { UserContext } from "../../context/UserContext";
import Map from "../../components/Map";
import Button from "../../components/Button";

const TRIP_LABEL = { local: "Local", intercity: "Inter-city", interstate: "Inter-state" };
const VEHICLES = [
  { key: "car", label: "UberGo", seats: 4 },
  { key: "auto", label: "Auto", seats: 3 },
  { key: "motorcycle", label: "Moto", seats: 1 },
];

export default function Home({ navigation }) {
  const { user } = useContext(UserContext);
  const { location, setLocation, setDestination } = useMapStore();

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [active, setActive] = useState(null); // 'pickup' | 'drop'
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [fare, setFare] = useState(null); // { tripType, fares, distance, duration }
  const [vehicleType, setVehicleType] = useState("car");
  const [bookingMode, setBookingMode] = useState("now");
  const [stage, setStage] = useState("search"); // search | vehicle | waiting
  const debounceRef = useRef(null);

  // 1. Get current location, center map, join socket room.
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
    })();
    if (user?._id) socket.emit("join", { userId: user._id, userType: "user" });
  }, [user]);

  // 2. Realtime: captain accepted / trip started.
  useEffect(() => {
    const onConfirmed = async (ride) => {
      setStage("waiting");
      try {
        const [p, d] = await Promise.all([
          api.get("/maps/get-coordinates", { params: { address: ride.pickup } }),
          api.get("/maps/get-coordinates", { params: { address: ride.destination } }),
        ]);
        const pickupCoord = { latitude: p.data.latitude, longitude: p.data.longitude };
        const dropCoord = { latitude: d.data.latitude, longitude: d.data.longitude };
        setLocation(pickupCoord);
        setDestination(dropCoord);
        socket.emit("destination-coordinates", {
          pickup: { lat: pickupCoord.latitude, lng: pickupCoord.longitude },
          destination: { lat: dropCoord.latitude, lng: dropCoord.longitude },
        });
      } catch {
        /* non-fatal */
      }
    };
    const onStarted = (ride) => navigation.navigate("Riding", { ride });
    socket.on("ride-confirmed", onConfirmed);
    socket.on("ride-started", onStarted);
    return () => {
      socket.off("ride-confirmed", onConfirmed);
      socket.off("ride-started", onStarted);
    };
  }, [navigation]);

  // Debounced autocomplete.
  const onType = (field, value) => {
    setActive(field);
    field === "pickup" ? setPickup(value) : setDrop(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) return setSuggestions([]);
    setLoadingSug(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/maps/get-suggestions", { params: { input: value } });
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }, 500);
  };

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return Toast.show({ type: "error", text1: "Location permission denied" });
    const pos = await Location.getCurrentPositionAsync({});
    try {
      const { data } = await api.get("/maps/reverse-geocode", {
        params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
      chooseSuggestion(data.address, "pickup");
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      Toast.show({ type: "error", text1: "Couldn't fetch your address" });
    }
  };

  const chooseSuggestion = (text, field = active) => {
    field === "pickup" ? setPickup(text) : setDrop(text);
    setSuggestions([]);
    setActive(null);
  };

  const getFare = async () => {
    if (pickup.length < 3 || drop.length < 3)
      return Toast.show({ type: "error", text1: "Enter pickup and destination" });
    try {
      const { data } = await api.get("/rides/get-fare", { params: { pickup, destination: drop } });
      setFare(data);
      if (data.tripType && data.tripType !== "local") setBookingMode("now");
      setStage("vehicle");
    } catch {
      Toast.show({ type: "error", text1: "No route found between these places" });
    }
  };

  const createRide = async () => {
    try {
      const { data } = await api.post("/rides/create", {
        pickup,
        destination: drop,
        vehicleType,
        tripType: fare?.tripType || "local",
        bookingMode,
      });
      if (data?.message === "No captain found in the radius") {
        setStage("search");
        return Toast.show({ type: "error", text1: "No captain found nearby" });
      }
      setStage("waiting");
    } catch {
      Toast.show({ type: "error", text1: "Could not create ride" });
    }
  };

  const fareFor = (key) => fare?.fares?.[key] ?? fare?.[key];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <Map location={location} />
      </View>

      <View className="bg-white rounded-t-3xl -mt-6 p-5 shadow-lg" style={{ maxHeight: "62%" }}>
        {stage === "search" && (
          <>
            <Text className="text-xl font-bold text-ink mb-3">Find a trip</Text>
            <TextInput
              value={pickup}
              onChangeText={(t) => onType("pickup", t)}
              onFocus={() => setActive("pickup")}
              placeholder="Pickup location"
              placeholderTextColor="#9ca3af"
              className="bg-gray-100 rounded-xl px-4 h-12 text-base text-ink mb-2"
            />
            <TextInput
              value={drop}
              onChangeText={(t) => onType("drop", t)}
              onFocus={() => setActive("drop")}
              placeholder="Destination"
              placeholderTextColor="#9ca3af"
              className="bg-gray-100 rounded-xl px-4 h-12 text-base text-ink mb-2"
            />

            {active && (
              <Pressable onPress={useCurrentLocation} className="flex-row items-center gap-3 py-3 border-b border-gray-100">
                <View className="bg-gray-100 h-8 w-8 rounded-full items-center justify-center">
                  <Text>📍</Text>
                </View>
                <Text className="font-medium text-ink">Use current location</Text>
              </Pressable>
            )}

            {loadingSug ? (
              <ActivityIndicator className="my-3" />
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(_, i) => String(i)}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 180 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => chooseSuggestion(item.description)} className="flex-row items-center gap-3 py-3 border-b border-gray-100">
                    <Text>📌</Text>
                    <Text className="text-ink flex-1" numberOfLines={2}>{item.description}</Text>
                  </Pressable>
                )}
              />
            )}

            <View className="mt-3">
              <Button title="See prices" onPress={getFare} />
            </View>
          </>
        )}

        {stage === "vehicle" && fare && (
          <>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-ink">Choose a ride</Text>
              <Text className="px-3 py-1 rounded-full bg-gray-100 text-ink font-medium">
                {TRIP_LABEL[fare.tripType] || "Local"}
              </Text>
            </View>
            {fare.distance ? (
              <Text className="text-gray-500 mb-2">
                {(fare.distance / 1000).toFixed(1)} km · {Math.round((fare.duration || 0) / 60)} min
              </Text>
            ) : null}

            {fare.tripType && fare.tripType !== "local" && (
              <View className="flex-row gap-2 mb-3">
                {["now", "scheduled"].map((m) => (
                  <Text
                    key={m}
                    onPress={() => setBookingMode(m)}
                    className={`px-4 py-2 rounded-xl capitalize ${
                      bookingMode === m ? "bg-black text-white" : "bg-gray-100 text-ink"
                    }`}
                  >
                    {m === "now" ? "Ride now" : "Schedule"}
                  </Text>
                ))}
              </View>
            )}

            {VEHICLES.map((v) => (
              <Pressable
                key={v.key}
                onPress={() => setVehicleType(v.key)}
                className={`flex-row items-center justify-between p-3 rounded-2xl mb-2 border-2 ${
                  vehicleType === v.key ? "border-black" : "border-gray-100"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{v.key === "motorcycle" ? "🏍️" : v.key === "auto" ? "🛺" : "🚗"}</Text>
                  <View>
                    <Text className="font-semibold text-ink">{v.label}</Text>
                    <Text className="text-gray-500 text-xs">{v.seats} seats</Text>
                  </View>
                </View>
                <Text className="font-bold text-ink">₹{fareFor(v.key) ?? "--"}</Text>
              </Pressable>
            ))}

            <View className="mt-1 flex-row gap-2">
              <View className="flex-1">
                <Button title="Back" variant="light" onPress={() => setStage("search")} />
              </View>
              <View className="flex-[2]">
                <Button
                  title={bookingMode === "scheduled" ? "Schedule ride" : `Book ${vehicleType}`}
                  onPress={createRide}
                />
              </View>
            </View>
          </>
        )}

        {stage === "waiting" && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Text className="text-lg font-semibold text-ink mt-4">Looking for a captain…</Text>
            <Text className="text-gray-500 mt-1">{TRIP_LABEL[fare?.tripType] || "Local"} trip</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
