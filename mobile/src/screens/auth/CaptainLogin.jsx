import React, { useContext, useState } from "react";
import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api from "../../lib/api";
import { setToken } from "../../lib/storage";
import { CaptainContext } from "../../context/CaptainContext";
import TextField from "../../components/TextField";
import Button from "../../components/Button";

export default function CaptainLogin({ navigation }) {
  const { setCaptain } = useContext(CaptainContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || password.length < 6) {
      Toast.show({ type: "error", text1: "Enter email and a 6+ char password" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/captains/login", { email, password });
      await setToken(data.token);
      setCaptain(data.captain);
      navigation.reset({ index: 0, routes: [{ name: "CaptainHome" }] });
    } catch {
      Toast.show({ type: "error", text1: "Invalid credentials" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-between">
      <View>
        <Image
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" }}
          className="w-20 h-10 mb-8 mt-4"
          resizeMode="contain"
        />
        <Text className="text-xl font-bold text-ink mb-4">Captain login</Text>
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="captain@example.com" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
        <View className="mt-2">
          <Button title="Login" onPress={submit} loading={loading} />
        </View>
        <Text className="text-center text-base mt-4">
          New captain?{" "}
          <Text className="text-blue-600" onPress={() => navigation.navigate("CaptainSignup")}>
            Register
          </Text>
        </Text>
      </View>
      <View className="mb-6">
        <Button title="Sign in as User" variant="light" onPress={() => navigation.navigate("UserLogin")} />
      </View>
    </SafeAreaView>
  );
}
