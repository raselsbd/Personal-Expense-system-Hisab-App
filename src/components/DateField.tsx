import React, { useState } from 'react';
import { Platform } from 'react-native';
import { Button } from 'react-native-paper';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { formatDisplayDate } from '../utils/dateUtils';

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DateField({ label, value, onChange, maximumDate, minimumDate }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(selected);
        },
      });
    } else {
      setShowPicker(true);
    }
  };

  return (
    <>
      <Button mode="outlined" icon="calendar" onPress={open} style={{ borderRadius: 12 }}>
        {`${label}: ${formatDisplayDate(value.toISOString())}`}
      </Button>
      {Platform.OS === 'ios' && showPicker ? (
        <>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(event, selected) => {
              if (event.type === 'set' && selected) onChange(selected);
            }}
          />
          <Button mode="text" onPress={() => setShowPicker(false)}>
            Done
          </Button>
        </>
      ) : null}
    </>
  );
}
