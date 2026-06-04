import React, { useRef, useState } from "react";
import { View, TextInput } from "react-native";

// Controlled multi-box OTP. Calls onComplete(code) when all boxes are filled.
export default function OtpInput({ length = 6, onComplete }) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = useRef([]);

  const handleChange = (text, i) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...values];
    next[i] = digit;
    setValues(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
    if (next.every((v) => v !== "")) onComplete(next.join(""));
  };

  const handleKey = (e, i) => {
    if (e.nativeEvent.key === "Backspace" && !values[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <View className="flex-row justify-center gap-2">
      {values.map((v, i) => (
        <TextInput
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={v}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKey(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          className="h-14 w-11 bg-gray-100 rounded-lg text-center text-xl text-ink"
        />
      ))}
    </View>
  );
}
