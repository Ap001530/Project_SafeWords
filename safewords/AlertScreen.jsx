import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AlertsScreen = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const savedAlerts = await AsyncStorage.getItem('alerts');
        if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
      } catch (error) {
        console.error('Failed to load alerts:', error);
      }
    };

    loadAlerts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alert History</Text>
      <ScrollView>
        {alerts.length > 0 ? (
          <FlatList
            data={alerts.reverse()}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.alertItem}>
                <Text style={styles.alertText}>{item.message}</Text>
                <Text style={styles.alertTime}>{item.time}</Text>
                <Text style={styles.alertLocation}>
                  {item.location ? `Location: ${item.location.latitude}, ${item.location.longitude}` : 'No location data'}
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noAlertsText}>No alerts sent yet</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  alertItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  alertText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  alertTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  alertLocation: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 5,
  },
  noAlertsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default AlertsScreen;