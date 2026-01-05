import ErrorBoundary from "@/components/ErrorBoundary";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack />
    </ErrorBoundary>
  );
}
