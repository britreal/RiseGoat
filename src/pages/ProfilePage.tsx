import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadUserImage } from '@/lib/storage';
import { PageHeader, Card, Spinner } from '@/components/ui';
import { Save, Loader2, Check, Upload } from 'lucide-react';


const THEME_PRESETS = [
  { name: 'Slate', bg: '#0f172a', accent: '#06b6d4' },
  { name: 'Midnight', bg: '#09090b', accent: '#3b82f6' },
  { name: 'Forest', bg: '#14532d', accent: '#22c55e' },
  { name: 'Ocean', bg: '#0e7490', accent: '#67e8f9' },
  { name: 'Sunset', bg: '#7c2d12', accent: '#fb923c' },
  { name: 'Rose', bg: '#9f1239', accent: '#fb7185' },
  { name: 'Royal', bg: '#1e1b4b', accent: '#818cf8' },
  { name: 'Charcoal', bg: '#1c1917', accent: '#f59e0b' },
  { name: 'Plum', bg: '#581c87', accent: '#c084fc' },
  { name: 'Carbon', bg: '#171717', accent: '#e5e5e5' },
];

const FONTS = [
  { name: 'Inter', value: 'inter', css: 'font-sans' },
  { name: 'Serif', value: 'serif', css: 'font-serif' },
  { name: 'Mono', value: 'mono', css: 'font-mono' },
];

const LINK_STYLES = [
  { name: 'Arredondado', value: 'rounded' },
  { name: 'Quadrado', value: 'square' },
  { name: 'Pílula', value: 'pill' },
];

