import React, { useState, useEffect } from 'react';
import { apiClient, type ApiError } from '../api/client';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import { SampleBadge } from '../components/SampleBadge';
import { ErrorMessage } from '../components/ErrorMessage';
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

interface InstructionItem {
  id: number;
  library_id: number;
  area_id: number;
  mode: string;
  language: string;
  priority: number;
  title: string;
  content: string;
  is_active: boolean;
  is_sample: boolean;
}

interface AreaOption {
  id: number;
  name: string;
  floor: number;
}

const MODES = [
  { value: 'blind', label: 'Blind Mode' },
  { value: 'hearing', label: 'Hearing Mode' },
  { value: 'low_vision', label: 'Low-Vision Mode' },
];

const LANGUAGES = [
  { value: 'en', label: 'English (en)' },
  { value: 'ta', label: 'Tamil (ta)' },
  { value: 'hi', label: 'Hindi (hi)' },
];

export const InstructionsPage: React.FC = () => {
  const [instructions, setInstructions] = useState<InstructionItem[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Filtering
  const [skip, setSkip] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [filterAreaId, setFilterAreaId] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<InstructionItem | null>(null);

  // Form state
  const [formAreaId, setFormAreaId] = useState<number | ''>('');
  const [formMode, setFormMode] = useState('blind');
  const [formLanguage, setFormLanguage] = useState('en');
  const [formPriority, setFormPriority] = useState<number>(1);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Areas for dropdown
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const res = await apiClient<{ items: AreaOption[] }>('/api/areas?limit=100');
        setAreas(res.items || []);
        if (res.items && res.items.length > 0) {
          setFormAreaId(res.items[0].id);
        }
      } catch {
        // Fallback
      }
    };
    loadAreas();
  }, []);

  // Load Instructions
  const loadInstructions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: string[] = [`skip=${skip}`, `limit=${limit}`];
      if (filterAreaId !== 'all') params.push(`area_id=${filterAreaId}`);
      if (filterMode !== 'all') params.push(`mode=${filterMode}`);
      if (filterLanguage !== 'all') params.push(`language=${filterLanguage}`);

      const res = await apiClient<{ items: InstructionItem[]; total: number }>(
        `/api/instructions?${params.join('&')}`
      );
      setInstructions(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load instructions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructions();
  }, [skip, filterAreaId, filterMode, filterLanguage]);

  // Handle Create Instruction
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAreaId) {
      setFormError('Please select a library area.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Content is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await apiClient('/api/instructions', {
        method: 'POST',
        body: JSON.stringify({
          library_id: 1, // City Central Library
          area_id: Number(formAreaId),
          mode: formMode,
          language: formLanguage,
          priority: Number(formPriority),
          title: formTitle.trim(),
          content: formContent.trim(),
        }),
      });

      setCreateModalOpen(false);
      setSuccessMsg(`Instruction "${formTitle}" created.`);
      setFormTitle('');
      setFormContent('');
      loadInstructions();
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.error?.message || 'Failed to create instruction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Instruction
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstruction) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await apiClient(`/api/instructions/${selectedInstruction.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          area_id: Number(formAreaId),
          mode: formMode,
          language: formLanguage,
          priority: Number(formPriority),
          title: formTitle.trim(),
          content: formContent.trim(),
          is_active: formIsActive,
        }),
      });

      setEditModalOpen(false);
      setSuccessMsg(`Instruction "${formTitle}" updated.`);
      loadInstructions();
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.error?.message || 'Failed to update instruction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Instruction
  const handleDeleteConfirm = async () => {
    if (!selectedInstruction) return;
    setIsSubmitting(true);

    try {
      await apiClient(`/api/instructions/${selectedInstruction.id}`, {
        method: 'DELETE',
      });
      setDeleteModalOpen(false);
      setSuccessMsg(`Instruction "${selectedInstruction.title}" deleted.`);
      loadInstructions();
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to delete instruction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<InstructionItem>[] = [
    {
      header: 'Title & Area',
      render: (inst) => {
        const area = areas.find((a) => a.id === inst.area_id);
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--color-text)]">{inst.title}</span>
              {inst.is_sample && <SampleBadge />}
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Area: {area ? area.name : `#${inst.area_id}`} &bull; Priority: {inst.priority}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Mode',
      render: (inst) => {
        const modeBadgeClass =
          inst.mode === 'blind'
            ? 'text-[var(--color-mode-blind)] bg-teal-50 border-teal-200'
            : inst.mode === 'hearing'
            ? 'text-[var(--color-mode-hearing)] bg-amber-50 border-amber-200'
            : 'text-[var(--color-mode-lowvision)] bg-purple-50 border-purple-200';

        return (
          <span
            className={`capitalize text-xs font-semibold px-2 py-0.5 rounded border ${modeBadgeClass}`}
          >
            {inst.mode.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      header: 'Language',
      render: (inst) => (
        <span className="uppercase text-xs font-mono font-medium text-[var(--color-text)]">
          {inst.language}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (inst) => <StatusBadge status={inst.is_active ? 'active' : 'inactive'} />,
    },
    {
      header: 'Guidance Preview',
      render: (inst) => (
        <span className="text-xs text-[var(--color-muted)] line-clamp-2 max-w-xs block">
          {inst.content}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (inst) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedInstruction(inst);
              setFormAreaId(inst.area_id);
              setFormMode(inst.mode);
              setFormLanguage(inst.language);
              setFormPriority(inst.priority);
              setFormTitle(inst.title);
              setFormContent(inst.content);
              setFormIsActive(inst.is_active);
              setFormError(null);
              setEditModalOpen(true);
            }}
            className="p-1 rounded text-[var(--color-primary)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-xs font-medium inline-flex items-center gap-1"
            aria-label={`Edit instruction ${inst.title}`}
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedInstruction(inst);
              setDeleteModalOpen(true);
            }}
            className="p-1 rounded text-[var(--color-danger)] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] text-xs font-medium inline-flex items-center gap-1"
            aria-label={`Delete instruction ${inst.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Guidance Instructions</h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Manage accessibility text and spoken guidance instructions for each library checkpoint.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormTitle('');
            setFormContent('');
            setFormPriority(1);
            setFormMode('blind');
            setFormLanguage('en');
            setFormIsActive(true);
            setFormError(null);
            if (areas.length > 0) setFormAreaId(areas[0].id);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Instruction</span>
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
          <label htmlFor="filter-inst-area" className="block text-xs font-semibold text-[var(--color-muted)] uppercase mb-1">
            Area Checkpoint
          </label>
          <select
            id="filter-inst-area"
            value={filterAreaId}
            onChange={(e) => {
              setFilterAreaId(e.target.value);
              setSkip(0);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">All Checkpoints</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (Floor {a.floor})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-inst-mode" className="block text-xs font-semibold text-[var(--color-muted)] uppercase mb-1">
            Accessibility Mode
          </label>
          <select
            id="filter-inst-mode"
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              setSkip(0);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">All Modes</option>
            <option value="blind">Blind Mode</option>
            <option value="hearing">Hearing Mode</option>
            <option value="low_vision">Low-Vision Mode</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-inst-lang" className="block text-xs font-semibold text-[var(--color-muted)] uppercase mb-1">
            Language
          </label>
          <select
            id="filter-inst-lang"
            value={filterLanguage}
            onChange={(e) => {
              setFilterLanguage(e.target.value);
              setSkip(0);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">All Languages</option>
            <option value="en">English (en)</option>
            <option value="ta">Tamil (ta)</option>
            <option value="hi">Hindi (hi)</option>
          </select>
        </div>
      </div>

      {/* Instructions Table */}
      <DataTable<InstructionItem>
        columns={columns}
        data={instructions}
        loading={loading}
        emptyMessage="No guidance instructions found matching these filters."
        total={total}
        skip={skip}
        limit={limit}
        onPageChange={(newSkip) => setSkip(newSkip)}
        keyExtractor={(item) => item.id}
      />

      {/* CREATE INSTRUCTION MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Guidance Instruction"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          <FormField
            label="Library Area Checkpoint"
            name="instArea"
            type="select"
            required
            value={formAreaId}
            onChange={(e) => setFormAreaId(Number(e.target.value))}
            options={areas.map((a) => ({
              value: a.id,
              label: `${a.name} (Floor ${a.floor})`,
            }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Mode"
              name="instMode"
              type="select"
              required
              value={formMode}
              onChange={(e) => setFormMode(e.target.value)}
              options={MODES}
            />

            <FormField
              label="Language"
              name="instLang"
              type="select"
              required
              value={formLanguage}
              onChange={(e) => setFormLanguage(e.target.value)}
              options={LANGUAGES}
            />

            <FormField
              label="Priority Order"
              name="instPriority"
              type="number"
              required
              value={formPriority}
              onChange={(e) => setFormPriority(Number(e.target.value))}
              helpText="Lower numbers display first (1, 2, 3...)"
            />
          </div>

          <FormField
            label="Instruction Title"
            name="instTitle"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Entrance Doors, Step Counter to Lift"
          />

          <FormField
            label="Instruction Guidance Content"
            name="instContent"
            type="textarea"
            rows={4}
            required
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="Clear, concise accessibility guidance (will be read aloud in Blind mode and displayed visually in Hearing/Low-Vision modes)."
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Instruction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT INSTRUCTION MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Instruction: ${selectedInstruction?.title || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          <FormField
            label="Library Area Checkpoint"
            name="editInstArea"
            type="select"
            required
            value={formAreaId}
            onChange={(e) => setFormAreaId(Number(e.target.value))}
            options={areas.map((a) => ({
              value: a.id,
              label: `${a.name} (Floor ${a.floor})`,
            }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Mode"
              name="editInstMode"
              type="select"
              required
              value={formMode}
              onChange={(e) => setFormMode(e.target.value)}
              options={MODES}
            />

            <FormField
              label="Language"
              name="editInstLang"
              type="select"
              required
              value={formLanguage}
              onChange={(e) => setFormLanguage(e.target.value)}
              options={LANGUAGES}
            />

            <FormField
              label="Priority"
              name="editInstPriority"
              type="number"
              required
              value={formPriority}
              onChange={(e) => setFormPriority(Number(e.target.value))}
            />
          </div>

          <FormField
            label="Instruction Title"
            name="editInstTitle"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          <FormField
            label="Instruction Content"
            name="editInstContent"
            type="textarea"
            rows={4}
            required
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
          />

          <FormField
            label="Instruction is Active"
            name="is_active"
            type="checkbox"
            value={formIsActive}
            onChange={(e: any) => setFormIsActive(e.target.checked)}
            helpText="Inactive instructions will not be shown to visitors."
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

      {/* DELETE INSTRUCTION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Instruction"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text)]">
            Are you sure you want to delete instruction <strong>{selectedInstruction?.title}</strong>?
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            This action cannot be undone.
          </p>

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
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
