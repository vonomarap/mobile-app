import { registerRootComponent } from "expo";
import { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

let RootComponent: ComponentType;

try {
  // Using require here allows catching module-level crashes and showing them on screen.
  RootComponent = require("./App").default;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to initialize app:", error);

  RootComponent = function BootError(): JSX.Element {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Boot Error</Text>
        <Text style={styles.subtitle}>Application failed to initialize.</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    );
  };
}

registerRootComponent(RootComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6F5F2",
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#B83A3A",
    marginBottom: 12
  },
  subtitle: {
    fontSize: 16,
    color: "#122033",
    marginBottom: 12
  },
  message: {
    fontSize: 14,
    color: "#122033",
    fontFamily: "monospace"
  }
});
