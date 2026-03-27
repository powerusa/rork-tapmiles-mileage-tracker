import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Reports" }} />
    </Stack>
  );
}
