import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmergencyApp = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [cancelTimer, setCancelTimer] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (route.params?.trustedContacts) {
          setContacts(route.params.trustedContacts);
        }
        
        const savedContacts = await AsyncStorage.getItem('trustedContacts');
        if (savedContacts && !route.params?.trustedContacts) {
          const parsed = JSON.parse(savedContacts);
          setContacts(parsed.map(c => c.number).filter(Boolean));
        }

        await checkLocationPermission();
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [route.params?.trustedContacts]);

  const checkLocationPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setErrorMsg('Failed to get location permission');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleActivateLocation = async () => {
    if (hasLocationPermission) return;
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setHasLocationPermission(true);
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } else {
      Alert.alert(
        'Permission Required',
        'SafeWords needs location access to function properly',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const saveAlert = async (message, locationData = null) => {
    const newAlert = {
      message,
      time: new Date().toLocaleString(),
      location: locationData?.coords
    };

    try {
      const existing = await AsyncStorage.getItem('alerts');
      const alerts = existing ? JSON.parse(existing) : [];
      alerts.push(newAlert);
      await AsyncStorage.setItem('alerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  };

  const sendToContactsIndividually = async (contacts, message) => {
    let successCount = 0;
    const failedContacts = [];
    
    for (const contact of contacts) {
      try {
        const { result } = await SMS.sendSMSAsync([contact], message);
        if (result === 'sent') {
          successCount++;
        } else {
          failedContacts.push(contact);
        }
      } catch (e) {
        console.error(`Failed to send to ${contact}:`, e);
        failedContacts.push(contact);
      }
    }
    
    saveAlert(`Sent to ${successCount} of ${contacts.length} contacts`);
    
    if (failedContacts.length > 0) {
      Alert.alert(
        'Partial Success',
        `Sent to ${successCount} contacts. Failed to send to: ${failedContacts.join(', ')}`
      );
    } else {
      Alert.alert('Success', `Alert sent to all ${contacts.length} contacts`);
    }
  };

  const sendEmergencyAlert = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Please add trusted contacts in Settings');
      return;
    }

    setIsSending(true);
    const message = `EMERGENCY ALERT! I need immediate help! My location: ${location.coords.latitude}, ${location.coords.longitude}. Sent via SafeWords App`;
    
    await saveAlert(`Initiating alert to ${contacts.length} contacts`, location);

    try {
      const available = await SMS.isAvailableAsync();
      if (available) {
        if (Platform.OS === 'android') {
          try {
            const { result } = await SMS.sendSMSAsync(contacts, message);
            if (result === 'sent') {
              saveAlert(`Alert sent to all ${contacts.length} contacts`);
              Alert.alert('Success', `Emergency alert sent to ${contacts.length} contacts`);
            } else {
              await sendToContactsIndividually(contacts, message);
            }
          } catch (e) {
            console.log("Group send failed, trying individual");
            await sendToContactsIndividually(contacts, message);
          }
        } else {
          const smsUrl = `sms:${contacts.join(',')}&body=${encodeURIComponent(message)}`;
          await Linking.openURL(smsUrl);
          saveAlert(`Opened messages with ${contacts.length} contacts`);
        }
      } else {
        Alert.alert('Error', 'SMS service not available');
        saveAlert('SMS service not available');
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      saveAlert('Failed to send emergency alert');
      Alert.alert('Error', 'Failed to send emergency alert');
    } finally {
      setIsSending(false);
    }
  };

  const startTracking = async () => {
    if (!hasLocationPermission) {
      Alert.alert('Location Required', 'Please activate location first');
      return;
    }

    setIsTracking(true);
    await saveAlert('Tracking started', location);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10
      },
      (newLocation) => {
        setLocation(newLocation);
        saveAlert('Location update', newLocation);
      }
    );

    setLocationSubscription(sub);
  };

  const stopTracking = () => {
    if (locationSubscription) locationSubscription.remove();
    setIsTracking(false);
    saveAlert('Tracking stopped');
  };

  const handlePanicPress = () => {
    setIsPanicActive(true);
    const timer = setTimeout(() => {
      sendEmergencyAlert();
      startTracking();
      setIsPanicActive(false);
    }, 3000);
    setCancelTimer(timer);
  };

  const handlePanicRelease = () => {
    if (cancelTimer) {
      clearTimeout(cancelTimer);
      setCancelTimer(null);
      setIsPanicActive(false);
    }
  };

  const goToSettings = () => {
    navigation.navigate('Settings', {
      trustedContacts: contacts,
      isTracking: isTracking,
      currentLocation: location?.coords
    });
  };

  const emergencyExit = () => {
    if (isTracking) stopTracking();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Calculator' }]
      })
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>SafeWords</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={goToSettings}
        >
          <MaterialIcons name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <MaterialIcons 
            name={hasLocationPermission ? 'location-on' : 'location-off'} 
            size={20} 
            color={hasLocationPermission ? '#4CAF50' : '#F44336'} 
          />
          <Text style={styles.statusText}>
            {hasLocationPermission ? 'Location Active' : 'Location Denied'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <MaterialIcons 
            name={isTracking ? 'location-on' : 'location-off'} 
            size={20} 
            color={isTracking ? '#4CAF50' : '#F44336'} 
          />
          <Text style={styles.statusText}>
            {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <MaterialIcons 
            name="people" 
            size={20} 
            color={contacts.length > 0 ? '#4CAF50' : '#F44336'} 
          />
          <View style={styles.contactsContainer}>
            <Text style={styles.statusText}>
              {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}
            </Text>
            {contacts.length > 0 && (
              <ScrollView horizontal style={styles.contactsScroll}>
                <Text style={styles.contactsText}>
                  {contacts.join(', ')}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </View>

      {!hasLocationPermission && (
        <TouchableOpacity
          style={styles.activateButton}
          onPress={handleActivateLocation}
          disabled={isRequestingPermission}
        >
          {isRequestingPermission ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.activateButtonText}>ACTIVATE LOCATION</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.panicButton, isPanicActive && styles.panicActive]}
        onPressIn={handlePanicPress}
        onPressOut={handlePanicRelease}
      >
        {isPanicActive ? (
          <>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.panicButtonText}>RELEASE TO CANCEL</Text>
          </>
        ) : (
          <Text style={styles.panicButtonText}>HOLD FOR EMERGENCY</Text>
        )}
      </TouchableOpacity>

      <View style={styles.controls}>
        {isTracking ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={stopTracking}
          >
            <Text style={styles.controlText}>STOP TRACKING</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.startButton]}
            onPress={startTracking}
            disabled={!hasLocationPermission}
          >
            <Text style={styles.controlText}>START TRACKING</Text>
          </TouchableOpacity>
        )}
      </View>

      {location && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            Last Known Location:
          </Text>
          <Text style={styles.coordinates}>
            {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.exitButton}
        onPress={emergencyExit}
      >
        <Text style={styles.exitText}>EMERGENCY EXIT</Text>
      </TouchableOpacity>

      {isSending && (
        <View style={styles.sendingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.sendingText}>
            Sending to {contacts.length} contact{contacts.length !== 1 ? 's' : ''}...
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#1a1a1a'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  settingsButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 20
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5
  },
  statusText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16
  },
  contactsContainer: {
    flex: 1,
    marginLeft: 8
  },
  contactsScroll: {
    maxHeight: 40
  },
  contactsText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2
  },
  activateButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10
  },
  activateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  panicButton: {
    backgroundColor: '#e74c3c',
    width: 250,
    height: 250,
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 30,
    elevation: 10
  },
  panicActive: {
    backgroundColor: '#c0392b'
  },
  panicButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15
  },
  controlButton: {
    padding: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center'
  },
  startButton: {
    backgroundColor: '#27ae60'
  },
  stopButton: {
    backgroundColor: '#e74c3c'
  },
  controlText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  locationContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 15,
    marginTop: 20
  },
  locationText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  coordinates: {
    color: '#bdc3c7',
    fontSize: 14
  },
  exitButton: {
    backgroundColor: '#34495e',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30
  },
  exitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 18
  }
});

export default EmergencyApp;
