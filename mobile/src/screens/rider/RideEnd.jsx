import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useMapStore from "../../store/useMapStore";
import Button from "../../components/Button";

export default function RideEnd({ navigation, route }) {
  const ride = route.params?.ride;
  const reset = useMapStore((s) => s.reset);

  const goHome = () => {
    reset();
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-center">
      <Text className="text-5xl text-center mb-4">✅</Text>
      <Text className="text-2xl font-bold text-ink text-center">Trip completed</Text>
      <Text className="text-gray-500 text-center mt-1 mb-6">Thanks for riding with us</Text>

      <View className="bg-gray-100 rounded-2xl p-4 mb-6">
        <Row label="Fare paid" value={`₹${ride?.fare ?? "--"}`} />
        <Row label="Destination" value={ride?.destination} />
        <Row label="Payment" value="Cash" />
      </View>

      <Button title="Back to home" onPress={goHome} />
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-gray-500">{label}</Text>
      <Text className="text-ink font-medium flex-1 text-right" numberOfLines={1}>{value}</Text>
    </View>
  );
}
