import { Redirect } from 'expo-router';

// 根路由重定向到「播客」tab。
export default function Index() {
  return <Redirect href="/podcasts" />;
}
