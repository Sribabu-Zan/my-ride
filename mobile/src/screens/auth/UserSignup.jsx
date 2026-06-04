import React, { useContext, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api from "../../lib/api";
import { setToken } from "../../lib/storage";
import { UserContext } from "../../context/UserContext";
import TextField from "../../components/TextField";
import Button from "../../components/Button";

export default function UserSignup({ navigation }) {
  const { setUser } = useContext(UserContext);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!firstname || !email || password.length < 6) {
      Toast.show({ type: "error", text1: "Fill name, email and a 6+ char password" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/users/register", {
        fullname: { firstname, lastname },
        email,
        password,
      });
      await setToken(data.token);
      setUser(data.user);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch {
      Toast.show({ type: "error", text1: "Could not create account" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-2xl font-bold text-ink mb-6 mt-4">Create account</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="First name" value={firstname} onChangeText={setFirstname} placeholder="John" />
          </View>
          <View className="flex-1">
            <TextField label="Last name" value={lastname} onChangeText={setLastname} placeholder="Doe" />
          </View>
        </View>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="passenger@example.com"
        />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
        <View className="mt-2">
          <Button title="Create account" onPress={submit} loading={loading} />
        </View>
        <Text className="text-center text-base mt-4">
          Have an account?{" "}
          <Text className="text-blue-600" onPress={() => navigation.navigate("UserLogin")}>
            Login
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
