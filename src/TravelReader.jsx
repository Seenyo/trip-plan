import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
import { ATTACHMENT_URL_TTL_SECONDS, attachmentUrl, cachedDocuments, cacheDocuments, documentText, emptyDocument, guideId, loadDocuments, newBlock, notebookId, safeLink, saveDocument, uploadAttachment } from './travelDocuments';
import { offlineAttachmentBlob } from './offlineTrip';
import './travelReader.css';

const blockTypes = { heading: '見出し', text: '文章', bullets: '箇条書き', checklist: 'チェックリスト', link: 'リンク', table: '表' };
const draftKey = (id) => `roam.document-draft.v1.${id}`;
function Attachment({ block }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const localUrl = useRef(null);
  useEffect(() => {
    let active = true;
    let request = 0;
    let timer;
    setUrl(null); setFailed(false);
    const replaceLocalUrl = (next = null) => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
      localUrl.current = next;
    };
    const refresh = async () => {
      const currentRequest = ++request;
      clearTimeout(timer);
      let delay = 60000;
      try {
        let value = navigator.onLine ? await attachmentUrl(block.path) : null;
        if (!value) {
          const blob = await offlineAttachmentBlob(block.path);
          if (blob) {
            if (!active || currentRequest !== request) return;
            value = URL.createObjectURL(blob);
            replaceLocalUrl(value);
          }
        } else replaceLocalUrl();
        if (!active || currentRequest !== request) return;
        if (value) {
          setUrl(value); setFailed(false);
          // Renew with a five-minute margin; resume events also cover suspended tabs.
          if (!localUrl.current) delay = (ATTACHMENT_URL_TTL_SECONDS - 300) * 1000;
        }
      } catch {
        if (!active || currentRequest !== request) return;
        const blob = await offlineAttachmentBlob(block.path).catch(() => null);
        if (!active || currentRequest !== request) return;
        if (blob) {
          const local = URL.createObjectURL(blob);
          replaceLocalUrl(local);
          setUrl(local); setFailed(false);
        } else setFailed(true);
      }
      if (active && currentRequest === request) timer = setTimeout(refresh, delay);
    };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false; clearTimeout(timer); replaceLocalUrl();
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [block.path]);
  if (!url) return <p className="attachment-placeholder"><FileText size={18} />{block.text}<small>{failed ? '添付を開けません。接続を確認してください。自動で再試行します。' : '添付はオンラインで開けます'}</small></p>;
  return block.type === 'image' ? <figure><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={block.text || '添付画像'} loading="lazy" /></a><figcaption>{block.text}</figcaption></figure>
    : <a className="document-file" href={url} target="_blank" rel="noreferrer"><FileText size={22} /><span>{block.text}<small>PDFを開く</small></span><ChevronRight size={18} /></a>;
}
function ReadBlock({ block, onCheck, disabled }) {
  if (block.type === 'heading') return <h2>{block.text}</h2>;
  if (block.type === 'bullets') return <ul>{block.text.split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}</ul>;
  if (block.type === 'checklist') return <div className="document-checklist">{(block.items || []).map((item, i) => <label key={i}><input type="checkbox" disabled={disabled} checked={item.checked} onChange={() => onCheck(i)} /><span>{item.text}</span></label>)}</div>;
  if (block.type === 'link') return safeLink(block.url) ? <a className="document-link" href={safeLink(block.url)} target="_blank" rel="noreferrer">{block.text || block.url}<ChevronRight size={16} /></a> : <p>{block.text || block.url}</p>;
  if (block.type === 'table') return <div className="document-table-scroll"><table><tbody>{(block.rows || []).map((row, i) => <tr key={i}>{row.map((cell, j) => i === 0 ? <th key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
  if (['image', 'file'].includes(block.type)) return <Attachment block={block} />;
  return <p className="document-paragraph">{block.text}</p>;
}
function EditBlock({ block, onChange }) {
  if (block.type === 'checklist') return <div>{(block.items || []).map((item, i) => <div className="check-edit" key={i}><input type="checkbox" aria-label={`${i + 1}番目を完了`} checked={item.checked} onChange={(e) => onChange({ items: block.items.map((it, j) => i === j ? { ...it, checked: e.target.checked } : it) })} /><input aria-label={`チェック項目${i + 1}`} value={item.text} onChange={(e) => onChange({ items: block.items.map((it, j) => i === j ? { ...it, text: e.target.value } : it) })} /><button aria-label={`チェック項目${i + 1}を削除`} onClick={() => onChange({ items: block.items.filter((_, j) => i !== j) })}><X size={16} /></button></div>)}<button className="text-control" onClick={() => onChange({ items: [...block.items, { text: '', checked: false }] })}><Plus size={16} />項目を追加</button></div>;
  if (block.type === 'table') return <><div className="document-table-scroll"><table><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><input aria-label={`${i + 1}行${j + 1}列`} value={cell} onChange={(e) => onChange({ rows: block.rows.map((r, ri) => ri === i ? r.map((c, ci) => ci === j ? e.target.value : c) : r) })} /></td>)}</tr>)}</tbody></table></div><div className="table-controls"><button onClick={() => onChange({ rows: [...block.rows, block.rows[0].map(() => '')] })}>行を追加</button><button onClick={() => onChange({ rows: block.rows.map((r) => [...r, '']) })}>列を追加</button><button disabled={block.rows.length < 2} onClick={() => onChange({ rows: block.rows.slice(0, -1) })}>最後の行を削除</button><button disabled={block.rows[0].length < 2} onClick={() => onChange({ rows: block.rows.map((r) => r.slice(0, -1)) })}>最後の列を削除</button></div></>;
  return <><textarea rows={block.type === 'heading' ? 2 : 4} aria-label={blockTypes[block.type] || '添付の説明'} placeholder={block.type === 'bullets' ? '1行につき1つの項目' : 'ここに入力'} value={block.text} onChange={(e) => onChange({ text: e.target.value })} />{block.type === 'link' && <input type="url" aria-label="リンク先" placeholder="https://…" value={block.url || ''} onChange={(e) => onChange({ url: e.target.value })} />}{['image', 'file'].includes(block.type) && <small>添付済み · {block.path.split('/').pop()}</small>}</>;
}

