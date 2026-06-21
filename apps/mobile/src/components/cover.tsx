import { Image } from 'expo-image';

import { ThemedView } from './themed-view';

// 播客封面:有图用 expo-image,无图用占位色块。
export function Cover({ uri, size = 52, radius = 8 }: { uri: string | null; size?: number; radius?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={150}
      />
    );
  }
  return <ThemedView type="backgroundSelected" style={{ width: size, height: size, borderRadius: radius }} />;
}
