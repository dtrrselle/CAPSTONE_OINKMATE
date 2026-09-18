import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ForgotPassword() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <TouchableOpacity
          onPress={() => router.push('/authentication/signin')}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#F59BB1"
          />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            LOGO
          </Text>
        </View>

        <Text style={styles.title}>
          Reset Password
        </Text>

        <Text style={styles.subtitle}>
          Enter your email address to receive a password reset link.
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#2F5D50"
          />

          <TextInput
            placeholder="Email"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            Send Reset Link
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F8',
  },

  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },

  logoContainer: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#F59BB1',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 25,
  },

  logoText: {
    color: '#F59BB1',
    fontWeight: '600',
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2F5D50',
    marginBottom: 10,
  },

  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 60,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    marginLeft: 10,
  },

  button: {
    backgroundColor: '#2F5D50',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});