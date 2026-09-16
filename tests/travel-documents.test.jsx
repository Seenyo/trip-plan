// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const backend = vi.hoisted(() => ({ from: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../src/supabase', () => ({ supabase: backend }));
import { cacheDocuments, cachedDocuments, safeLink, saveDocument, uploadAttachment } from '../src/travelDocuments';
import TravelReader from '../src/TravelReader';
const doc = { id: 'notebook:trip', trip_id: 'trip', title: '旅のメモ', revision: 1, blocks: [{ id: 'check', type: 'checklist', items: [{ text: '船の予約', checked: false }] }] };
const trip = { id: 'trip', title: '隠岐の旅' };
let chain;
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  chain = { select: vi.fn(), eq: vi.fn(), update: vi.fn(), insert: vi.fn(), maybeSingle: vi.fn(), abortSignal: vi.fn() };
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.update.mockReturnValue(chain); chain.insert.mockReturnValue(chain);
  backend.from.mockReturnValue(chain);
  chain.abortSignal.mockResolvedValue({ data: [doc], error: null });
});
afterEach(cleanup);
it('prevents a stale revision from overwriting another device', async () => {
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(saveDocument(doc)).rejects.toThrow('別の端末');
  expect(chain.eq).toHaveBeenCalledWith('revision', 1);
  chain.maybeSingle.mockResolvedValue({ data: { ...doc, revision: 2 }, error: null });
  await expect(saveDocument(doc)).resolves.toMatchObject({ revision: 2 });
});
it('opens saved text offline and keeps edits as recoverable drafts', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  cacheDocuments('trip', [doc]);
  const { unmount } = render(<TravelReader trip={trip} onClose={vi.fn()} />);
  await screen.findByRole('heading', { name: '旅のメモ' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'このページを編集' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'このページを編集' }));
  fireEvent.change(screen.getByLabelText('ページタイトル'), { target: { value: '変更したメモ' } });
  fireEvent.click(screen.getByRole('button', { name: '保存', exact: true }));
  await screen.findByText(/オンラインになってから保存/);
  expect(cachedDocuments('trip')[0].title).toBe('旅のメモ');
  unmount();
  render(<TravelReader trip={trip} onClose={vi.fn()} />);
  await screen.findByRole('button', { name: '下書きを復元' });
  fireEvent.click(screen.getByRole('button', { name: '下書きを復元' }));
  expect(screen.getByLabelText('ページタイトル').value).toBe('変更したメモ');
});
it('requires explicit saving of reading-mode checklist changes', async () => {
  // loadDocuments has a single eq; saveDocument resolves via maybeSingle.
  chain.eq.mockReturnValue(chain);
  cacheDocuments('trip', [doc]);
  render(<TravelReader trip={trip} onClose={vi.fn()} />);
  await screen.findByLabelText('船の予約');
  await waitFor(() => expect(screen.getByRole('button', { name: 'このページを編集' }).disabled).toBe(false));
  fireEvent.click(screen.getByLabelText('船の予約'));
  expect(screen.getByLabelText('船の予約').checked).toBe(true);
  expect(JSON.parse(localStorage.getItem('roam.document-draft.v1.notebook:trip')).blocks[0].items[0].checked).toBe(true);
  expect(chain.update).not.toHaveBeenCalled();
});
it('rejects active-content links and oversized or unsupported attachments', async () => {
  expect(safeLink('javascript:alert(1)')).toBeNull();
  expect(safeLink('data:text/html,hello')).toBeNull();
  expect(safeLink('https://www.e-oki.net/')).toBe('https://www.e-oki.net/');
  await expect(uploadAttachment('trip', { type: 'application/pdf', size: 11 * 1024 * 1024 })).rejects.toThrow('10MB');
  await expect(uploadAttachment('trip', { type: 'text/html', size: 100 })).rejects.toThrow('画像');
  expect(backend.storage.from).not.toHaveBeenCalled();
});
it('creates a nested page with its persisted parent and opens its editor', async () => {
  const child = { ...doc, id: 'child', parent_id: doc.id, title: '新しいページ', blocks: [], revision: 1 };
  chain.maybeSingle.mockResolvedValue({ data: child, error: null });
  render(<TravelReader trip={trip} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: '小ページを追加' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '小ページを追加' }));
  await waitFor(() => expect(screen.getByLabelText('ページタイトル').value).toBe('新しいページ'));
  expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ parent_id: doc.id, trip_id: trip.id }));
  expect(cachedDocuments('trip').some((d) => d.id === 'child')).toBe(true);
});
it('allows a stale draft to replace a reviewed latest version only explicitly', async () => {
  cacheDocuments('trip', [doc]);
  localStorage.setItem('roam.document-draft.v1.notebook:trip', JSON.stringify({ ...doc, title: '端末の下書き' }));
  chain.abortSignal.mockResolvedValue({ data: [{ ...doc, revision: 2, title: '別端末の最新版' }], error: null });
  chain.maybeSingle.mockResolvedValue({ data: { ...doc, revision: 3, title: '端末の下書き' }, error: null });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<TravelReader trip={trip} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('heading', { name: '別端末の最新版' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: '下書きを復元' }));
  fireEvent.click(screen.getByRole('button', { name: 'この下書きで上書き' }));
  expect(chain.update).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'この下書きで上書き' }));
  await screen.findByText('保存しました');
  expect(chain.eq).toHaveBeenCalledWith('revision', 2);
  confirm.mockRestore();
});
