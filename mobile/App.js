import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import UserProvider from "./src/context/UserContext";
import CaptainProvider from "./src/context/CaptainContext";
import SocketProvider from "./src/context/SocketContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <CaptainProvider>
        <UserProvider>
          <SocketProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </SocketProvider>
        </UserProvider>
      </CaptainProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
