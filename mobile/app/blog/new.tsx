import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { createBlog } from "@/api/posts";
import { uploadImage } from "@/api/upload";
import { ApiClientError } from "@/api/client";
import { colors, radius, spacing, text } from "@/theme";

export default function NewBlogScreen() {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [readTime, setReadTime] = useState("3");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (r.canceled || r.assets.length === 0) return;
    setUploadBusy(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        r.assets[0].uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const url = await uploadImage(compressed.uri, "blog-cover");
      setCoverImage(url);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploadBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      setError("Title, excerpt and content are required.");
      return;
    }
    setBusy(true);
    try {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await createBlog({
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        coverImage: coverImage ?? undefined,
        tags,
        isVlog: Boolean(videoUrl.trim()),
        videoUrl: videoUrl.trim() || undefined,
        readTime: Number(readTime) || 3,
      });
      Alert.alert(
        "Submitted",
        res.blog.approvalStatus === "approved"
          ? "Your post is live."
          : "Your post is pending moderation — it'll be visible once approved.",
        [{ text: "OK", onPress: () => router.replace("/blogs") }],
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create blog.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "New blog" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={pickCover} style={styles.coverBox}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImg} />
            ) : (
              <View style={styles.coverPh}>
                {uploadBusy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary }}>Tap to set cover image</Text>
                )}
              </View>
            )}
          </Pressable>

          <TextField label="Title" value={title} onChangeText={setTitle} />
          <TextField
            label="Excerpt (one-line summary)"
            value={excerpt}
            onChangeText={setExcerpt}
            multiline
          />
          <Text style={[text.bodySecondary, { fontSize: 13, marginTop: spacing.sm }]}>
            Content (markdown OK)
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholderTextColor={colors.textMuted}
            style={styles.bodyInput}
            placeholder="Write your post…"
          />

          <TextField
            label="Tags (comma separated)"
            value={tagsStr}
            onChangeText={setTagsStr}
            placeholder="himalayas, expedition"
          />
          <TextField
            label="Vlog URL (optional)"
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://youtube.com/…"
            autoCapitalize="none"
          />
          <TextField
            label="Read time (minutes)"
            value={readTime}
            onChangeText={setReadTime}
            keyboardType="number-pad"
          />

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button
            label={busy ? "Submitting…" : "Submit"}
            onPress={submit}
            loading={busy}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  coverBox: {
    height: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
    backgroundColor: colors.bgElevated,
  },
  coverImg: { width: "100%", height: "100%" },
  coverPh: { flex: 1, alignItems: "center", justifyContent: "center" },
  bodyInput: {
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 220,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
});
