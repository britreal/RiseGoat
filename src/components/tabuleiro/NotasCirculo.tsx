import { useEffect, useState } from 'react';
import { Check, Edit3, Loader2, MessageCircle, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  atualizarNotaCirculo, criarNotaCirculo, excluirNotaCirculo,
  listarCirculosDoUsuario, listarNotasCirculo,
} from '@/lib/tabuleiro';
import type { CircleOption, MagnateNotaCirculo } from '@/types/tabuleiro';

const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export function NotasCirculo({ magnateId }: { magnateId: string }) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<CircleOption[]>([]);
  const [circleId, setCircleId] = useState('');
  const [notes, setNotes] = useState<MagnateNotaCirculo[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void listarCirculosDoUsuario().then((items) => {
      if (!active) return;
      setCircles(items);
      setCircleId((current) => current || items[0]?.id || '');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os círculos.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!circleId) { setNotes([]); return () => { active = false; }; }
    setLoading(true);
    void listarNotasCirculo(magnateId, circleId).then((items) => {
      if (active) { setNotes(items); setError(''); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as notas deste círculo.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [magnateId, circleId]);

  async function createNote() {
    if (!circleId || !draft.trim()) return;
    setSaving(true);
    setError('');
    try {
      const note = await criarNotaCirculo(magnateId, circleId, draft);
      setNotes((current) => [note, ...current]);
      setDraft('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a nota.');
    } finally { setSaving(false); }
  }

  async function saveEdit(noteId: string) {
    setSaving(true);
    setError('');
    try {
      const updated = await atualizarNotaCirculo(noteId, editDraft);
      setNotes((current) => current.map((note) => note.id === noteId ? updated : note));
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a nota.');
    } finally { setSaving(false); }
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm('Excluir esta nota do círculo?')) return;
    setError('');
    try {
      await excluirNotaCirculo(noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a nota.');
    }
  }

  return <section className="tabuleiro-circle-notes">
    <div className="tabuleiro-section-heading">
      <div><p className="tabuleiro-eyebrow">Colaboração privada</p><h2><MessageCircle size={19} /> Notas do círculo</h2></div>
      {circles.length > 0 && <label className="tabuleiro-circle-select"><span className="sr-only">Selecionar círculo</span>
        <select value={circleId} onChange={(event) => setCircleId(event.target.value)}>
          {circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}
        </select>
      </label>}
    </div>
    {!user && <p className="tabuleiro-muted">Entre na sua conta para ver as notas colaborativas.</p>}
    {error && <p className="tabuleiro-error" role="alert">{error}</p>}
    {!loading && circles.length === 0 && <div className="tabuleiro-inline-empty">Você ainda não participa de um círculo. As notas de círculo aparecem aqui quando houver acesso.</div>}
    {user && circleId && <div className="tabuleiro-note-compose">
      <textarea rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000}
        placeholder="Compartilhe um contexto útil com seu círculo…" aria-label="Nova nota do círculo" />
      <div><span>{draft.length}/5000</span><button type="button" className="tabuleiro-button tabuleiro-button-primary" onClick={() => void createNote()} disabled={saving || !draft.trim()}>{saving ? <Loader2 size={15} className="tabuleiro-spin" /> : <Plus size={15} />} Adicionar nota</button></div>
    </div>}
    {loading && <p className="tabuleiro-muted"><Loader2 size={15} className="tabuleiro-spin" /> Carregando notas…</p>}
    {!loading && circleId && notes.length === 0 && <p className="tabuleiro-muted">Nenhuma nota compartilhada para esta pessoa ainda.</p>}
    <div className="tabuleiro-circle-note-list">
      {notes.map((note) => <article key={note.id} className="tabuleiro-circle-note">
        <div className="tabuleiro-circle-note-meta"><span>{note.autor_id === user?.id ? 'Você' : 'Membro do círculo'}</span><time dateTime={note.atualizado_em}>{dateLabel(note.atualizado_em)}</time></div>
        {editing === note.id
          ? <div className="tabuleiro-note-edit"><textarea rows={4} value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={5000} aria-label="Editar nota" />
              <div><button type="button" className="tabuleiro-small-icon" onClick={() => setEditing(null)} aria-label="Cancelar edição"><X size={15} /></button><button type="button" className="tabuleiro-small-icon" onClick={() => void saveEdit(note.id)} disabled={saving} aria-label="Salvar edição"><Check size={15} /></button></div></div>
          : <p>{note.conteudo}</p>}
        {note.autor_id === user?.id && editing !== note.id && <div className="tabuleiro-circle-note-actions">
          <button type="button" onClick={() => { setEditing(note.id); setEditDraft(note.conteudo); }} aria-label="Editar nota"><Edit3 size={14} /> Editar</button>
          <button type="button" onClick={() => void deleteNote(note.id)} aria-label="Excluir nota"><Trash2 size={14} /> Excluir</button>
        </div>}
      </article>)}
    </div>
  </section>;
}
