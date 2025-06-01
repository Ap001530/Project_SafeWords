import { Text, SafeAreaView, StyleSheet } from 'react-native';

// You can import supported modules from npm
import { Card } from 'react-native-paper';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CalculatorScreen from './CalculatorScreen.jsx';
import EmergencyApp from './EmergencyApp.jsx';
import SettingsScreen from './SettingScreen.jsx';
import AlertsScreen from './AlertScreen.jsx';

// Create navigators
const Stack = createStackNavigator();
const Tab = createMaterialTopTabNavigator();

// Tab Navigator for Emergency section
function EmergencyTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
        tabBarItemStyle: { width: 120 },
        tabBarStyle: { backgroundColor: '#2c3e50' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarIndicatorStyle: { backgroundColor: '#e74c3c', height: 3 }
      }}
    >
      <Tab.Screen 
        name="Panic" 
        component={EmergencyApp} 
        options={{ tabBarLabel: 'Emergency' }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen} 
        options={{ tabBarLabel: 'Alert History' }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Calculator">
        <Stack.Screen
          name="Calculator"
          component={CalculatorScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmergencyApp"
          component={EmergencyTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
