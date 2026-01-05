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
        <View className="flex-1 items-center justify-center bg-gray-50 px-8">
          <Text className="mb-2 text-2xl">⚠️</Text>
          <Text className="mb-4 text-center text-lg font-semibold text-gray-900">
            Something went wrong
          </Text>
          <Text className="mb-6 text-center text-base text-gray-600">
            {this.state.error.message ||
              "An unexpected error occurred. Please try again."}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            className="rounded-lg bg-blue-600 px-6 py-3 active:bg-blue-700"
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text className="font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
