import React, { useState, useEffect, useRef } from 'react';
import { apiClient, type ApiError } from '../api/client';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import { SampleBadge } from '../components/SampleBadge';
import { ErrorMessage } from '../components/ErrorMessage';
import { Plus, Radio, Edit2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface RfidCardItem {
  id: number;
  uid: string;
  visitor_id: number;
  label: string | null;
  is_active: boolean;
  is_sample: boolean;
  created_at: string | null;
  visitor?: {
    id: number;
    mode: string;
    language: string;
  };
}

interface VisitorOption {
  id: number;
  mode: string;
  language: string;
}

export const CardsPage: React.FC = () => {
  const [cards, setCards] = useState<RfidCardItem[]>([]);
  const [visitors, setVisitors] = useState<VisitorOption[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Filtering
  const [skip, setSkip] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterVisitorId, setFilterVisitorId] = useState<string>('all');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  // Form states
  const [formUid, setFormUid] = useState<string>('');
  const [formVisitorId, setFormVisitorId] = useState<number | ''>('');
  const [formLabel, setFormLabel] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [selectedCard, setSelectedCard] = useState<RfidCardItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Capture UID state
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureMessage, setCaptureMessage] = useState<string>('');
  const capturePollRef = useRef<any>(null);
  const captureTimeoutRef = useRef<any>(null);

  // Fetch visitors for dropdown
  useEffect(() => {
    const loadVisitors = async () => {
      try {
        const res = await apiClient<{ items: VisitorOption[] }>('/api/visitors?limit=100');
        setVisitors(res.items || []);
        if (res.items && res.items.length > 0) {
          setFormVisitorId(res.items[0].id);
        }
      } catch {
        // Fallback
      }
    };
    loadVisitors();
  }, []);

  // Fetch Cards
  const loadCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: string[] = [`skip=${skip}`, `limit=${limit}`];
      if (filterActive === 'active') params.push('is_active=true');
      if (filterActive === 'inactive') params.push('is_active=false');
      if (filterVisitorId !== 'all') params.push(`visitor_id=${filterVisitorId}`);

      const res = await apiClient<{ items: RfidCardItem[]; total: number }>(
        `/api/cards?${params.join('&')}`
      );
      setCards(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load RFID cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [skip, filterActive, filterVisitorId]);

  // Handle Capture UID
  const stopCapturing = () => {
    if (capturePollRef.current) clearInterval(capturePollRef.current);
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    setIsCapturing(false);
  };

  const startCapture = () => {
    stopCapturing();
    setIsCapturing(true);
    setCaptureMessage('Waiting for a physical RFID scan. Tap a card on the reader...');

    // Poll every 2 seconds
    capturePollRef.current = setInterval(async () => {
      try {
        const res = await apiClient<{ uid: string | null; message: string }>(
          '/api/rfid/scans/capture-next'
        );
        if (res.uid) {
          setFormUid(res.uid.toUpperCase());
          setCaptureMessage(`Card detected: ${res.uid}`);
          stopCapturing();
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    // Timeout after 30 seconds
    captureTimeoutRef.current = setTimeout(() => {
      stopCapturing();
      setCaptureMessage('Capture timed out after 30s. Please ensure reader is connected and tap again.');
    }, 30000);
  };

  useEffect(() => {
    return () => stopCapturing();
  }, []);

  // Create Card Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleaned = formUid.replace(/[\s\:\-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{8,20}$/.test(cleaned)) {
      setFormError('UID must be 8 to 20 uppercase hexadecimal characters (0-9, A-F).');
      return;
    }

    if (!formVisitorId) {
      setFormError('Please select a visitor profile.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/api/cards', {
        method: 'POST',
        body: JSON.stringify({
          uid: cleaned,
          visitor_id: Number(formVisitorId),
          label: formLabel.trim() || undefined,
        }),
      });

      setCreateModalOpen(false);
      setSuccessMsg(`Card ${cleaned} registered successfully.`);
      setFormUid('');
      setFormLabel('');
      loadCards();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.error?.code === 'DUPLICATE_ACTIVE_CARD') {
        setFormError('An active card with this UID already exists in the system.');
      } else {
        setFormError(apiErr?.error?.message || 'Failed to create RFID card.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Card Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient(`/api/cards/${selectedCard.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: formLabel.trim() || undefined,
          is_active: formIsActive,
        }),
      });

      setEditModalOpen(false);
      setSuccessMsg(`Card ${selectedCard.uid} updated.`);
      loadCards();
    } catch (err: any) {
      setFormError(err?.error?.message || 'Failed to update card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete (Deactivate) Card
  const handleDeleteConfirm = async () => {
    if (!selectedCard) return;
    setIsSubmitting(true);
    try {
      await apiClient(`/api/cards/${selectedCard.id}`, {
        method: 'DELETE',
      });
      setDeleteModalOpen(false);
      setSuccessMsg(`Card ${selectedCard.uid} has been deactivated.`);
      loadCards();
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to deactivate card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columns configuration for DataTable
  const columns: Column<RfidCardItem>[] = [
    {
      header: 'Card UID',
      render: (card) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm tracking-wide text-[var(--color-text)]">
            {card.uid}
          </span>
          {card.is_sample && <SampleBadge />}
        </div>
      ),
    },
    {
      header: 'Visitor Profile',
      render: (card) => {
        const v = visitors.find((vis) => vis.id === card.visitor_id);
        const mode = v ? v.mode : `Visitor #${card.visitor_id}`;
        return (
          <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-primary)]">
            {mode.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      header: 'Label / Description',
      render: (card) => card.label || <span className="text-[var(--color-muted)] text-xs">—</span>,
    },
    {
      header: 'Status',
      render: (card) => <StatusBadge status={card.is_active ? 'active' : 'inactive'} />,
    },
    {
      header: 'Created Date',
      render: (card) => (
        <span className="text-xs text-[var(--color-muted)]">
          {card.created_at ? new Date(card.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (card) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCard(card);
              setFormLabel(card.label || '');
              setFormIsActive(card.is_active);
              setFormError(null);
              setEditModalOpen(true);
            }}
            className="p-1 rounded text-[var(--color-primary)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-xs font-medium inline-flex items-center gap-1"
            aria-label={`Edit card ${card.uid}`}
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
          {card.is_active && (
            <button
              type="button"
              onClick={() => {
                setSelectedCard(card);
                setDeleteModalOpen(true);
              }}
              className="p-1 rounded text-[var(--color-danger)] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] text-xs font-medium inline-flex items-center gap-1"
              aria-label={`Deactivate card ${card.uid}`}
            >
              <span>Deactivate</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">RFID Cards Management</h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Register visitor accessibility cards and capture UIDs from live physical RFID reader taps.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormUid('');
            setFormLabel('');
            setFormError(null);
            setCaptureMessage('');
            stopCapturing();
            if (visitors.length > 0) setFormVisitorId(visitors[0].id);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-none"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Register New Card</span>
        </button>
      </div>

      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-between text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 flex flex-wrap items-center gap-4">
        <div>
          <label htmlFor="filter-active" className="block text-xs font-semibold text-[var(--color-muted)] uppercase mb-1">
            Status
          </label>
          <select
            id="filter-active"
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setSkip(0);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">All Cards</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-visitor" className="block text-xs font-semibold text-[var(--color-muted)] uppercase mb-1">
            Visitor Mode
          </label>
          <select
            id="filter-visitor"
            value={filterVisitorId}
            onChange={(e) => {
              setFilterVisitorId(e.target.value);
              setSkip(0);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">All Visitors</option>
            {visitors.map((v) => (
              <option key={v.id} value={v.id}>
                Visitor #{v.id} ({v.mode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable<RfidCardItem>
        columns={columns}
        data={cards}
        loading={loading}
        emptyMessage="No RFID cards registered matching your filter. Click 'Register New Card' to add one."
        total={total}
        skip={skip}
        limit={limit}
        onPageChange={(newSkip) => setSkip(newSkip)}
        keyExtractor={(item) => item.id}
      />

      {/* CREATE CARD MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          stopCapturing();
          setCreateModalOpen(false);
        }}
        title="Register New RFID Card"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          {/* Physical Capture Section */}
          <div className="p-4 rounded border border-gray-200 bg-[var(--color-surface)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                Physical RFID Reader Capture
              </span>
              {isCapturing && (
                <span className="text-xs text-[var(--color-primary)] font-semibold animate-pulse">
                  Listening for tap...
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Tap a physical card on the connected ESP32 RC522 reader to automatically capture its UID.
            </p>

            <div className="pt-1">
              {!isCapturing ? (
                <button
                  type="button"
                  onClick={startCapture}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-white border border-gray-300 text-[var(--color-primary)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  Capture UID from next real scan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCapturing}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-red-100 text-[var(--color-danger)] border border-red-200 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
                >
                  Cancel Capture
                </button>
              )}
            </div>

            {captureMessage && (
              <p
                role="status"
                aria-live="polite"
                className={`text-xs mt-1 font-medium ${
                  formUid ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'
                }`}
              >
                {captureMessage}
              </p>
            )}
          </div>

          {/* Manual UID Entry */}
          <FormField
            label="Card UID"
            name="uid"
            type="text"
            required
            value={formUid}
            onChange={(e) => setFormUid(e.target.value.toUpperCase())}
            placeholder="e.g. 04A1B2C3"
            helpText="8 to 20 uppercase hex characters (no colons or spaces). Captured automatically or entered manually."
          />

          {/* Visitor profile dropdown */}
          <FormField
            label="Assign to Visitor Profile"
            name="visitor_id"
            type="select"
            required
            value={formVisitorId}
            onChange={(e) => setFormVisitorId(Number(e.target.value))}
            options={visitors.map((v) => ({
              value: v.id,
              label: `Visitor #${v.id} (${v.mode.replace('_', ' ')} mode, ${v.language.toUpperCase()})`,
            }))}
            helpText="Determines accessibility mode and language when this card is tapped."
          />

          {/* Label */}
          <FormField
            label="Card Label (Optional)"
            name="label"
            type="text"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="e.g. Visitor Pass A, Staff Backup Card"
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                stopCapturing();
                setCreateModalOpen(false);
              }}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CARD MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Card ${selectedCard?.uid || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          <div>
            <span className="block text-xs font-semibold text-[var(--color-muted)] uppercase mb-1">
              Card UID
            </span>
            <p className="font-mono font-bold text-sm text-[var(--color-text)] bg-gray-100 p-2 rounded border border-gray-200">
              {selectedCard?.uid}
            </p>
          </div>

          <FormField
            label="Card Label / Notes"
            name="edit-label"
            type="text"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Card label"
          />

          <FormField
            label="Card is Active"
            name="is_active"
            type="checkbox"
            value={formIsActive}
            onChange={(e: any) => setFormIsActive(e.target.checked)}
            helpText="Inactive cards will be rejected by the scanner (reason: INACTIVE)."
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Deactivate RFID Card"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-[var(--color-danger)] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Deactivate card {selectedCard?.uid}?
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Deactivating this card will keep the record in history but will immediately reject scans from this UID. It will no longer grant accessibility guidance.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-danger)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] disabled:opacity-50"
            >
              {isSubmitting ? 'Deactivating...' : 'Confirm Deactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
