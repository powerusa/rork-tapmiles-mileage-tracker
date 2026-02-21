import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TripProvider } from "@/providers/TripProvider";
import { TrackingProvider } from "@/providers/TrackingProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { Colors } from "@/constants/colors";
import '@/utils/backgroundLocation';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="save-trip"
        options={{
          presentation: "modal",
          title: "Save Trip",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="trip-detail"
        options={{
          title: "Trip Details",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <I18nProvider>
          <TripProvider>
            <TrackingProvider>
              <RootLayoutNav />
            </TrackingProvider>
          </TripProvider>
        </I18nProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
