'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for Admin actions
const supabase = createClient(supabaseUrl, supabaseKey);

export async function approveSong(id) {
  try {
    const { error } = await supabase
      .from('songs')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Approve Error:', err);
    return { success: false, error: err.message };
  }
}

export async function rejectSong(id) {
  try {
    // Soft delete for rejection
    const { error } = await supabase
      .from('songs')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Reject Error:', err);
    return { success: false, error: err.message };
  }
}

export async function permanentDeleteSong(id) {
  try {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Delete Error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateSongOrder(orderIds) {
  try {
    const updates = orderIds.map((id, index) => ({
      id,
      order: index
    }));

    for (let i = 0; i < updates.length; i++) {
      const { error } = await supabase
        .from('songs')
        .update({ order: updates[i].order })
        .eq('id', updates[i].id);
      if (error) throw error;
    }

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Order Update Error:', err);
    return { success: false, error: err.message };
  }
}

export async function addVideo(title, url) {
  try {
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    if (match && match[1]) videoId = match[1];

    if (!videoId) {
      videoId = url.split('/').pop().split('?')[0];
    }
    
    const { error } = await supabase
      .from('videos')
      .insert([{ id: Date.now().toString(), title, video_id: videoId, added_at: new Date().toISOString() }]);

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Add Video Error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteVideo(id) {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { success: true };
}

export async function updateSongTitle(id, title, adminIdentifier) {
  try {
    const { error } = await supabase
      .from('songs')
      .update({ 
        title, 
        last_edited_by: adminIdentifier || 'Unknown Admin',
        last_edited_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Update Title Error:', err);
    return { success: false, error: err.message };
  }
}
export async function toggleUserRole(userId, currentRole) {
  try {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    const { error } = await supabase
      .from('users')
      .update({ role: nextRole })
      .eq('id', userId);

    if (error) {
      console.error('Database Error:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Server Action Error:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteUser(userId) {
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Delete User Error:', err);
    return { success: false, error: err.message };
  }
}
