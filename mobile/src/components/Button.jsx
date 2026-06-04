import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";

export default function Button({ title, onPress, loading, disabled, variant = "primary" }) {
  const base = "w-full h-12 rounded-2xl flex-row items-center justify-center";
  const styles = {
    primary: "bg-black",
    accent: "bg-accent",
    light: "bg-gray-200",
  };
  const text = variant === "light" ? "text-black" : "text-white";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${base} ${styles[variant]} ${disabled || loading ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "light" ? "#000" : "#fff"} />
      ) : (
        <Text className={`text-lg font-semibold ${text}`}>{title}</Text>
      )}
    </Pressable>
  );
}
