import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";

import api from "../../lib/api";
import socket from "../../lib/socket";
import useMapStore from "../../store/useMapStore";
import { CaptainContext } from "../../context/CaptainContext";
import Map from "../../components/Map";
import Button from "../../components/Button";
import OtpInput from "../../components/OtpInput";

export default function CaptainHome({ navigation }) {
  const { captain } = useContext(CaptainContext);
  const { location, setLocation, setDestination } = useMapStore();
  const [incoming, setIncoming] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | offered | otp

  // Join + publish location every 10s; receive coords for the route map.
  useEffect(() => {
    let interval;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (captain?._id) socket.emit("join", { userId: captain._id, userType: "captain" });

      const push = async () => {
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        socket.emit("update-location-captain", {
          userId: captain?._id,
          location: { ltd: pos.coords.latitude, lng: pos.coords.longitude },
        });
      };
      push();
      interval = setInterval(push, 10000);
    })();

    const onNewRide = (data) => {
      setIncoming(data.ride || data);
      setPhase("offered");
    };
    const onCoords = (data) => {
      setLocation({ latitude: data.pickup.lat, longitude: data.pickup.lng });
      setDestination({ latitude: data.destination.lat, longitude: data.destination.lng });
    };
    socket.on("new-ride", onNewRide);
    socket.on("destination-coordinates", onCoords);
    return () => {
      clearInterval(interval);
      socket.off("new-ride", onNewRide);
      socket.off("destination-coordinates", onCoords);
    };
  }, [captain]);

  const confirm = async () => {
    try {
      await api.post("/rides/confirm", { rideId: incoming._id, captainId: captain?._id });
      setPhase("otp");
    } catch {
      Toast.show({ type: "error", text1: "Could not confirm ride" });
    }
  };

  const verifyOtp = async (otp) => {
    try {
      const { data } = await api.get("/rides/start-ride", { params: { rideId: incoming._id, otp } });
      navigation.navigate("CaptainRiding", { ride: data || incoming });
      setIncoming(null);
      setPhase("idle");
    } catch {
      Toast.show({ type: "error", text1: "Invalid OTP" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <Map location={location} />
      </View>

      <View className="p-5 bg-white rounded-t-3xl -mt-6">
        <Text className="text-lg font-bold text-ink">
          Hello, {captain?.fullname?.firstname || "Captain"}
        </Text>
        <Text className="text-gray-500">
          {phase === "idle" ? "Waiting for ride requests…" : "Ride request"}
        </Text>
      </View>

      {phase !== "idle" && incoming && (
        <View className="absolute bottom-0 w-full bg-white rounded-t-3xl p-5 shadow-2xl border-t border-gray-200">
          {phase === "offered" ? (
            <>
              <Text className="text-xl font-bold text-ink mb-2">New ride · {incoming.tripType || "local"}</Text>
              <Detail label="Pickup" value={incoming.pickup} />
              <Detail label="Drop" value={incoming.destination} />
              <View className="flex-row items-center justify-between my-3">
                <Text className="text-2xl font-bold text-ink">₹{incoming.fare}</Text>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button title="Ignore" variant="light" onPress={() => { setIncoming(null); setPhase("idle"); }} />
                </View>
                <View className="flex-[2]">
                  <Button title="Accept" variant="accent" onPress={confirm} />
                </View>
              </View>
            </>
          ) : (
            <>
              <Text className="text-xl font-bold text-ink mb-1">Enter rider OTP</Text>
              <Text className="text-gray-500 mb-4">Ask the rider for the 6-digit code</Text>
              <OtpInput length={6} onComplete={verifyOtp} />
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function Detail({ label, value }) {
  return (
    <View className="py-1">
      <Text className="text-gray-500 text-xs">{label}</Text>
      <Text className="text-ink font-medium" numberOfLines={1}>{value}</Text>
    </View>
  );
}
