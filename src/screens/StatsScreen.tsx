import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DB from '../database/db';
import {
  todayDate, getWeekDates, getDayLabel, formatMinutes, formatDateDisplay,
} from '../utils';
import { DailyStats, SubjectStats } from '../types';

export default function StatsScreen() {
  const [todayTotal, setTodayTotal] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const today = todayDate();
        const dailyTotal = await DB.getDailyTotalMinutes(today);
        setTodayTotal(dailyTotal);

        const dates = getWeekDates();
        const weekly = await DB.getWeeklyStats(dates);
        setWeeklyData(weekly);
        setWeekTotal(weekly.reduce((sum, d) => sum + d.totalMinutes, 0));

        const stats = await DB.getSubjectStats(dates[0], dates[6]);
        setSubjectStats(stats);
      };
      load();
    }, [])
  );

  const maxMinutes = Math.max(...weeklyData.map((d) => d.totalMinutes), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Statistics</Text>

      {/* Today summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today</Text>
        <Text style={styles.cardValue}>{formatMinutes(todayTotal)}</Text>
      </View>

      {/* Weekly chart */}
      <View style={styles.card}>
        <View style={styles.weekHeader}>
          <Text style={styles.cardLabel}>This Week</Text>
          <Text style={styles.weekTotal}>{formatMinutes(weekTotal)}</Text>
        </View>
        <View style={styles.chart}>
          {weeklyData.map((d) => {
            const height = maxMinutes > 0 ? (d.totalMinutes / maxMinutes) * 120 : 0;
            const isToday = d.date === todayDate();
            return (
              <View key={d.date} style={styles.barCol}>
                <Text style={styles.barValue}>
                  {d.totalMinutes > 0 ? d.totalMinutes : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, d.totalMinutes > 0 ? 4 : 0),
                        backgroundColor: isToday ? '#58A6FF' : '#30363D',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                  {getDayLabel(d.date)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Subject breakdown */}
      <Text style={styles.sectionTitle}>By Subject (This Week)</Text>
      {subjectStats.filter((s) => s.totalMinutes > 0).length === 0 ? (
        <Text style={styles.emptyText}>No study sessions this week yet.</Text>
      ) : (
        subjectStats
          .filter((s) => s.totalMinutes > 0)
          .map((s) => {
            const totalFiltered = subjectStats.reduce((sum, x) => sum + x.totalMinutes, 0);
            const pct = totalFiltered > 0 ? s.totalMinutes / totalFiltered : 0;
            return (
              <View key={s.subjectId} style={styles.subjectRow}>
                <View style={styles.subjectInfo}>
                  <View style={[styles.dot, { backgroundColor: s.subjectColor }]} />
                  <Text style={styles.subjectName}>{s.subjectName}</Text>
                </View>
                <View style={styles.subjectBarBg}>
                  <View
                    style={[styles.subjectBarFill, { width: `${pct * 100}%`, backgroundColor: s.subjectColor }]}
                  />
                </View>
                <View style={styles.subjectMeta}>
                  <Text style={styles.subjectTime}>{formatMinutes(s.totalMinutes)}</Text>
                  <Text style={styles.subjectSessions}>{s.sessionCount} sessions</Text>
                </View>
              </View>
            );
          })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { color: '#F0F6FC', fontSize: 24, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#161B22', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardLabel: { color: '#8B949E', fontSize: 14, marginBottom: 4 },
  cardValue: { color: '#F0F6FC', fontSize: 32, fontWeight: '700' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  weekTotal: { color: '#58A6FF', fontSize: 16, fontWeight: '600' },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { color: '#8B949E', fontSize: 11, marginBottom: 4, height: 16 },
  barTrack: { height: 120, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 4 },
  barLabel: { color: '#484F58', fontSize: 12, marginTop: 6 },
  barLabelToday: { color: '#58A6FF', fontWeight: '600' },
  sectionTitle: { color: '#F0F6FC', fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 16 },
  emptyText: { color: '#484F58', fontSize: 14, textAlign: 'center', marginTop: 20 },
  subjectRow: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 10 },
  subjectInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  subjectName: { color: '#F0F6FC', fontSize: 15, fontWeight: '500' },
  subjectBarBg: { height: 6, backgroundColor: '#21262D', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  subjectBarFill: { height: 6, borderRadius: 3 },
  subjectMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  subjectTime: { color: '#C9D1D9', fontSize: 14, fontWeight: '600' },
  subjectSessions: { color: '#484F58', fontSize: 13 },
});