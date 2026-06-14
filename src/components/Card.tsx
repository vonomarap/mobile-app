import { PropsWithChildren } from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  variant?: "solid" | "glass";
  blurIntensity?: number;
}>;

export function Card({
  children,
  style,
  padded = true,
  elevated = true,
  variant = "glass",
  blurIntensity = 22
}: Props): JSX.Element {
  const isGlass = variant === "glass";
  
  // Tailwind styles for shadcn-style card
  const containerClasses = [
    "border rounded-xl",
    isGlass 
      ? "border-border/40 bg-white/70 dark:bg-zinc-900/60" 
      : "border-border bg-card dark:bg-zinc-950",
    padded ? "p-4" : "p-0",
    elevated ? "shadow-sm" : "",
  ].filter(Boolean).join(" ");

  if (isGlass && Platform.OS !== "web") {
    return (
      <View className={containerClasses} style={style}>
        <View className="absolute inset-0 rounded-xl overflow-hidden">
          <BlurView
            tint={Platform.OS === "ios" ? "default" : "light"}
            intensity={blurIntensity}
            className="absolute inset-0"
          />
        </View>
        <View className="relative z-10">{children}</View>
      </View>
    );
  }

  return (
    <View 
      className={containerClasses} 
      style={[
        isGlass && Platform.OS === "web"
          ? ({
              backdropFilter: "blur(12px) saturate(120%)",
              WebkitBackdropFilter: "blur(12px) saturate(120%)"
            } as object)
          : null,
        style
      ]}
    >
      {children}
    </View>
  );
}
