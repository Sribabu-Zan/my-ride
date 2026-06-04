import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Start from "../screens/auth/Start";
import UserLogin from "../screens/auth/UserLogin";
import UserSignup from "../screens/auth/UserSignup";
import CaptainLogin from "../screens/auth/CaptainLogin";
import CaptainSignup from "../screens/auth/CaptainSignup";

import Home from "../screens/rider/Home";
import Riding from "../screens/rider/Riding";
import RideEnd from "../screens/rider/RideEnd";

import CaptainHome from "../screens/captain/CaptainHome";
import CaptainRiding from "../screens/captain/CaptainRiding";
import CaptainRideEnd from "../screens/captain/CaptainRideEnd";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Start" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Start" component={Start} />
      <Stack.Screen name="UserLogin" component={UserLogin} />
      <Stack.Screen name="UserSignup" component={UserSignup} />
      <Stack.Screen name="CaptainLogin" component={CaptainLogin} />
      <Stack.Screen name="CaptainSignup" component={CaptainSignup} />

      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Riding" component={Riding} />
      <Stack.Screen name="RideEnd" component={RideEnd} />

      <Stack.Screen name="CaptainHome" component={CaptainHome} />
      <Stack.Screen name="CaptainRiding" component={CaptainRiding} />
      <Stack.Screen name="CaptainRideEnd" component={CaptainRideEnd} />
    </Stack.Navigator>
  );
}
