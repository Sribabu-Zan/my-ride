import React from "react";
import { View, Text, TextInput } from "react-native";

export default function TextField({ label, error, className = "", ...props }) {
  return (
    <View className="mb-3">
      {label ? <Text className="text-base font-medium mb-1 text-ink">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9ca3af"
        className={`bg-gray-100 rounded-xl px-4 h-12 text-base text-ink ${className}`}
        {...props}
      />
      {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}
    </View>
  );
}
