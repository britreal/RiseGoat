import { supabase } from '@/lib/supabase';

export async function uploadUserImage(userId: string, file: File, folder = 'images') {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('risegoat-media').upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw error;
  return supabase.storage.from('risegoat-media').getPublicUrl(path).data.publicUrl;
}
