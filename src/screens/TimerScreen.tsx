import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTimerStore } from '../store/timerStore';
import { useSubjectStore } from '../store/subjectStore';
import { useNoteStore } from '../store/noteStore';
import { formatTimerDisplay, generateId, SUBJECT_COLORS } from '../utils';
import { Subject } from '../types';

export default function TimerScreen() {
  const navigation = useNavigation<any>();
  const {
    status, subjectId, elapsed, note,
    start, pause, resume, stop, setNote, reset,
  } = useTimerStore();
  const subjects = useSubjectStore((s) => s.subjects);
  const loadSubjects = useSubjectStore((s) => s.load);
  const addSubject = useSubjectStore((s) => s.add);
  const addNote = useNoteStore((s) => s.add);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjectId);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
      if (subjectId) setSelectedSubjectId(subjectId);
    }, [subjectId])
  );

  const handleStart = () => {
    if (!selectedSubjectId) {
      Alert.alert('Select a subject', 'Pick a subject before starting.');
      return;
    }
    start(selectedSubjectId);
  };

  const handleStop = async () => {
    Alert.alert('End Session?', 'Save this study session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard', style: 'destructive', onPress: () => reset(),
      },
      {
        text: 'Save', onPress: async () => {
          const session = await stop();
          if (session && session.note.trim()) {
            await addNote(
              'Session Note',
              session.note,
              session.id,
            );
          }
        },
      },
    ]);
  };

  const handleCreateSubject = async () => {
    const name = newSubjectName.trim();
    if (!name) {
      Alert.alert('Enter a name');
      return;
    }
    await addSubject(name, newSubjectColor);
    setNewSubjectName('');
    setShowNewSubject(false);
    // auto-select newly created
    await loadSubjects();
  };

  const currentSubject = subjects.find((s) => s.id === (status !== 'idle' ? subjectId : selectedSubjectId));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Timer display */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTimerDisplay(elapsed)}</Text>
        {currentSubject && (
          <View style={styles.activeSubject}>
            <View style={[styles.dot, { backgroundColor: currentSubject.color }]} />
            <Text style={styles.activeSubjectText}>{currentSubject.name}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {status === 'idle' && (
          <TouchableOpacity style={styles.controlBtn} onPress={handleStart}>
            <Text style={styles.controlBtnText}>▶ Start</Text>
          </TouchableOpacity>
        )}
        {status === 'running' && (
          <>
            <TouchableOpacity style={[styles.controlBtn, styles.pauseBtn]} onPress={pause}>
              <Text style={styles.controlBtnText}>⏸ Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={handleStop}>
              <Text style={styles.controlBtnText}>⏹ Stop</Text>
            </TouchableOpacity>
          </>
        )}
        {status === 'paused' && (
          <>
            <TouchableOpacity style={styles.controlBtn} onPress={resume}>
              <Text style={styles.controlBtnText}>▶ Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={handleStop}>
              <Text style={styles.controlBtnText}>⏹ Stop</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Note input (while running or paused) */}
      {status !== 'idle' && (
        <View style={styles.noteSection}>
          <Text style={styles.label}>Session Note</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="What are you studying?"
            placeholderTextColor="#484F58"
            multiline
          />
        </View>
      )}

      {/* Subject picker (only when idle) */}
      {status === 'idle' && (
        <View style={styles.subjectSection}>
          <Text style={styles.label}>Select Subject</Text>
          <View style={styles.subjectGrid}>
            {subjects.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.subjectCard,
                  { borderColor: s.color },
                  selectedSubjectId === s.id && { backgroundColor: s.color },
                ]}
                onPress={() => setSelectedSubjectId(s.id)}
              >
                <Text style={[
                  styles.subjectCardText,
                  selectedSubjectId === s.id && { color: '#fff' },
                ]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!showNewSubject ? (
            <TouchableOpacity onPress={() => setShowNewSubject(true)} style={styles.newSubjectBtn}>
              <Text style={styles.newSubjectBtnText}>+ New Subject</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.newSubjectForm}>
              <TextInput
                style={styles.input}
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                placeholder="Subject name"
                placeholderTextColor="#484F58"
                autoFocus
              />
              <ScrollView horizontal style={styles.colorPicker}>
                {SUBJECT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      newSubjectColor === c && styles.colorSelected,
                    ]}
                    onPress={() => setNewSubjectColor(c)}
                  />
                ))}
              </ScrollView>
              <View style={styles.newSubjectActions}>
                <TouchableOpacity onPress={() => setShowNewSubject(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createBtn} onPress={handleCreateSubject}>
                  <Text style={styles.createBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 20, paddingBottom: 40 },
  timerContainer: { alignItems: 'center', marginTop: 30, marginBottom: 30 },
  timerText: { color: '#F0F6FC', fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'] },
  activeSubject: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  activeSubjectText: { color: '#8B949E', fontSize: 16 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 30 },
  controlBtn: {
    backgroundColor: '#238636', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32,
    minWidth: 130, alignItems: 'center',
  },
  pauseBtn: { backgroundColor: '#D29922' },
  stopBtn: { backgroundColor: '#DA3633' },
  controlBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  noteSection: { marginBottom: 24 },
  label: { color: '#8B949E', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  noteInput: {
    backgroundColor: '#161B22', borderRadius: 12, padding: 16, color: '#F0F6FC', fontSize: 15,
    minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#21262D',
  },
  subjectSection: { marginTop: 8 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectCard: {
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 4,
  },
  subjectCardText: { color: '#C9D1D9', fontSize: 15 },
  newSubjectBtn: { marginTop: 16 },
  newSubjectBtnText: { color: '#58A6FF', fontSize: 15, fontWeight: '600' },
  newSubjectForm: { marginTop: 16, backgroundColor: '#161B22', borderRadius: 12, padding: 16 },
  input: {
    backgroundColor: '#0D1117', borderRadius: 10, padding: 14, color: '#F0F6FC', fontSize: 16,
    borderWidth: 1, borderColor: '#21262D', marginBottom: 12,
  },
  colorPicker: { flexDirection: 'row', marginBottom: 12 },
  colorCircle: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  colorSelected: { borderWidth: 3, borderColor: '#F0F6FC' },
  newSubjectActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  cancelText: { color: '#8B949E', fontSize: 15 },
  createBtn: { backgroundColor: '#238636', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});