const ACCENT_COLORS = [
  '#06b6d4', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#e5e5e5',
];

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [themeFont, setThemeFont] = useState('inter');
  const [linkStyle, setLinkStyle] = useState('rounded');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoImageUrl, setSeoImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [businessType, setBusinessType] = useState('criador');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [seoImageFile, setSeoImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      if (!user) return;
      // Auth can finish before a profile row exists. Do not leave this page
      // in an infinite spinner; show an actionable recovery state instead.
      setLoading(false);
      return;
    }

    setDisplayName(profile.display_name || '');
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatar_url || '');
    setCoverUrl(profile.cover_url || '');
    setThemeColor(profile.theme_color || '#0f172a');
    setAccentColor(profile.accent_color || '#06b6d4');
    setThemeFont(profile.theme_font || 'inter');
    setLinkStyle(profile.link_style || 'rounded');
    setSeoTitle(profile.seo_title || '');
    setSeoDescription(profile.seo_description || '');
    setSeoImageUrl(profile.seo_image_url || '');
    setTargetAudience(profile.target_audience || '');
    setBusinessType(profile.business_type || 'criador');
    setLoading(false);
  }, [profile, user]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      if (!user) throw new Error('Usuário não autenticado.');
      let nextAvatar = avatarUrl;
      let nextCover = coverUrl;
      let nextSeoImage = seoImageUrl;
      if (avatarFile) nextAvatar = await uploadUserImage(user.id, avatarFile, 'profile');
      if (coverFile) nextCover = await uploadUserImage(user.id, coverFile, 'profile');
      if (seoImageFile) nextSeoImage = await uploadUserImage(user.id, seoImageFile, 'seo');
      const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio,
        avatar_url: nextAvatar,
        cover_url: nextCover,
        theme_color: themeColor,
        accent_color: accentColor,
        theme_font: themeFont,
        link_style: linkStyle,
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        seo_image_url: nextSeoImage.trim(),
        target_audience: targetAudience.trim(),
        business_type: businessType,
      })
      .eq('id', user!.id);
      if (error) throw error;
      setAvatarUrl(nextAvatar); setCoverUrl(nextCover); setSeoImageUrl(nextSeoImage);
      setAvatarFile(null); setCoverFile(null); setSeoImageFile(null);
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 2500);
    } catch (error: any) {
      window.alert(error?.message || 'Não foi possível salvar as imagens.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  if (!profile) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <PageHeader title="Perfil" subtitle="Configure como você aparece na sua página pública" />
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-800">Perfil ainda não criado</h2>
          <p className="text-sm text-slate-500 mt-2">
            Sua conta está autenticada, mas o registro em <code>profiles</code> não foi encontrado.
          </p>
          <button
            onClick={async () => {
              if (!user) return;
              setLoading(true);
              const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username: (user.email?.split('@')[0] || 'usuario').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'usuario',
                display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário',
              }, { onConflict: 'id' });
              if (!error) await refreshProfile();
              setLoading(false);
            }}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium"
          >
            Criar meu perfil
          </button>
        </Card>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/u/${profile?.username}`;

  function applyPreset(preset: typeof THEME_PRESETS[0]) {
    setThemeColor(preset.bg);
    setAccentColor(preset.accent);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Perfil" subtitle="Como você aparece na sua página pública" />

      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 mb-1">Sua página pública</p>
              <p className="text-sm text-slate-800 font-medium truncate">{publicUrl}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
            >
              Copiar
            </button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Imagens</h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Foto de perfil</label>
            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                {avatarUrl && <img src={avatarUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
                <Upload className="w-4 h-4" /> {avatarFile?.name || 'Escolher imagem do PC ou celular'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Imagem de capa</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
              <Upload className="w-4 h-4" /> {coverFile?.name || 'Escolher imagem do PC ou celular'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Direção do negócio</h2>
            <p className="text-xs text-slate-400 mt-1">Defina para quem você cria e qual tipo de operação o RiseGoat deve priorizar.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Público-alvo</label>
            <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Ex.: criadores iniciantes que querem transformar audiência em negócio" rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Modelo de operação</label>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-cyan-400">
              <option value="criador">Criador / marca pessoal</option>
              <option value="infoprodutor">Infoprodutor</option>
              <option value="servico">Prestador de serviço</option>
              <option value="agencia">Agência / equipe</option>
              <option value="negocio">Negócio / empresa</option>
            </select>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Informações</h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome de exibição</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: BRIT REAL"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Bio / Tagline</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Artist • Producer"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Usuário (@)</label>
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
              <span className="pl-3 pr-1 text-slate-400 text-sm">@</span>
              <input
                type="text"
                value={profile?.username ?? ''}
                disabled
                className="flex-1 py-2 pr-3 bg-transparent text-sm text-slate-500"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Seu usuário não pode ser alterado</p>
          </div>
        </Card>

        {/* Theme presets */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">SEO da página</h2>
            <p className="text-xs text-slate-400 mt-1">Defina como sua página pública aparece em mecanismos de busca e compartilhamentos.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Título SEO</label>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={displayName || 'Seu nome — RiseGoat'} maxLength={60} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400" />
            <p className="text-[11px] text-slate-400 mt-1">{seoTitle.length}/60</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição SEO</label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder={bio || 'Uma descrição curta da sua página'} maxLength={160} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 resize-none" />
            <p className="text-[11px] text-slate-400 mt-1">{seoDescription.length}/160</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Imagem para compartilhamento</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
              <Upload className="w-4 h-4" /> {seoImageFile?.name || 'Escolher imagem do PC ou celular'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setSeoImageFile(e.target.files?.[0] || null)} />
            </label>
            <p className="text-[11px] text-slate-400 mt-1">A imagem será armazenada no Supabase.</p>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Temas predefinidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {THEME_PRESETS.map((preset) => {
              const active = themeColor === preset.bg && accentColor === preset.accent;
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`relative p-3 rounded-xl border-2 transition ${active ? 'border-cyan-500' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="w-full h-12 rounded-lg mb-2 flex items-end justify-center pb-1" style={{ backgroundColor: preset.bg }}>
                    <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                  </div>
                  <p className="text-[10px] font-medium text-slate-600 text-center">{preset.name}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Custom colors */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Personalização avançada</h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Cor de fundo</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Cor de destaque (botões, links)</label>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={`w-7 h-7 rounded-full transition ring-2 ring-offset-1 ${accentColor === c ? 'ring-slate-400' : 'ring-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Fonte</label>
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setThemeFont(font.value)}
                  className={`px-3 py-2.5 text-sm rounded-lg border transition ${themeFont === font.value ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} ${font.css}`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Estilo dos botões de link</label>
            <div className="grid grid-cols-3 gap-2">
              {LINK_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setLinkStyle(style.value)}
                  className={`px-3 py-2.5 text-sm rounded-lg border transition ${linkStyle === style.value ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} ${
                    style.value === 'rounded' ? 'rounded-lg' : style.value === 'pill' ? 'rounded-full' : 'rounded-none'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Live preview */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Pré-visualização</h2>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: themeColor }}>
            <div className="p-6 text-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full mx-auto object-cover border-2" style={{ borderColor: themeColor }} />
              ) : (
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: '#334155' }}>
                  {(displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-white font-bold mt-3" style={{ fontFamily: themeFont === 'serif' ? 'serif' : themeFont === 'mono' ? 'monospace' : 'sans-serif' }}>
                {displayName || 'Seu nome'}
              </p>
              <p className="text-white/50 text-xs mt-1">{bio || 'Sua bio'}</p>
              <div className="mt-4 space-y-2">
                <div
                  className="px-4 py-2 text-white text-sm font-medium text-center"
                  style={{
                    backgroundColor: accentColor + '30',
                    border: `1px solid ${accentColor}50`,
                    borderRadius: linkStyle === 'pill' ? '9999px' : linkStyle === 'square' ? '0' : '12px',
                  }}
                >
                  Instagram
                </div>
                <div
                  className="px-4 py-2 text-white text-sm font-medium text-center"
                  style={{
                    backgroundColor: accentColor + '30',
                    border: `1px solid ${accentColor}50`,
                    borderRadius: linkStyle === 'pill' ? '9999px' : linkStyle === 'square' ? '0' : '12px',
                  }}
                >
                  Spotify
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> Salvo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
