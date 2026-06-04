import React, { useState } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api from "../../lib/api";
import useMapStore from "../../store/useMapStore";
import Map from "../../components/Map";
import Button from "../../components/Button";

export default function CaptainRiding({ navigation, route }) {
  const ride = route.params?.ride;
  const { location, destination } = useMapStore();
  const [ending, setEnding] = useState(false);

  const complete = async () => {
    setEnding(true);
    try {
      await api.post("/rides/end-ride", { rideId: ride._id });
      navigation.navigate("CaptainRideEnd", { ride });
    } catch {
      Toast.show({ type: "error", text1: "Could not end ride" });
    } finally {
      setEnding(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <Map location={location} destination={destination} showRoute />
      </View>
      <View className="p-5 bg-slate-100 rounded-t-3xl -mt-6">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-gray-500 text-xs">Heading to</Text>
            <Text className="text-ink font-medium" numberOfLines={1}>{ride?.destination}</Text>
          </View>
          <Text className="text-2xl font-bold text-ink">₹{ride?.fare}</Text>
        </View>
        <Button title="Complete ride" loading={ending} onPress={complete} />
      </View>
    </SafeAreaView>
  );
}
