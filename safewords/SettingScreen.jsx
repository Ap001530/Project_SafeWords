import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import * as SMS from 'expo-sms';

const SettingsScreen = ({ navigation, route }) => {
  const predefinedContacts = [
    { name: '🚑 Ambulance', number: '104' },
    { name: '🚓 Police', number: '107' },
    { name: '🌐 English Help', number: '112' },
  ];

  const [userContacts, setUserContacts] = useState([]);
  const [newContact, setNewContact] = useState('');
  const [contactName, setContactName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [currentAccessCode, setCurrentAccessCode] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [confirmAccessCode, setConfirmAccessCode] = useState('');
  const [isChangingCode, setIsChangingCode] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const savedContacts = await AsyncStorage.getItem('userContacts');
        if (savedContacts) {
          setUserContacts(JSON.parse(savedContacts));
        }
        
        const available = await SMS.isAvailableAsync();
        setSmsAvailable(available);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadContacts();
  }, []);

  useEffect(() => {
    const saveContacts = async () => {
      try {
        await AsyncStorage.setItem('userContacts', JSON.stringify(userContacts));
      } catch (error) {
        console.error('Failed to save contacts:', error);
      }
    };
    
    saveContacts();
  }, [userContacts]);

  const getAllContactNumbers = () => {
    const userNumbers = userContacts.map(c => {
      if (typeof c === 'object') return c.number;
      return c;
    }).filter(Boolean);

    const predefinedNumbers = predefinedContacts
      .filter(pre => userContacts.some(uc => {
        const ucNumber = typeof uc === 'object' ? uc.number : uc;
        return ucNumber === pre.number;
      }))
      .map(pre => pre.number);

    return [...userNumbers, ...predefinedNumbers].filter(Boolean);
  };

  const pushContactsToEmergency = async () => {
    try {
      const contactsToPush = getAllContactNumbers();
      await AsyncStorage.setItem('trustedContacts', JSON.stringify(contactsToPush));
      
      // Force update the Emergency screen by navigating to it
      navigation.navigate('EmergencyApp', { 
        trustedContacts: contactsToPush,
        refresh: Date.now() // Add timestamp to force update
      });
      
      Alert.alert('Success', `Contacts pushed to emergency screen (${contactsToPush.length} contacts)`);
    } catch (error) {
      Alert.alert('Error', 'Failed to push contacts');
      console.error('Failed to push contacts:', error);
    }
  };

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendVerificationSMS = async (phone) => {
    try {
      setIsVerifying(true);
      const code = generateCode();
      setGeneratedCode(code);
      
      const { result } = await SMS.sendSMSAsync(
        [phone], 
        `Your SafeWords verification code: ${code}`
      );
      
      if (result === 'sent' || result === 'unknown') {
        setShowVerificationInput(true);
        Alert.alert('Code Sent', 'Check your messages for the verification code');
      } else {
        throw new Error('Failed to send SMS');
      }
    } catch (error) {
      setVerificationError('Failed to send verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyContact = () => {
    if (verificationCode !== generatedCode) {
      setVerificationError('Invalid verification code');
      return;
    }

    const contact = {
      name: contactName || `Contact ${userContacts.length + 1}`,
      number: newContact.trim(),
      verified: true
    };

    if (editingIndex !== null) {
      const updated = [...userContacts];
      updated[editingIndex] = contact;
      setUserContacts(updated);
    } else {
      setUserContacts([...userContacts, contact]);
    }

    resetVerification();
  };

  const resetVerification = () => {
    setNewContact('');
    setContactName('');
    setVerificationCode('');
    setShowVerificationInput(false);
    setEditingIndex(null);
    setVerificationError(null);
  };

  const editContact = (index) => {
    const contact = userContacts[index];
    setNewContact(contact.number);
    setContactName(contact.name);
    setEditingIndex(index);
  };

  const deleteContact = (index) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => {
            const updated = [...userContacts];
            updated.splice(index, 1);
            setUserContacts(updated);
          }
        }
      ]
    );
  };

  const togglePredefinedContact = (contact) => {
    const isAdded = userContacts.some(c => {
      const cNumber = typeof c === 'object' ? c.number : c;
      return cNumber === contact.number;
    });
    
    if (isAdded) {
      setUserContacts(userContacts.filter(c => {
        const cNumber = typeof c === 'object' ? c.number : c;
        return cNumber !== contact.number;
      }));
    } else {
      setUserContacts([...userContacts, {
        name: contact.name,
        number: contact.number,
        verified: true
      }]);
    }
  };

  const handleChangeAccessCode = async () => {
    if (!currentAccessCode || !newAccessCode || !confirmAccessCode) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newAccessCode !== confirmAccessCode) {
      Alert.alert('Error', 'New codes do not match');
      return;
    }

    if (newAccessCode.length !== 4) {
      Alert.alert('Error', 'Access code must be 4 digits');
      return;
    }

    setIsChangingCode(true);
    
    try {
      const savedAccessCode = await AsyncStorage.getItem('accessCode') || '1234';
      
      if (currentAccessCode !== savedAccessCode) {
        Alert.alert('Error', 'Current access code is incorrect');
        return;
      }

      await AsyncStorage.setItem('accessCode', newAccessCode);
      Alert.alert('Success', 'Access code changed successfully');
      setCurrentAccessCode('');
      setNewAccessCode('');
      setConfirmAccessCode('');
    } catch (error) {
      Alert.alert('Error', 'Failed to change access code');
    } finally {
      setIsChangingCode(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.sectionTitle}>Change Access Code</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Current Access Code"
        value={currentAccessCode}
        onChangeText={setCurrentAccessCode}
        secureTextEntry
        keyboardType="numeric"
        maxLength={4}
      />
      
      <TextInput
        style={styles.input}
        placeholder="New Access Code (4 digits)"
        value={newAccessCode}
        onChangeText={setNewAccessCode}
        secureTextEntry
        keyboardType="numeric"
        maxLength={4}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm New Access Code"
        value={confirmAccessCode}
        onChangeText={setConfirmAccessCode}
        secureTextEntry
        keyboardType="numeric"
        maxLength={4}
      />
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleChangeAccessCode}
        disabled={isChangingCode}
      >
        <Text style={styles.buttonText}>
          {isChangingCode ? 'Changing...' : 'Change Access Code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.pushButton]}
        onPress={pushContactsToEmergency}
        disabled={userContacts.length === 0}
      >
        <Text style={styles.buttonText}>PUSH CONTACTS TO EMERGENCY</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        {editingIndex !== null ? 'Edit Contact' : 'Add New Contact'}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Contact Name (Optional)"
        value={contactName}
        onChangeText={setContactName}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number (+1234567890)"
        value={newContact}
        onChangeText={setNewContact}
        keyboardType="phone-pad"
      />

      {verificationError && (
        <Text style={styles.errorText}>{verificationError}</Text>
      )}

      {showVerificationInput ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.verifyButton]}
              onPress={verifyContact}
            >
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]}
              onPress={resetVerification}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, (!newContact || !smsAvailable) && styles.disabled]}
          onPress={() => {
            if (!newContact.trim()) {
              setVerificationError('Please enter a phone number');
              return;
            }
            sendVerificationSMS(newContact.trim());
          }}
          disabled={!newContact || !smsAvailable}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      {predefinedContacts.map((contact, index) => {
        const isAdded = userContacts.some(c => {
          const cNumber = typeof c === 'object' ? c.number : c;
          return cNumber === contact.number;
        });
        return (
          <TouchableOpacity
            key={`predefined-${index}`}
            style={[styles.contactItem, isAdded && styles.addedContact]}
            onPress={() => togglePredefinedContact(contact)}
          >
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactNumber}>{contact.number}</Text>
            <Text style={styles.addRemoveText}>
              {isAdded ? '✅ Added' : '➕ Add'}
            </Text>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.sectionTitle}>Your Contacts ({userContacts.filter(c => 
        !predefinedContacts.some(p => p.number === (typeof c === 'object' ? c.number : c))).length})</Text>
      
      {userContacts.length > 0 ? (
        userContacts
          .filter(contact => 
            !predefinedContacts.some(pre => pre.number === (typeof contact === 'object' ? contact.number : contact)))
          .map((contact, index) => (
            <View 
              key={`user-${index}`}
              style={[styles.contactItem, contact.verified && styles.verifiedContact]}
            >
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
                {contact.verified && (
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                )}
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity onPress={() => editContact(index)}>
                  <MaterialIcons name="edit" size={22} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteContact(index)}>
                  <MaterialIcons name="delete" size={22} color="#f44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))
      ) : (
        <Text style={styles.emptyText}>No personal contacts added yet</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    color: '#333'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 10,
    color: '#2c3e50'
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15
  },
  primaryButton: {
    backgroundColor: '#3498db'
  },
  pushButton: {
    backgroundColor: '#9b59b6',
    marginTop: 10
  },
  verifyButton: {
    backgroundColor: '#2ecc71'
  },
  cancelButton: {
    backgroundColor: '#e74c3c'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  contactItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee'
  },
  addedContact: {
    backgroundColor: '#e8f5e9'
  },
  verifiedContact: {
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50'
  },
  contactNumber: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 3
  },
  verifiedText: {
    fontSize: 12,
    color: '#2ecc71',
    marginTop: 5
  },
  addRemoveText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: 'bold'
  },
  contactActions: {
    flexDirection: 'row',
    gap: 15
  },
  emptyText: {
    textAlign: 'center',
    color: '#95a5a6',
    marginVertical: 20,
    fontSize: 16
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center'
  },
  disabled: {
    opacity: 0.6
  }
});

export default SettingsScreen;
