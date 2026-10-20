import React, { useState, useEffect } from 'react';
import { apiClient, type ApiError } from '../api/client';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { SampleBadge } from '../components/SampleBadge';
import { ErrorMessage } from '../components/ErrorMessage';
import { Building2, Plus, Edit2, Trash2, MapPin, Layers, CheckCircle2 } from 'lucide-react';

interface LibraryData {
  id: number;
  name: string;
  code: string;
  address: string | null;
  floors: number;
  is_sample: boolean;
}

interface AreaItem {
  id: number;
  library_id: number;
  name: string;
  area_type: string;
  floor: number;
  description: string | null;
  is_sample: boolean;
}

const AREA_TYPES = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'reception', label: 'Reception' },
  { value: 'shelves', label: 'Shelves / Stacks' },
  { value: 'reading_hall', label: 'Reading Hall' },
  { value: 'computer_section', label: 'Computer Section' },
  { value: 'children_section', label: 'Children Section' },
  { value: 'restroom', label: 'Accessible Restroom' },
  { value: 'lift', label: 'Elevator / Lift' },
  { value: 'stairs', label: 'Stairs' },
  { value: 'corridor', label: 'Corridor' },
  { value: 'exit', label: 'Emergency Exit' },
  { value: 'assembly_point', label: 'Assembly Point' },
  { value: 'parking', label: 'Parking Area' },
];

