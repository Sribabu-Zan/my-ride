import React, { useContext, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api from "../../lib/api";
import { setToken } from "../../lib/storage";
import { UserContext } from "../../context/UserContext";
import TextField from "../../components/TextField";
import Button from "../../components/Button";

export default function UserLogin({ navigation }) {
  const { setUser } = useContext(UserContext);
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
      const { data } = await api.post("/users/login", { email, password });
      await setToken(data.token);
      setUser(data.user);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
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
        <TextField
          label="Your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="passenger@example.com"
        />
        <TextField
          label="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••"
        />
        <View className="mt-2">
          <Button title="Login" onPress={submit} loading={loading} />
        </View>
        <Text className="text-center text-base mt-4">
          New here?{" "}
          <Text className="text-blue-600" onPress={() => navigation.navigate("UserSignup")}>
            Create new account
          </Text>
        </Text>
      </View>
      <Pressable onPress={() => navigation.navigate("CaptainLogin")} className="mb-6">
        <Button title="Sign in as Captain" variant="primary" onPress={() => navigation.navigate("CaptainLogin")} />
      </Pressable>
    </SafeAreaView>
  );
}
