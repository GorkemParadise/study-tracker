import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Share, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSubjectStore } from '../store/subjectStore';
import { exportAllData, resetAllData } from '../database/db';
import { SUBJECT_COLORS } from '../utils';
import { Subject } from '../types';

export default function SettingsScreen() {
  const subjects = useSubjectStore((s) => s.subjects);
  const loadSubjects = useSubjectStore((s) => s.load);
  const updateSubject = useSubjectStore((s) => s.update);
  const removeSubject = useSubjectStore((s) => s.remove);

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [])
  );

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      await Share.share({ message: json, title: 'Study Tracker Export' });
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete ALL subjects, sessions, plans, and notes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await loadSubjects();
            Alert.alert('Done', 'All data has been reset.');
          },
        },
      ]
    );
  };

  const handleDeleteSubject = async (subject: Subject) => {
    Alert.alert('Delete "' + subject.name + '"?', 'Subjects with existing sessions cannot be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await removeSubject(subject.id);
          if (!success) {
            Alert.alert(
              'Cannot delete',
              '"' + subject.name + '" has study sessions. Delete the sessions first or reset all data.'
            );
          }
        },
      },
    ]);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditColor(subject.color);
  };

  const handleSaveEdit = async () => {
    if (!editingSubject) return;
    if (!editName.trim()) {
      Alert.alert('Enter a name');
      return;
    }
    await updateSubject({ ...editingSubject, name: editName.trim(), color: editColor });
    setEditingSubject(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <Text style={styles.sectionTitle}>Subjects</Text>
      {subjects.length === 0 ? (
        <Text style={styles.emptyText}>No subjects. Create them from the Timer screen.</Text>
      ) : (
        subjects.map((s) => (
          <View key={s.id} style={styles.subjectRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.subjectName}>{s.name}</Text>
            <TouchableOpacity onPress={() => handleEditSubject(s)} style={styles.iconBtn}>
              <Text style={styles.iconText}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteSubject(s)} style={styles.iconBtn}>
              <Text style={[styles.iconText, { color: '#DA3633' }]}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Data</Text>

      <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
        <Text style={styles.actionBtnText}>Export All Data as JSON</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleReset}>
        <Text style={[styles.actionBtnText, styles.dangerText]}>Reset All Data</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Data is stored locally on this device only.{'\n'}No data leaves your phone.
      </Text>

      <Modal visible={!!editingSubject} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Subject</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Subject name"
              placeholderTextColor="#484F58"
            />
            <Text style={styles.label}>Color</Text>
            <ScrollView horizontal style={styles.colorPicker}>
              {SUBJECT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    editColor === c && styles.colorSelected,
                  ]}
                  onPress={() => setEditColor(c)}
                />
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditingSubject(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 20, paddingBottom: 60 },
  heading: { color: '#F0F6FC', fontSize: 24, fontWeight: '700', marginBottom: 24 },
  sectionTitle: {
    color: '#8B949E', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  emptyText: { color: '#484F58', fontSize: 14, marginBottom: 16 },
  subjectRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22',
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  subjectName: { color: '#F0F6FC', fontSize: 15, flex: 1 },
  iconBtn: { padding: 8 },
  iconText: { color: '#8B949E', fontSize: 18 },
  actionBtn: {
    backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#21262D',
  },
  actionBtnText: { color: '#C9D1D9', fontSize: 15 },
  dangerBtn: { borderColor: 'rgba(218,54,51,0.2)' },
  dangerText: { color: '#DA3633' },
  footerText: { color: '#30363D', fontSize: 13, textAlign: 'center', marginTop: 32, lineHeight: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: { backgroundColor: '#161B22', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { color: '#F0F6FC', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  input: {
    backgroundColor: '#0D1117', borderRadius: 10, padding: 14, color: '#F0F6FC', fontSize: 16,
    borderWidth: 1, borderColor: '#21262D', marginBottom: 16,
  },
  label: { color: '#8B949E', fontSize: 13, marginBottom: 8 },
  colorPicker: { flexDirection: 'row', marginBottom: 20 },
  colorCircle: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  colorSelected: { borderWidth: 3, borderColor: '#F0F6FC' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  cancelText: { color: '#8B949E', fontSize: 15 },
  saveBtn: { backgroundColor: '#238636', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});