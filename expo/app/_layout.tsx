import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TripProvider, useTrips } from "@/providers/TripProvider";
import { TrackingProvider, useTracking } from "@/providers/TrackingProvider";
import { I18nProvider, useI18n } from "@/providers/I18nProvider";
import { Colors } from "@/constants/colors";
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import '@/utils/backgroundLocation';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading, storageError, refetchAll } = useTrips();
  const { isRestoring, trackingError, restore } = useTracking();
  const { t } = useI18n();
  if (storageError || trackingError) return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text style={{ color: Colors.text }}>TapMiles could not read or save your local data. Your existing data has been preserved. Retry before closing the app.</Text>
      <Pressable onPress={() => { void refetchAll(); void restore(); }}><Text style={{ color: Colors.accent }}>Retry</Text></Pressable>
    </View>
  );
  if (isLoading || isRestoring) return <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center' }}><ActivityIndicator color={Colors.accent} /></View>;
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
          title: t.saveTrip,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="trip-detail"
        options={{
          title: t.trip,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1, backgroundColor: Colors.background }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <I18nProvider>
            <TripProvider>
              <TrackingProvider>
                <RootLayoutNav />
              </TrackingProvider>
            </TripProvider>
          </I18nProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </QueryClientProvider>
  );
}
