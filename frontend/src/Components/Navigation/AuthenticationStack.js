// C&V PetShop/frontend/src/Components/Navigation/AuthenticationStack.js
import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboarding from '../AuthenticationScreen/Onboarding';
import LoginScreen from '../AuthenticationScreen/Login';
import RegisterScreen from '../AuthenticationScreen/Register';
import ForgotPassword from '../AuthenticationScreen/ForgotPassword';
import { authColors } from '../../theme/authTheme';

const Stack = createNativeStackNavigator();

export default function AuthenticationStack() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        if (isMounted) {
          setInitialRoute(seen === 'true' ? 'Login' : 'Onboarding');
        }
      } catch (error) {
        if (isMounted) {
          setInitialRoute('Onboarding');
        }
      }
    };

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={authColors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false, // Hide headers since your screens have their own headers
        animation: 'fade',
        animationDuration: 140,
        contentStyle: {
          backgroundColor: authColors.background, // Dark purple theme background
        },
      }}
    >
      <Stack.Screen 
        name="Onboarding" 
        component={Onboarding} 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{
          animation: 'fade', // Fade in for login screen
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{
          animation: 'fade',
          animationDuration: 140,
        }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPassword} 
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 160,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authColors.background,
  },
});
