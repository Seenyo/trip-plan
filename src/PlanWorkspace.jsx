import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  FilePlus2,
  ListTree,
  MapPinned,
  Redo2,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { ja } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { createTemplateDocument, isEmptyDocument, templateOptions } from './planTemplate';
import { extractItineraryDraft, findMatchingDay } from './planExtract';
import { uploadPlanImage } from './supabase';
import './plan.css';

const blockText = (block) => Array.isArray(block?.content)
  ? block.content.map((item) => item.text || '').join('')
  : typeof block?.content === 'string' ? block.content : '';

const outlineFrom = (blocks, depth = 0) => blocks.flatMap((block) => {
  const own = block.type === 'heading'
    ? [{ id: block.id, label: blockText(block) || '無題の見出し', level: block.props?.level || depth + 1 }]
    : [];
  return [...own, ...outlineFrom(block.children || [], depth + 1)];
});

function ViewSwitch({ view, onChange }) {
  return (
    <div className="plan-view-switch" aria-label="表示を切り替える">
      <button className={view === 'itinerary' ? 'active' : ''} onClick={() => onChange('itinerary')}>旅程</button>
      <button className={view === 'plan' ? 'active' : ''} onClick={() => onChange('plan')}>プラン</button>
    </div>
  );
}

function SaveState({ status }) {
  const values = {
    loading: ['読み込み中', Cloud],
    saving: ['保存中', Cloud],
    saved: ['保存済み', Check],
    local: ['端末に保存', CloudOff],
    error: ['同期できません', CloudOff],
  };
  const [label, Icon] = values[status] || values.local;
  return <span className={`plan-save-state status-${status}`}><Icon size={14} />{label}</span>;
}

