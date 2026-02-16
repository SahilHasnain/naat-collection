import { colors, shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { Component, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <View className="flex-1 items-center justify-center bg-neutral-900 px-8">
          <Ionicons
            name="alert-circle"
            size={64}
            color="#ef4444"
            style={{ marginBottom: 16 }}
          />
          <Text className="mb-3 text-center text-2xl font-bold text-white">
            Something went wrong
          </Text>
          <Text className="mb-8 text-center text-base leading-relaxed text-neutral-400 max-w-md">
            {this.state.error.message ||
              "An unexpected error occurred. Please try again."}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            className="rounded-xl px-8 py-4 shadow-lg"
            style={{
              backgroundColor: colors.accent.secondary,
              ...shadows.md,
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text className="text-base font-bold text-white tracking-wide">
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
