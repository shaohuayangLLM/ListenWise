import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_API_BASE, getApiBase, getPasscode, handleUnauthorized, setApiBase } from '@/lib/session';

const ACCENT = '#c96442';

export default function SettingsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const [base, setBase] = useState(getApiBase());
  const hasPasscode = !!getPasscode();

  const saveBase = async () => {
    await setApiBase(base);
    setBase(getApiBase());
    await qc.invalidateQueries();
    Alert.alert('已保存', '后端地址已更新');
  };

  const resetBase = async () => {
    await setApiBase(DEFAULT_API_BASE);
    setBase(DEFAULT_API_BASE);
    await qc.invalidateQueries();
  };

  const signOut = () => {
    Alert.alert('退出登录', '将清除访问口令并回到口令门。', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => handleUnauthorized() },
    ]);
  };

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="后端地址">
          <TextInput
            value={base}
            onChangeText={setBase}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={DEFAULT_API_BASE}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <View style={styles.btnRow}>
            <Button label="保存" onPress={saveBase} primary />
            <Button label="恢复默认(Render)" onPress={resetBase} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            真机调试本地后端用电脑局域网 IP,例如 http://192.168.x.x:8000/api
          </ThemedText>
        </Section>

        <Section title="访问口令">
          <ThemedText type="small" themeColor="textSecondary">
            当前:{hasPasscode ? '已设置' : '未设置'}
          </ThemedText>
          <Button label="退出 / 重设口令" onPress={signOut} />
        </Section>

        <Section title="关于">
          <ThemedText type="small" themeColor="textSecondary">
            ListenWise 移动端 · Phase 0 内测
          </ThemedText>
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

function Button({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.button, primary ? styles.buttonPrimary : styles.buttonGhost]}>
      <ThemedText type="smallBold" style={{ color: primary ? '#ffffff' : ACCENT }}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four },
  section: { gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  btnRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  button: { borderRadius: Spacing.two, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  buttonPrimary: { backgroundColor: ACCENT },
  buttonGhost: { borderWidth: 1, borderColor: ACCENT },
});