export const LibraryPage: React.FC = () => {
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [totalAreas, setTotalAreas] = useState<number>(0);
  const [loadingLib, setLoadingLib] = useState<boolean>(true);
  const [loadingAreas, setLoadingAreas] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Filtering
  const [skip, setSkip] = useState<number>(0);
  const [limit] = useState<number>(20);
  const [floorFilter, setFloorFilter] = useState<string>('all');

  // Modal states
  const [editLibModalOpen, setEditLibModalOpen] = useState(false);
  const [createAreaModalOpen, setCreateAreaModalOpen] = useState(false);
  const [editAreaModalOpen, setEditAreaModalOpen] = useState(false);
  const [deleteAreaModalOpen, setDeleteAreaModalOpen] = useState(false);

  // Library Edit Form
  const [libName, setLibName] = useState('');
  const [libCode, setLibCode] = useState('');
  const [libAddress, setLibAddress] = useState('');
  const [libFloors, setLibFloors] = useState<number>(2);

  // Area Form
  const [selectedArea, setSelectedArea] = useState<AreaItem | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaType, setAreaType] = useState('entrance');
  const [areaFloor, setAreaFloor] = useState<number>(0);
  const [areaDesc, setAreaDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Library Details
  const loadLibrary = async () => {
    setLoadingLib(true);
    try {
      const res = await apiClient<{ items: LibraryData[] }>('/api/libraries?limit=1');
      if (res.items && res.items.length > 0) {
        const lib = res.items[0];
        setLibrary(lib);
        setLibName(lib.name);
        setLibCode(lib.code);
        setLibAddress(lib.address || '');
        setLibFloors(lib.floors);
      }
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load library info.');
    } finally {
      setLoadingLib(false);
    }
  };

  // Load Areas
  const loadAreas = async () => {
    setLoadingAreas(true);
    try {
      let query = `/api/areas?skip=${skip}&limit=${limit}`;
      if (library?.id) {
        query += `&library_id=${library.id}`;
      }
      const res = await apiClient<{ items: AreaItem[]; total: number }>(query);
      let items = res.items || [];
      if (floorFilter !== 'all') {
        items = items.filter((a) => a.floor === Number(floorFilter));
      }
      setAreas(items);
      setTotalAreas(res.total || 0);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load areas.');
    } finally {
      setLoadingAreas(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  useEffect(() => {
    loadAreas();
  }, [library?.id, skip, floorFilter]);

  // Handle Library Edit
  const handleEditLibrarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!library) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const updated = await apiClient<LibraryData>(`/api/libraries/${library.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: libName.trim(),
          code: libCode.trim().toUpperCase(),
          address: libAddress.trim() || undefined,
          floors: Number(libFloors),
        }),
      });
      setLibrary(updated);
      setEditLibModalOpen(false);
      setSuccessMsg('Library information updated.');
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.error?.message || 'Failed to update library.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Area
  const handleCreateAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!library) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await apiClient('/api/areas', {
        method: 'POST',
        body: JSON.stringify({
          library_id: library.id,
          name: areaName.trim(),
          area_type: areaType,
          floor: Number(areaFloor),
          description: areaDesc.trim() || undefined,
        }),
      });

      setCreateAreaModalOpen(false);
      setSuccessMsg(`Area "${areaName}" created successfully.`);
      setAreaName('');
      setAreaDesc('');
      loadAreas();
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.error?.message || 'Failed to create area.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Area
  const handleEditAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await apiClient(`/api/areas/${selectedArea.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: areaName.trim(),
          area_type: areaType,
          floor: Number(areaFloor),
          description: areaDesc.trim() || undefined,
        }),
      });

      setEditAreaModalOpen(false);
      setSuccessMsg(`Area "${areaName}" updated.`);
      loadAreas();
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.error?.message || 'Failed to update area.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Area
  const handleDeleteAreaConfirm = async () => {
    if (!selectedArea) return;
    setIsSubmitting(true);

    try {
      await apiClient(`/api/areas/${selectedArea.id}`, {
        method: 'DELETE',
      });
      setDeleteAreaModalOpen(false);
      setSuccessMsg(`Area "${selectedArea.name}" removed.`);
      loadAreas();
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to delete area.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AreaItem>[] = [
    {
      header: 'Area Name',
      render: (a) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--color-text)]">{a.name}</span>
          {a.is_sample && <SampleBadge />}
        </div>
      ),
    },
    {
      header: 'Area Type',
      render: (a) => (
        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text)] border border-gray-200">
          {a.area_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Floor',
      render: (a) => (
        <span className="text-xs font-semibold text-[var(--color-muted)]">
          {a.floor === 0 ? 'Ground Floor (0)' : `Floor ${a.floor}`}
        </span>
      ),
    },
    {
      header: 'Description',
      render: (a) => (
        <span className="text-xs text-[var(--color-muted)] line-clamp-1">
          {a.description || '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (a) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedArea(a);
              setAreaName(a.name);
              setAreaType(a.area_type);
              setAreaFloor(a.floor);
              setAreaDesc(a.description || '');
              setFormError(null);
              setEditAreaModalOpen(true);
            }}
            className="p-1 rounded text-[var(--color-primary)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-xs font-medium inline-flex items-center gap-1"
            aria-label={`Edit area ${a.name}`}
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedArea(a);
              setDeleteAreaModalOpen(true);
            }}
            className="p-1 rounded text-[var(--color-danger)] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] text-xs font-medium inline-flex items-center gap-1"
            aria-label={`Delete area ${a.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Library & Areas</h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Configure library location details and indoor navigation areas.
        </p>
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

      {/* SECTION 1: LIBRARY DETAILS CARD */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-[var(--color-surface)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[var(--color-text)]">
                  {loadingLib ? 'Loading library...' : library?.name}
                </h3>
                {library?.is_sample && <SampleBadge />}
              </div>
              <p className="text-xs font-mono font-semibold text-[var(--color-muted)] mt-0.5">
                CODE: {library?.code || '—'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (library) {
                setLibName(library.name);
                setLibCode(library.code);
                setLibAddress(library.address || '');
                setLibFloors(library.floors);
                setFormError(null);
                setEditLibModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-xs font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit Info</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[var(--color-muted)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="block text-xs font-semibold text-[var(--color-muted)] uppercase">
                Address
              </span>
              <span className="text-[var(--color-text)]">{library?.address || 'Not specified'}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Layers className="w-4 h-4 text-[var(--color-muted)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="block text-xs font-semibold text-[var(--color-muted)] uppercase">
                Building Floors
              </span>
              <span className="text-[var(--color-text)]">{library?.floors || 1} Floors (Ground + Upper)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AREAS LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text)]">Configured Library Areas</h3>
            <p className="text-xs text-[var(--color-muted)]">
              Indoor checkpoints and rooms with targeted accessibility guidance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label htmlFor="floor-filter" className="sr-only">
                Filter by floor
              </label>
              <select
                id="floor-filter"
                value={floorFilter}
                onChange={(e) => {
                  setFloorFilter(e.target.value);
                  setSkip(0);
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-[var(--color-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">All Floors</option>
                <option value="0">Ground Floor (0)</option>
                <option value="1">First Floor (1)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setAreaName('');
                setAreaType('entrance');
                setAreaFloor(0);
                setAreaDesc('');
                setFormError(null);
                setCreateAreaModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Area</span>
            </button>
          </div>
        </div>

        <DataTable<AreaItem>
          columns={columns}
          data={areas}
          loading={loadingAreas}
          emptyMessage="No areas found for this floor. Add a new area to get started."
          total={totalAreas}
          skip={skip}
          limit={limit}
          onPageChange={(newSkip) => setSkip(newSkip)}
          keyExtractor={(item) => item.id}
        />
      </div>

      {/* EDIT LIBRARY MODAL */}
      <Modal
        isOpen={editLibModalOpen}
        onClose={() => setEditLibModalOpen(false)}
        title="Edit Library Details"
        maxWidth="md"
      >
        <form onSubmit={handleEditLibrarySubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          <FormField
            label="Library Name"
            name="name"
            required
            value={libName}
            onChange={(e) => setLibName(e.target.value)}
          />

          <FormField
            label="Library Code"
            name="code"
            required
            value={libCode}
            onChange={(e) => setLibCode(e.target.value.toUpperCase())}
            helpText="Short identifier (e.g. CCL)"
          />

          <FormField
            label="Physical Address"
            name="address"
            value={libAddress}
            onChange={(e) => setLibAddress(e.target.value)}
          />

          <FormField
            label="Total Floors"
            name="floors"
            type="number"
            required
            value={libFloors}
            onChange={(e) => setLibFloors(Number(e.target.value))}
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditLibModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Library'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE AREA MODAL */}
      <Modal
        isOpen={createAreaModalOpen}
        onClose={() => setCreateAreaModalOpen(false)}
        title="Add New Area"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAreaSubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          <FormField
            label="Area Name"
            name="areaName"
            required
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="e.g. Main Entrance, Accessible Restroom"
          />

          <FormField
            label="Area Type"
            name="areaType"
            type="select"
            required
            value={areaType}
            onChange={(e) => setAreaType(e.target.value)}
            options={AREA_TYPES}
          />

          <FormField
            label="Floor Number"
            name="floor"
            type="number"
            required
            value={areaFloor}
            onChange={(e) => setAreaFloor(Number(e.target.value))}
            helpText="0 = Ground Floor, 1 = First Floor, etc."
          />

          <FormField
            label="Description (Optional)"
            name="description"
            type="textarea"
            value={areaDesc}
            onChange={(e) => setAreaDesc(e.target.value)}
            placeholder="Accessibility features, landmarks, or entry notes"
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCreateAreaModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Area'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT AREA MODAL */}
      <Modal
        isOpen={editAreaModalOpen}
        onClose={() => setEditAreaModalOpen(false)}
        title={`Edit Area: ${selectedArea?.name || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditAreaSubmit} className="space-y-4">
          {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}

          <FormField
            label="Area Name"
            name="editAreaName"
            required
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
          />

          <FormField
            label="Area Type"
            name="editAreaType"
            type="select"
            required
            value={areaType}
            onChange={(e) => setAreaType(e.target.value)}
            options={AREA_TYPES}
          />

          <FormField
            label="Floor Number"
            name="editFloor"
            type="number"
            required
            value={areaFloor}
            onChange={(e) => setAreaFloor(Number(e.target.value))}
          />

          <FormField
            label="Description"
            name="editDescription"
            type="textarea"
            value={areaDesc}
            onChange={(e) => setAreaDesc(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditAreaModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Area'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE AREA MODAL */}
      <Modal
        isOpen={deleteAreaModalOpen}
        onClose={() => setDeleteAreaModalOpen(false)}
        title="Delete Area"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text)]">
            Are you sure you want to delete <strong>{selectedArea?.name}</strong>?
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            This will permanently remove this area and any attached instructions or assessments.
          </p>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setDeleteAreaModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-[var(--color-text)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAreaConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[var(--color-danger)] text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] disabled:opacity-50"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Area'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
