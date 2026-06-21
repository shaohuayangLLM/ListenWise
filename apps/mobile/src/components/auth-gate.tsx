import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPasscode, loadSession, setPasscode, setUnauthorizedHandler } from '@/lib/session';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// 口令门:首启加载会话;无口令显示输入屏;收到 401 自动回门。
// 后端未设 ACCESS_PASSCODE 时,可留空直接进入。
export function AuthGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');

  useEffect(() => {
    let mounted = true;
    setUnauthorizedHandler(() => setAuthed(false));
    loadSession().then(() => {
      if (!mounted) return;
      setAuthed(!!getPasscode());
      setLoading(false);
    });
    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const submit = useCallback(async () => {
    await setPasscode(input.trim() || null);
    setAuthed(true);
  }, [input]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (!authed) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.gate}>
          <ThemedText type="subtitle">ListenWise</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            输入访问口令进入(内测)。后端未设口令可留空直接进入。
          </ThemedText>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="访问口令"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          <TouchableOpacity style={styles.button} onPress={submit} activeOpacity={0.8}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              进入
            </ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gate: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  hint: { marginBottom: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#c96442',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff' },
});