function TemplateBuilder({ onCreate }) {
  const [title, setTitle] = useState('新しい旅の計画');
  const [selected, setSelected] = useState(['overview', 'questions', 'days', 'decisions']);
  const groups = [...new Set(templateOptions.map((option) => option.group))];
  const toggle = (id) => setSelected((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  return (
    <div className="template-builder">
      <span className="template-kicker"><Sparkles size={15} /> 旅の材料を選ぶ</span>
      <h1>最初に、必要なページだけ。</h1>
      <p>決まっていない状態から始められるように、今回使う項目を選んでください。</p>
      <label className="template-title">
        <span>ノートのタイトル</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：北海道 夏の旅" />
      </label>
      <div className="template-groups">
        {groups.map((group) => (
          <section key={group}>
            <h2>{group}</h2>
            <div className="template-options">
              {templateOptions.filter((option) => option.group === group).map((option) => {
                const checked = selected.includes(option.id);
                return (
                  <label className={`template-option ${checked ? 'checked' : ''}`} key={option.id}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(option.id)} />
                    <span className="template-check">{checked && <Check size={14} />}</span>
                    <span><strong>{option.label}を追加</strong><small>{option.hint}</small></span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <button className="create-template" disabled={!title.trim() || selected.length === 0} onClick={() => onCreate(createTemplateDocument(title, selected))}>
        この内容で書き始める <ChevronRight size={18} />
      </button>
    </div>
  );
}

function AddToItineraryDialog({ selection, trips, initialTripId, onClose, onAdd }) {
  const initialTrip = trips.find((trip) => trip.id === initialTripId) || trips[0];
  const extracted = extractItineraryDraft(selection, initialTrip);
  const [form, setForm] = useState({ tripId: initialTrip.id, ...extracted });
  const trip = trips.find((item) => item.id === form.tripId) || trips[0];
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const changeTrip = (tripId) => {
    const target = trips.find((item) => item.id === tripId);
    setForm((current) => ({ ...current, tripId, dayId: findMatchingDay(target, current.dateParts) }));
  };
  const save = (event) => {
    event.preventDefault();
    const details = [form.price && `料金：${form.price}`, form.notes].filter(Boolean).join('\n');
    onAdd({
      tripId: form.tripId,
      dayId: form.dayId,
      activity: { time: form.time, title: form.title.trim(), location: form.location.trim(), notes: details, coords: null },
    });
  };
  return (
    <div className="plan-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="plan-dialog" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <header><div><span>選択した内容から作成</span><h2 id="capture-title">旅程へ追加</h2></div><button onClick={onClose} aria-label="閉じる"><X size={20} /></button></header>
        <form onSubmit={save}>
          <div className="capture-grid">
            <label><span>旅行</span><select value={form.tripId} onChange={(event) => changeTrip(event.target.value)}>{trips.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
            <label><span>日付</span><select value={form.dayId} onChange={(event) => set('dayId', event.target.value)}>{trip.days.map((day) => <option value={day.id} key={day.id}>{day.date} — {day.title}</option>)}</select></label>
            <label><span>時刻</span><input type="time" value={form.time} onChange={(event) => set('time', event.target.value)} /></label>
            <label className="capture-wide"><span>予定</span><input autoFocus required value={form.title} onChange={(event) => set('title', event.target.value)} /></label>
            <label className="capture-wide"><span>場所</span><input value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="住所や施設名" /></label>
            <label><span>料金</span><input value={form.price} onChange={(event) => set('price', event.target.value)} placeholder="例：12,000円" /></label>
            <label className="capture-wide"><span>メモ</span><textarea rows="5" value={form.notes} onChange={(event) => set('notes', event.target.value)} /></label>
          </div>
          <footer><button type="button" className="plan-secondary" onClick={onClose}>キャンセル</button><button className="plan-primary">旅程へ追加 <MapPinned size={16} /></button></footer>
        </form>
      </section>
    </div>
  );
}

function PlanEditor({ initialDocument, onChange, onCapture, status, onReset }) {
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const editor = useCreateBlockNote({
    initialContent: initialDocument,
    dictionary: ja,
    uploadFile: uploadPlanImage,
    tables: { headers: true, splitCells: true },
  });
  const outline = useMemo(() => outlineFrom(editor.document), [editor.document]);

  const capture = () => {
    const selection = editor.getSelection();
    if (!selection?.blocks?.length) {
      setNotice('旅程にしたい文章を選択してください。');
      window.setTimeout(() => setNotice(''), 2600);
      return;
    }
    const cut = editor.getSelectionCutBlocks(true);
    const markdown = editor.blocksToMarkdownLossy(cut.blocks).trim();
    if (!markdown) return;
    onCapture(markdown);
  };

  const jumpTo = (id) => {
    editor.setTextCursorPosition(id, 'start');
    document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setOutlineOpen(false);
  };

  return (
    <div className="plan-editor-layout">
      <aside className={`plan-outline ${outlineOpen ? 'open' : ''}`}>
        <div className="outline-heading"><span><ListTree size={16} /> 目次</span><button className="outline-close" onClick={() => setOutlineOpen(false)}><X size={17} /></button></div>
        <nav>{outline.map((item) => <button key={item.id} style={{ '--outline-level': Math.min(item.level, 3) }} onClick={() => jumpTo(item.id)}>{item.label}</button>)}</nav>
        <div className="outline-help"><strong>折りたたみ見出し</strong><span>「/」を入力して追加できます。</span></div>
      </aside>
      {outlineOpen && <button className="outline-scrim" onClick={() => setOutlineOpen(false)} aria-label="目次を閉じる" />}
      <section className="plan-paper">
        <div className="plan-tools">
          <button className="mobile-outline-button" onClick={() => setOutlineOpen(true)}><ListTree size={17} /> 目次</button>
          <div className="undo-tools"><button onClick={() => editor.undo()} aria-label="元に戻す"><Undo2 size={17} /></button><button onClick={() => editor.redo()} aria-label="やり直す"><Redo2 size={17} /></button></div>
          <button className="capture-button" onMouseDown={(event) => event.preventDefault()} onClick={capture}><MapPinned size={16} /> 選択部分を旅程へ</button>
          <SaveState status={status} />
          <button className="reset-plan" onClick={onReset} aria-label="新しいノート"><FilePlus2 size={17} /><span>新しいノート</span></button>
        </div>
        {notice && <div className="plan-notice">{notice}</div>}
        <div className="plan-editor-scroll">
          <BlockNoteView
            editor={editor}
            theme="dark"
            onChange={() => onChange(editor.document, editor.blocksToMarkdownLossy())}
            className="trip-blocknote"
          />
        </div>
      </section>
    </div>
  );
}

export default function PlanWorkspace({ trips, planDocument, onPlanChange, onAddActivity, selectedTripId, status, view, onViewChange }) {
  const [selection, setSelection] = useState('');
  const reset = () => {
    if (window.confirm('現在のプランを消して、新しいノートを作りますか？')) onPlanChange([], '');
  };
  return (
    <main className="plan-workspace">
      <header className="plan-header">
        <button className="plan-back" onClick={() => onViewChange('itinerary')} aria-label="旅程へ戻る"><ArrowLeft size={19} /></button>
        <div className="plan-brand"><span>ROAM</span><strong>旅の作戦ノート</strong></div>
        <ViewSwitch view={view} onChange={onViewChange} />
      </header>
      {isEmptyDocument(planDocument)
        ? <TemplateBuilder onCreate={(document) => { window.scrollTo({ top: 0 }); onPlanChange(document, ''); }} />
        : <PlanEditor initialDocument={planDocument} onChange={onPlanChange} onCapture={setSelection} status={status} onReset={reset} />}
      {selection && <AddToItineraryDialog selection={selection} trips={trips} initialTripId={selectedTripId} onClose={() => setSelection('')} onAdd={(payload) => { onAddActivity(payload); setSelection(''); }} />}
    </main>
  );
}
