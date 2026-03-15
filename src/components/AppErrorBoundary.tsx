import { Component, PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  children: ReactNode;
  theme: Theme;
};

type State = {
  errorMessage: string | null;
};

export function AppErrorBoundary({ children }: PropsWithChildren): JSX.Element {
  const theme = useTheme();
  return <AppErrorBoundaryInner theme={theme}>{children}</AppErrorBoundaryInner>;
}

class AppErrorBoundaryInner extends Component<Props, State> {
  state: State = {
    errorMessage: null
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }

  componentDidCatch(error: unknown): void {
    // Keep stack trace in browser/dev tools.
    console.error("App crashed:", error);
  }

  render(): ReactNode {
    if (!this.state.errorMessage) {
      return this.props.children;
    }

    const { theme } = this.props;

    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.title, { color: theme.colors.danger }]}>Application Error</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          The app failed to render. Please refresh the page.
        </Text>
        <ScrollView
          style={[styles.box, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          contentContainerStyle={styles.boxContent}
        >
          <Text style={[styles.message, { color: theme.colors.text }]}>{this.state.errorMessage}</Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    ...font(800),
    fontSize: 24,
  },
  subtitle: {
    fontSize: 14
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12
  },
  boxContent: {
    padding: spacing.md
  },
  message: {
    fontFamily: "monospace"
  }
});
