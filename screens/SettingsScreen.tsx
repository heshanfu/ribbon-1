import React, { useState } from 'react';
import { useAuth } from '../components/providers/AuthProvider';
import { View } from 'react-native';
import {
  Button,
  Caption
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import Wrapper from '../components/Layout/Wrapper';
import Title from '../components/Title';
import Section from '../components/Settings/Section';
import ReminderBtn from '../components/Settings/ReminderBtn';
import SectionData from '../components/Settings/SectionData';

function SettingsScreen () {
  const { isLoggedIn, username, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthLoading, SetIsAuthLoading] = useState(false);
  const [reminder, setReminder] = useState(new Date());

  async function _handleRedditClick() {
    // Loading and disable button
    SetIsAuthLoading(true);

    if (isLoggedIn) {
      await logout();
      // Clear loading and disable state
      SetIsAuthLoading(false);
      return
    }

    await login();
    // Clear loading and disable state
    SetIsAuthLoading(false);
  }

  function updateReminder(event, date: Date) {
    // Close the datePicker
    setIsOpen(false);
    if (event.type === 'dismissed') return;
    if (!date) return;
    // Save the reminder
    setReminder(date);
  }

  return (
    <Wrapper>
      <Title>Settings</Title>

      <Section title="Services">
        <Button
          onPress={_handleRedditClick}
          loading={isAuthLoading}
          disabled={isAuthLoading}
          mode="outlined"
          color="#FF5700"
          icon="reddit"
          style={{ marginVertical: 1 }}
        >
          {isLoggedIn ? 'Revoke access' : 'Login with Reddit'}
        </Button>

        { isLoggedIn &&
          <Caption>
            Currently logged in as {username}
          </Caption>
        }
      </Section>

      <Section title="Reminders">

        <View style={{ flexDirection: 'row' }}>
          <ReminderBtn
            onPress={setIsOpen}
            reminder={reminder}
          />
        </View>

        {isOpen && (
          <DateTimePicker
            value={reminder}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={updateReminder}
          />
        )}

      </Section>

      <SectionData />
      
    </Wrapper>
  )
}

export default SettingsScreen;
