import React from "react";
import { View, Text, Image, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";

export default function Start({ navigation }) {
  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1080" }}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 justify-between">
        <Image
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" }}
          className="w-20 h-10 ml-5 mt-3"
          resizeMode="contain"
        />
        <View className="bg-white p-6 pb-8 rounded-t-3xl">
          <Text className="text-2xl font-bold text-ink mb-4">
            Get started with Uber
          </Text>
          <Button title="Continue" onPress={() => navigation.navigate("UserLogin")} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
