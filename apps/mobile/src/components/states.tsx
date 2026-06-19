import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const ACCENT = '#c96442';

export function CenterView({ children }: { children: ReactNode }) {
  return <ThemedView style={styles.center}>{children}</ThemedView>;
}

export function LoadingView({ label = '加载中…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <CenterView>
      <ActivityIndicator color={theme.text} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.gap}>
        {label}
      </ThemedText>
    </CenterView>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <CenterView>
      <ThemedText type="small" themeColor="textSecondary" style={styles.msg}>
        {message || '出错了'}
      </ThemedText>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={styles.retry} activeOpacity={0.7}>
          <ThemedText type="smallBold" style={{ color: ACCENT }}>
            重试
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </CenterView>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <CenterView>
      <ThemedText type="small" themeColor="textSecondary" style={styles.msg}>
        {message}
      </ThemedText>
    </CenterView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  gap: { marginTop: Spacing.two },
  msg: { textAlign: 'center' },
  retry: { marginTop: Spacing.three, paddingVertical: Spacing.two, paddingHorizontal: Spacing.four },
});
