import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppProvider, useApp } from './src/context/AppContext';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { MovieDetailsScreen } from './src/screens/MovieDetailsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RootStackParamList, TabParamList } from './src/types/navigation';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: 'transparent',
    primary: colors.accent,
  },
};

function TabNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          borderTopWidth: 1,
          bottom: 18,
          elevation: 0,
          height: 66,
          left: 32,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          right: 32,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['rgba(245,254,255,0.22)', 'rgba(8,72,86,0.78)', 'rgba(245,254,255,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabGlass}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const name =
            route.name === 'Discover'
              ? 'home'
              : route.name === 'Search'
                ? 'compass-outline'
                : 'person-outline';
          return (
            <View style={[styles.tabIconBubble, focused && styles.tabIconBubbleActive]}>
              <Ionicons name={name} size={19} color={focused ? colors.background : color} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="Discover" component={DiscoverScreen} />
      <Tabs.Screen name="Search" component={SearchScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { user, booting } = useApp();

  if (booting) {
    return (
      <LinearGradient
        colors={[colors.background, '#073B47', colors.background]}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabGlass: {
    borderColor: 'rgba(245,254,255,0.24)',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  tabItem: {
    borderRadius: 999,
  },
  tabIconBubble: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  tabIconBubbleActive: {
    backgroundColor: colors.text,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
});