export default function TravelReader({ trip, activity, onClose }) {
  const startId = activity ? guideId(trip.id, activity.id) : notebookId(trip.id);
  const [docs, setDocs] = useState(() => cachedDocuments(trip.id));
  const [pageId, setPageId] = useState(startId);
  const [doc, setDoc] = useState(() => cachedDocuments(trip.id).find((d) => d.id === startId) || emptyDocument(startId, trip.id, activity?.title || '旅行ノート', activity?.id));
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [stack, setStack] = useState([]);
  const [recoverable, setRecoverable] = useState(null);
  const [conflict, setConflict] = useState(null);
  const dialog = useRef(null);
  const scroller = useRef(null);
  const fileInput = useRef(null);
  const dirtyRef = useRef(false);
  const docRef = useRef(doc);
  dirtyRef.current = dirty;
  docRef.current = doc;
  const remember = (list) => { setDocs(list); if (!cacheDocuments(trip.id, list)) setMessage('この端末の保存容量が不足しています。オフライン保存ができませんでした。'); };
  useEffect(() => {
    let active = true;
    loadDocuments(trip.id).then((list) => {
      if (!active) return;
      remember(list);
      if (!dirtyRef.current) setDoc((current) => list.find((d) => d.id === current.id) || current);
    }).catch(() => { if (active) setMessage('端末に保存した情報を表示しています。ネット接続後、開き直すと最新の情報を取得できます。'); }).finally(() => { if (active) setLoading(false); });
    const onlineChange = () => setOffline(!navigator.onLine);
    window.addEventListener('online', onlineChange); window.addEventListener('offline', onlineChange);
    return () => { active = false; window.removeEventListener('online', onlineChange); window.removeEventListener('offline', onlineChange); };
  }, [trip.id, startId]);
  useEffect(() => {
    scroller.current?.scrollTo?.(0, 0);
    dialog.current?.querySelector('button')?.focus();
    try { const draft = JSON.parse(localStorage.getItem(draftKey(pageId)) || 'null'); setRecoverable(draft); } catch { setRecoverable(null); }
  }, [pageId]);
  useEffect(() => {
    const root = document.getElementById('root');
    const previous = document.activeElement;
    if (root) root.inert = true;
    dialog.current?.querySelector('button')?.focus();
    const key = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]')];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    const unload = (event) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('keydown', key); window.addEventListener('beforeunload', unload);
    return () => { if (root) root.inert = false; previous?.focus(); window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', unload); };
  }, []);
  const change = (next) => {
    dirtyRef.current = true;
    setDoc(next); setDirty(true);
    try { localStorage.setItem(draftKey(next.id), JSON.stringify(next)); } catch { setMessage('端末の保存容量が不足しています。ページを閉じる前にオンラインで保存してください。'); }
  };
  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(documentText(doc)); setMessage('下書きをコピーしました。'); }
    catch { setMessage('コピーできませんでした。下書きはこの端末に残っています。'); }
  };
  const mayLeave = () => !busy && (!dirtyRef.current || confirm('まだ保存していない変更があります。下書きを残してページを移動しますか？'));
  const close = () => { if (mayLeave()) onClose(); };
  const closeRef = useRef(close); closeRef.current = close;
  const goTo = (next, backwards = false) => {
    if (!mayLeave()) return;
    if (backwards) setStack((s) => s.slice(0, -1)); else setStack((s) => [...s, pageId]);
    setPageId(next.id); setDoc(next); setEditing(false); setDirty(false); setConflict(null); setMessage(''); scroller.current?.scrollTo?.(0, 0);
  };
  const save = async (candidate = doc) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (candidate.blocks.some((b) => b.type === 'link' && !safeLink(b.url))) throw new Error('リンク先に有効なURLを入力してください。');
      const saved = await saveDocument(candidate);
      remember([...docs.filter((d) => d.id !== saved.id), saved]); setDoc(saved); setDirty(false); setEditing(false); setRecoverable(null); setConflict(null);
      localStorage.removeItem(draftKey(doc.id)); setMessage('保存しました');
    } catch (error) {
      setMessage(error.message || '保存できませんでした。下書きはこの端末に残ります。');
      if (error.message?.includes('別の端末')) {
        try { const latest = await loadDocuments(trip.id); remember(latest); setConflict(latest.find((d) => d.id === candidate.id)); } catch { /* Keep the local draft. */ }
      }
    }
    finally { setBusy(false); }
  };
  const updateBlock = (id, patch) => change({ ...doc, blocks: doc.blocks.map((b) => b.id === id ? { ...b, ...patch } : b) });
  const move = (i, delta) => { const blocks = [...doc.blocks]; [blocks[i], blocks[i + delta]] = [blocks[i + delta], blocks[i]]; change({ ...doc, blocks }); };
  const attach = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setBusy(true); setMessage('添付をアップロードしています…');
    try { const block = await uploadAttachment(trip.id, file); change({ ...docRef.current, blocks: [...docRef.current.blocks, block] }); setMessage('添付しました。保存すると他の端末でも見られます。'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const children = docs.filter((d) => d.parent_id === pageId && !d.activity_id);
  const addPage = async () => {
    if (dirty) { setMessage('小ページを追加する前に、このページを保存してください。'); return; }
    setBusy(true);
    try {
      let parent = doc;
      if (!doc.revision) { parent = await saveDocument(doc); setDoc(parent); }
      const child = await saveDocument(emptyDocument(`page:${crypto.randomUUID()}`, trip.id, '新しいページ', null, parent.id));
      const next = [...docs.filter((d) => d.id !== parent.id), parent, child]; remember(next);
      setStack((s) => [...s, pageId]); setPageId(child.id); setDoc(child); setEditing(true); setDirty(false); setMessage('');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return createPortal(<div className="travel-reader-backdrop"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="reader-title" className="travel-reader">
    <header className="reader-header"><button disabled={busy} onClick={() => stack.length ? goTo(docs.find((d) => d.id === stack.at(-1)), true) : close()} aria-label={stack.length ? '親ページに戻る' : '旅程に戻る'}><ArrowLeft size={22} /></button><div><span>{activity ? '地点ガイド' : '旅行ノート'}</span><strong>{trip.title}</strong></div><button className="reader-save" disabled={busy || loading} onClick={editing || dirty ? () => save() : () => setEditing(true)}>{busy ? '処理中…' : editing || dirty ? '保存' : '編集'}</button></header>
    <div ref={scroller} className="reader-scroll">
      <div className="reader-content"><div className="reader-kicker"><BookOpen size={17} />{activity ? '訪れる前に、少しだけ' : 'この旅のためのノート'}<span>{offline ? 'オフライン' : '共有ノート'}</span></div>
      {editing ? <input className="reader-title-input" aria-label="ページタイトル" value={doc.title} onChange={(e) => change({ ...doc, title: e.target.value })} maxLength={300} /> : <h1 id="reader-title">{doc.title}</h1>}
      {editing && <span id="reader-title" className="sr-only">ページを編集</span>}
      {activity?.location && <p className="reader-location">{activity.location}</p>}
      {doc.checked_at && <p className="reader-date">情報確認 · {doc.checked_at}　営業時間・交通・現地状況は出典で再確認</p>}
      {message && <p className="reader-message" role="status">{message}</p>}{conflict && dirty && <div className="draft-banner"><p>他の端末の変更があります。最新版を確認してから保存方法を選んでください。</p><details><summary>最新版の内容を見る</summary><pre>{documentText(conflict)}</pre></details><button onClick={copyDraft}>下書きをコピー</button><button disabled={busy} onClick={() => { if (confirm('表示した最新版を、この下書きの内容で上書きしますか？')) save({ ...doc, revision: conflict.revision }); }}>この下書きで上書き</button></div>}
      {recoverable && !dirty && <div className="draft-banner"><p>この端末に保存前の下書きがあります。</p><button onClick={() => { if (recoverable.revision !== doc.revision) setConflict(doc); change(recoverable); setEditing(true); setRecoverable(null); }}>下書きを復元</button><button onClick={() => { if (confirm('この端末の下書きを削除しますか？')) { localStorage.removeItem(draftKey(pageId)); setRecoverable(null); } }}>破棄</button></div>}
      {loading && !doc.blocks.length ? <p className="reader-empty">情報を読み込んでいます…</p> : <>
      {!doc.blocks.length && <p className="reader-empty">{activity ? 'ここに豆知識や、現地で役立つ情報を残せます。' : '予約・持ち物・旅のメモを、ひとつの場所に。'}</p>}
      <div className="document-blocks">{doc.blocks.map((block, i) => editing ? <section className="block-editor" key={block.id}><div className="block-editor-heading"><span>{blockTypes[block.type] || (block.type === 'image' ? '画像' : 'PDF')}</span><button disabled={i === 0 || busy} aria-label={`${i + 1}番目のブロックを上へ`} onClick={() => move(i, -1)}><ArrowUp size={17} /></button><button disabled={i === doc.blocks.length - 1 || busy} aria-label={`${i + 1}番目のブロックを下へ`} onClick={() => move(i, 1)}><ArrowDown size={17} /></button><button disabled={busy} aria-label={`${i + 1}番目のブロックを削除`} onClick={() => { if (confirm('このブロックを削除しますか？')) change({ ...doc, blocks: doc.blocks.filter((b) => b.id !== block.id) }); }}><Trash2 size={17} /></button></div><fieldset disabled={busy}><EditBlock block={block} onChange={(patch) => updateBlock(block.id, patch)} /></fieldset></section> : <ReadBlock key={block.id} block={block} disabled={busy || loading} onCheck={(index) => { if (!busy) updateBlock(block.id, { items: block.items.map((it, i) => i === index ? { ...it, checked: !it.checked } : it) }); }} />)}</div>
      {editing && <div className="add-block-menu"><p>内容を追加</p>{Object.entries(blockTypes).map(([type, label]) => <button key={type} disabled={busy || doc.blocks.length >= 500} onClick={() => change({ ...doc, blocks: [...doc.blocks, newBlock(type)] })}><Plus size={16} />{label}</button>)}<button disabled={busy || offline || doc.blocks.length >= 500} onClick={() => fileInput.current.click()}><Upload size={16} />画像・PDF</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" hidden onChange={attach} /><small>添付は10MBまで。この共有アプリを開く人が閲覧できます。個人情報を含む書類はご注意ください。</small></div>}
      {!activity && <section className="reader-pages"><h2>小ページ</h2>{children.map((child) => <button key={child.id} disabled={busy} onClick={() => goTo(child)}><FileText size={18} /><span>{child.title || '無題のページ'}</span><ChevronRight size={18} /></button>)}<button className="add-page" disabled={busy || offline} onClick={addPage}><Plus size={18} />小ページを追加</button></section>}
      <footer className="reader-footer">{!editing && <button className="reader-edit" disabled={busy} onClick={() => setEditing(true)}>このページを編集</button>}{dirty && !editing && <button className="reader-edit" disabled={busy} onClick={() => save()}><Check size={16} />変更を保存</button>}<p>端末に保存した旅行は、文章・画像・PDFを電波がなくても開けます。外部リンクはオンラインで開きます。</p></footer>
      </>}
    </div></div>
  </section></div>, document.body);
}
