import React, { useEffect } from "react";
import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import socket from "../../lib/socket";
import useMapStore from "../../store/useMapStore";
import Map from "../../components/Map";
import Button from "../../components/Button";

export default function Riding({ navigation, route }) {
  const ride = route.params?.ride;
  const { location, destination } = useMapStore();

  useEffect(() => {
    const onEnded = (endedRide) => navigation.navigate("RideEnd", { ride: endedRide || ride });
    socket.on("ride-ended", onEnded);
    return () => socket.off("ride-ended", onEnded);
  }, [navigation, ride]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <Map location={location} destination={destination} showRoute />
      </View>
      <View className="p-5 bg-slate-100 rounded-t-3xl -mt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Image
            source={{ uri: "https://www.pngplay.com/wp-content/uploads/8/Uber-PNG-Photos.png" }}
            className="w-20 h-14"
            resizeMode="contain"
          />
          <View className="items-end">
            <Text className="text-lg font-semibold text-ink">
              {ride?.captain?.fullname?.firstname || "Your captain"}
            </Text>
            <Text className="text-2xl font-bold text-ink">{ride?.otp}</Text>
            <Text className="text-gray-500 text-sm">{ride?.captain?.vehicle?.plate || "—"}</Text>
          </View>
        </View>

        <View className="border-t border-gray-300 py-3">
          <Text className="text-gray-500 text-sm">Drop</Text>
          <Text className="text-ink font-medium" numberOfLines={1}>{ride?.destination}</Text>
        </View>
        <View className="flex-row items-center justify-between py-2">
          <Text className="text-2xl font-bold text-ink">₹{ride?.fare}</Text>
          <Text className="text-gray-500">Cash</Text>
        </View>

        <Button title="Make a payment" variant="accent" onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}
