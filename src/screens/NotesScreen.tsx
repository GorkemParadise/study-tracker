import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNoteStore } from '../store/noteStore';
import { Note } from '../types';

export default function NotesScreen() {
  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.load);
  const addNote = useNoteStore((s) => s.add);
  const updateNote = useNoteStore((s) => s.update);
  const removeNote = useNoteStore((s) => s.remove);

  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const openNew = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setShowEditor(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Empty note', 'Write something before saving.');
      return;
    }
    if (editingNote) {
      await updateNote({ ...editingNote, title: title.trim(), content: content.trim() });
    } else {
      await addNote(title.trim(), content.trim());
    }
    setShowEditor(false);
  };

  const handleDelete = (note: Note) => {
    Alert.alert('Delete Note', `Delete "${note.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNote(note.id) },
    ]);
  };

  const formatNoteDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        {item.sessionId && <Text style={styles.sessionBadge}>📖 Session</Text>}
      </View>
      <Text style={styles.noteContent} numberOfLines={2}>{item.content || '(empty)'}</Text>
      <Text style={styles.noteDate}>{formatNoteDate(item.updatedAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Notes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notes yet.</Text>
          <Text style={styles.emptySubtext}>Tap + New to create one, or add notes during study sessions.</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          renderItem={renderNote}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={showEditor} animationType="slide">
        <View style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <Text style={styles.editorCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.editorSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor="#484F58"
          />
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Write your note..."
            placeholderTextColor="#484F58"
            multiline
            textAlignVertical="top"
            autoFocus={!editingNote}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  heading: { color: '#F0F6FC', fontSize: 24, fontWeight: '700' },
  addBtn: { backgroundColor: '#238636', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { padding: 20, paddingTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#484F58', fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: '#30363D', fontSize: 14, textAlign: 'center' },
  noteCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 10 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noteTitle: { color: '#F0F6FC', fontSize: 16, fontWeight: '600', flex: 1 },
  sessionBadge: { fontSize: 12, color: '#8B949E', marginLeft: 8 },
  noteContent: { color: '#8B949E', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  noteDate: { color: '#30363D', fontSize: 12 },
  editorContainer: { flex: 1, backgroundColor: '#0D1117' },
  editorHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#21262D',
  },
  editorCancel: { color: '#8B949E', fontSize: 16 },
  editorTitle: { color: '#F0F6FC', fontSize: 17, fontWeight: '600' },
  editorSave: { color: '#58A6FF', fontSize: 16, fontWeight: '600' },
  titleInput: {
    padding: 20, paddingBottom: 8, color: '#F0F6FC', fontSize: 22, fontWeight: '600',
  },
  contentInput: {
    flex: 1, padding: 20, paddingTop: 0, color: '#C9D1D9', fontSize: 16, lineHeight: 24,
  },
});