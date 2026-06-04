import React, { useContext, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api from "../../lib/api";
import { setToken } from "../../lib/storage";
import { CaptainContext } from "../../context/CaptainContext";
import TextField from "../../components/TextField";
import Button from "../../components/Button";

export default function CaptainSignup({ navigation }) {
  const { setCaptain } = useContext(CaptainContext);
  const [f, setF] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    color: "",
    plate: "",
    capacity: "",
    vehicleType: "car",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.firstname || !f.email || f.password.length < 6 || !f.plate || !f.capacity) {
      Toast.show({ type: "error", text1: "Fill all required fields" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/captains/register", {
        fullname: { firstname: f.firstname, lastname: f.lastname },
        email: f.email,
        password: f.password,
        vehicle: {
          color: f.color,
          plate: f.plate,
          capacity: Number(f.capacity),
          vehicleType: f.vehicleType,
        },
      });
      await setToken(data.token);
      setCaptain(data.captain);
      navigation.reset({ index: 0, routes: [{ name: "CaptainHome" }] });
    } catch {
      Toast.show({ type: "error", text1: "Could not register captain" });
    } finally {
      setLoading(false);
    }
  };

  const types = ["car", "auto", "motorcycle"];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-2xl font-bold text-ink mb-6 mt-4">Become a Captain</Text>
        <View className="flex-row gap-3">
          <View className="flex-1"><TextField label="First name" value={f.firstname} onChangeText={set("firstname")} /></View>
          <View className="flex-1"><TextField label="Last name" value={f.lastname} onChangeText={set("lastname")} /></View>
        </View>
        <TextField label="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Password" value={f.password} onChangeText={set("password")} secureTextEntry />
        <View className="flex-row gap-3">
          <View className="flex-1"><TextField label="Vehicle color" value={f.color} onChangeText={set("color")} /></View>
          <View className="flex-1"><TextField label="Plate" value={f.plate} onChangeText={set("plate")} autoCapitalize="characters" /></View>
        </View>
        <TextField label="Capacity" value={f.capacity} onChangeText={set("capacity")} keyboardType="number-pad" />

        <Text className="text-base font-medium mb-1 text-ink">Vehicle type</Text>
        <View className="flex-row gap-2 mb-4">
          {types.map((t) => (
            <Text
              key={t}
              onPress={() => set("vehicleType")(t)}
              className={`px-4 py-2 rounded-xl capitalize ${
                f.vehicleType === t ? "bg-black text-white" : "bg-gray-100 text-ink"
              }`}
            >
              {t}
            </Text>
          ))}
        </View>

        <Button title="Register" onPress={submit} loading={loading} />
        <Text className="text-center text-base mt-4">
          Already a captain?{" "}
          <Text className="text-blue-600" onPress={() => navigation.navigate("CaptainLogin")}>
            Login
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
