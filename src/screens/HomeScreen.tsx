import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSubjectStore } from '../store/subjectStore';
import { usePlanStore } from '../store/planStore';
import { useTimerStore } from '../store/timerStore';
import { getDailyTotalMinutes } from '../database/db';
import { formatDateDisplay, formatMinutes, todayDate } from '../utils';
import { DailyPlanWithProgress, Subject } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const subjects = useSubjectStore((s) => s.subjects);
  const loadSubjects = useSubjectStore((s) => s.load);
  const plans = usePlanStore((s) => s.plans);
  const loadPlans = usePlanStore((s) => s.load);
  const addPlan = usePlanStore((s) => s.add);
  const removePlan = usePlanStore((s) => s.remove);
  const timerStatus = useTimerStore((s) => s.status);

  const [totalMinutes, setTotalMinutes] = useState(0);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState('60');

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
      loadPlans(todayDate());
      getDailyTotalMinutes(todayDate()).then(setTotalMinutes);
    }, [])
  );

  const handleAddPlan = async () => {
    if (!selectedSubjectId) {
      Alert.alert('Select a subject');
      return;
    }
    const minutes = parseInt(targetInput, 10);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert('Enter a valid target');
      return;
    }
    await addPlan(selectedSubjectId, minutes);
    setShowAddPlan(false);
    setSelectedSubjectId(null);
    setTargetInput('60');
  };

  const handleStartStudy = () => {
    if (timerStatus !== 'idle') {
      navigation.navigate('Timer');
      return;
    }
    navigation.navigate('Timer');
  };

  const renderPlan = ({ item }: { item: DailyPlanWithProgress }) => {
    const pct = item.targetMinutes > 0 ? Math.min(item.actualMinutes / item.targetMinutes, 1) : 0;
    const done = item.actualMinutes >= item.targetMinutes;
    return (
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={[styles.colorDot, { backgroundColor: item.subjectColor }]} />
          <Text style={styles.planSubject}>{item.subjectName}</Text>
          <TouchableOpacity onPress={() => removePlan(item.id)}>
            <Text style={styles.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${pct * 100}%`, backgroundColor: done ? '#2ECC71' : item.subjectColor }]} />
        </View>
        <Text style={styles.planProgress}>
          {formatMinutes(item.actualMinutes)} / {formatMinutes(item.targetMinutes)}
          {done ? ' ✓' : ''}
        </Text>
      </View>
    );
  };

  const unusedSubjects = subjects.filter(
    (s) => !plans.find((p) => p.subjectId === s.id)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{formatDateDisplay(todayDate())}</Text>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Today's Study Time</Text>
        <Text style={styles.totalValue}>{formatMinutes(totalMinutes)}</Text>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStartStudy}>
        <Text style={styles.startBtnText}>
          {timerStatus !== 'idle' ? '⏱ Continue Studying' : '▶ Start Studying'}
        </Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Plan</Text>
        <TouchableOpacity onPress={() => {
          if (subjects.length === 0) {
            Alert.alert('No subjects', 'Create a subject first in Settings or the Timer screen.');
            return;
          }
          setShowAddPlan(true);
        }}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {plans.length === 0 ? (
        <Text style={styles.emptyText}>No plans for today. Tap + Add to set goals.</Text>
      ) : (
        plans.map((p) => <View key={p.id}>{renderPlan({ item: p })}</View>)
      )}

      <Modal visible={showAddPlan} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Plan</Text>
            <Text style={styles.modalLabel}>Subject</Text>
            {unusedSubjects.length === 0 ? (
              <Text style={styles.emptyText}>All subjects already have plans for today.</Text>
            ) : (
              <ScrollView horizontal style={styles.subjectPicker}>
                {unusedSubjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.subjectChip,
                      { borderColor: s.color },
                      selectedSubjectId === s.id && { backgroundColor: s.color },
                    ]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      selectedSubjectId === s.id && { color: '#fff' },
                    ]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Text style={styles.modalLabel}>Target (minutes)</Text>
            <TextInput
              style={styles.input}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor="#666"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddPlan(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAddPlan}>
                <Text style={styles.modalConfirmText}>Add</Text>
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
  content: { padding: 20, paddingBottom: 40 },
  date: { color: '#8B949E', fontSize: 15, marginBottom: 12 },
  totalCard: {
    backgroundColor: '#161B22', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20,
  },
  totalLabel: { color: '#8B949E', fontSize: 14, marginBottom: 4 },
  totalValue: { color: '#F0F6FC', fontSize: 36, fontWeight: '700' },
  startBtn: {
    backgroundColor: '#238636', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 28,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#F0F6FC', fontSize: 18, fontWeight: '600' },
  addBtn: { color: '#58A6FF', fontSize: 15, fontWeight: '600' },
  emptyText: { color: '#484F58', fontSize: 14, textAlign: 'center', marginTop: 20 },
  planCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 10 },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  planSubject: { color: '#F0F6FC', fontSize: 15, fontWeight: '500', flex: 1 },
  removeBtn: { color: '#484F58', fontSize: 16, padding: 4 },
  progressBarBg: { height: 6, backgroundColor: '#21262D', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: 6, borderRadius: 3 },
  planProgress: { color: '#8B949E', fontSize: 13 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: { backgroundColor: '#161B22', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { color: '#F0F6FC', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  modalLabel: { color: '#8B949E', fontSize: 13, marginBottom: 8, marginTop: 12 },
  subjectPicker: { flexDirection: 'row', marginBottom: 4 },
  subjectChip: {
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  subjectChipText: { color: '#C9D1D9', fontSize: 14 },
  input: {
    backgroundColor: '#0D1117', borderRadius: 10, padding: 14, color: '#F0F6FC', fontSize: 16,
    borderWidth: 1, borderColor: '#21262D',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 20 },
  modalCancelText: { color: '#8B949E', fontSize: 15 },
  modalConfirm: { backgroundColor: '#238636', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});