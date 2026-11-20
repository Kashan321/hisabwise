import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { type ColorValue, View } from 'react-native';

import { OperationStatusBar } from '@/components/OperationStatusBar';
import { useCart } from '@/lib/cart/CartContext';
import { colors } from '@/constants/theme';

function TabIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: ColorValue | undefined;
}) {
  const iconColor = typeof props.color === 'string' ? props.color : colors.primary;
  return (
    <FontAwesome
      name={props.name}
      size={22}
      color={iconColor}
      style={{ marginBottom: -2 }}
    />
  );
}

export default function MainTabsLayout() {
  const { itemCount } = useCart();

  return (
    <View style={{ flex: 1 }}>
      <OperationStatusBar />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontWeight: '700' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color }) => <TabIcon name="cutlery" color={color} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            tabBarBadge: itemCount > 0 ? itemCount : undefined,
            tabBarIcon: ({ color }) => <TabIcon name="shopping-cart" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}