import { supabase } from "../supabaseClient";
import type { Note } from "../type/Note";

/**
 * Fetch notes owned by or shared with the current user
 */
export async function fetchNotes(userId: string, userEmail: string) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .or(`owner_id.eq.${userId},shared_with_ids.cs.{${userId}}`) // fetch notes owned by OR shared with user
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Note[];
}

/**
 * Create a new note for the given user
 */
export async function createNote(
  title: string,
  content: string,
  userId: string,
  userEmail: string
) {
  const { error } = await supabase.from("notes").insert([
    {
      title,
      content,
      owner_id: userId,
      owner_email: userEmail,
      shared_with_ids: [], // changed from shared_with
    },
  ]);

  if (error) throw new Error(error.message);
}

/**
 * Delete a note by ID
 */
export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Share a note by adding a new user ID to the shared_with_ids array
 */
export async function shareNote(id: string, email: string) {
  // 1️⃣ Look up the user by email in the profiles table
  const { data: userData, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !userData) {
    throw new Error("User not found.");
  }

  const targetUserId = userData.id;

  // 2️⃣ Fetch the note
  const { data: noteData, error: fetchError } = await supabase
    .from("notes")
    .select("shared_with_ids, title, owner_email")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const currentSharedWithIds = noteData.shared_with_ids || [];

  // 3️⃣ Prevent duplicates
  if (currentSharedWithIds.includes(targetUserId)) {
    throw new Error("This note is already shared with that user.");
  }

  // 4️⃣ Add the user’s ID to the shared_with_ids array
  const updatedSharedWithIds = [...currentSharedWithIds, targetUserId];

  const { error: updateError } = await supabase
    .from("notes")
    .update({ shared_with_ids: updatedSharedWithIds })
    .eq("id", id);

  if (updateError) throw new Error(updateError.message);

  console.log(`Note shared successfully with ${email}`);
}


