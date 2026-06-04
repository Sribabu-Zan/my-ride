import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useMapStore from "../../store/useMapStore";
import Button from "../../components/Button";

export default function CaptainRideEnd({ navigation, route }) {
  const ride = route.params?.ride;
  const reset = useMapStore((s) => s.reset);

  const goHome = () => {
    reset();
    navigation.reset({ index: 0, routes: [{ name: "CaptainHome" }] });
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-center">
      <Text className="text-5xl text-center mb-4">🎉</Text>
      <Text className="text-2xl font-bold text-ink text-center">Ride completed</Text>
      <Text className="text-gray-500 text-center mt-1 mb-6">You earned ₹{ride?.fare ?? "--"}</Text>
      <Button title="Back to home" onPress={goHome} />
    </SafeAreaView>
  );
}
