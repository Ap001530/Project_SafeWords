import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const CalculatorScreen = ({ navigation }) => {
  const [input, setInput] = useState('');
  const [accessCode, setAccessCode] = useState('1234');

  useEffect(() => {
    const loadAccessCode = async () => {
      try {
        const savedAccessCode = await AsyncStorage.getItem('accessCode');
        if (savedAccessCode) setAccessCode(savedAccessCode);
      } catch (error) {
        console.error('Failed to load access code:', error);
      }
    };
    loadAccessCode();
  }, []);

  const handlePress = (value) => setInput(input + value);

  const handleOperation = (operation) => {
    if (input === '') return;
    const lastChar = input[input.length - 1];
    if (['+', '-', '*', '/'].includes(lastChar)) {
      setInput(input.slice(0, -1) + operation);
    } else {
      setInput(input + operation);
    }
  };

  const handleDecimal = () => {
    const lastNumber = input.split(/[\+\-\*\/]/).pop();
    if (!lastNumber.includes('.')) setInput(input + '.');
  };

  const handleClear = () => setInput('');

  const handleEnter = async () => {
    try {
      const savedAccessCode = await AsyncStorage.getItem('accessCode') || '1234';
      
      if (input === savedAccessCode) {
        navigation.navigate('EmergencyApp');
      } else {
        try {
          const result = eval(input);
          setInput(result.toString());
        } catch (error) {
          Alert.alert('Error', 'Invalid calculation');
          setInput('');
        }
      }
    } catch (error) {
      console.error('Failed to check access code:', error);
    }
  };

  const CalcButton = ({ value, onPress, style, textStyle }) => (
    <TouchableOpacity 
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonText, textStyle]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.displayContainer}>
        <Text style={styles.displayText} numberOfLines={1} ellipsizeMode="head">
          {input || '0'}
        </Text>
      </View>

      <View style={styles.buttonGrid}>
        <View style={styles.row}>
          <CalcButton value="C" onPress={handleClear} style={styles.functionButton} />
          <CalcButton value="+/-" onPress={() => {}} style={styles.functionButton} />
          <CalcButton value="%" onPress={() => {}} style={styles.functionButton} />
          <CalcButton value="÷" onPress={() => handleOperation('/')} style={styles.operationButton} />
        </View>

        <View style={styles.row}>
          <CalcButton value="7" onPress={() => handlePress('7')} />
          <CalcButton value="8" onPress={() => handlePress('8')} />
          <CalcButton value="9" onPress={() => handlePress('9')} />
          <CalcButton value="×" onPress={() => handleOperation('*')} style={styles.operationButton} />
        </View>

        <View style={styles.row}>
          <CalcButton value="4" onPress={() => handlePress('4')} />
          <CalcButton value="5" onPress={() => handlePress('5')} />
          <CalcButton value="6" onPress={() => handlePress('6')} />
          <CalcButton value="-" onPress={() => handleOperation('-')} style={styles.operationButton} />
        </View>

        <View style={styles.row}>
          <CalcButton value="1" onPress={() => handlePress('1')} />
          <CalcButton value="2" onPress={() => handlePress('2')} />
          <CalcButton value="3" onPress={() => handlePress('3')} />
          <CalcButton value="+" onPress={() => handleOperation('+')} style={styles.operationButton} />
        </View>

        <View style={styles.row}>
          <CalcButton value="0" onPress={() => handlePress('0')} style={styles.zeroButton} />
          <CalcButton value="." onPress={handleDecimal} />
          <CalcButton value="=" onPress={handleEnter} style={styles.operationButton} />
        </View>
      </View>
    </View>
  );
};

const buttonSize = width / 4.5;
const zeroButtonWidth = buttonSize * 2 + 10;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  displayContainer: {
    padding: 20,
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  displayText: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '300',
  },
  buttonGrid: {
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    width: buttonSize,
    height: buttonSize,
    borderRadius: buttonSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  zeroButton: {
    width: zeroButtonWidth,
    alignItems: 'flex-start',
    paddingLeft: buttonSize / 2,
  },
  operationButton: {
    backgroundColor: '#FF9F0A',
  },
  functionButton: {
    backgroundColor: '#A5A5A5',
  },
});

export default CalculatorScreen;
