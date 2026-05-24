import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users, UserCheck, Tag, Calendar, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Tab = 'statuses' | 'staff' | 'nonworkdays' | 'users'

interface Status { id: string; name: string; colour: string; sort_order: number; is_system: boolean }
interface Staff { id: string; name: string; email: string | null; type: 'internal' | 'freelancer'; active: boolean }
interface NonWorkDay { id: string; date: string; name: string; type: 'public_holiday' | 'company_holiday' }
interface AppUser { id: string; name: string; email: string }

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: '#ef4444' }}>Delete?</span>
      <button className="btn-ghost" onClick={onConfirm} title="Confirm">
        <Check size={14} style={{ color: '#ef4444' }} />
      </button>
      <button className="btn-ghost" onClick={onCancel} title="Cancel">
        <X size={14} style={{ color: '#6b7280' }} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('statuses')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your app configuration</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', borderBottom: '1px solid #e5e7eb' }}>
        {([
          { key: 'statuses', label: 'Task Statuses', icon: Tag },
          { key: 'staff', label: 'Staff', icon: UserCheck },
          { key: 'nonworkdays', label: 'Non-Work Days', icon: Calendar },
          { key: 'users', label: 'People with Access', icon: Users },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', fontSize: '14px', fontWeight: '500',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: activeTab === key ? '2px solid #ed1c24' : '2px solid transparent',
              color: activeTab === key ? '#ed1c24' : '#6b7280',
              marginBottom: '-1px', transition: 'all 0.15s'
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'statuses' && <StatusesTab />}
      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'nonworkdays' && <NonWorkDaysTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  )
}

// ── STATUSES ─────────────────────────────────────────────────
function StatusesTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState('#6b7280')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColour, setEditColour] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('statuses').select('*').order('sort_order')
      if (error) throw error
      return data as Status[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('statuses').insert({ name: newName.trim(), colour: newColour, sort_order: statuses.length })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['statuses'] }); setNewName(''); setNewColour('#6b7280'); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, colour }: { id: string; name: string; colour: string }) => {
      const { error } = await supabase.from('statuses').update({ name, colour }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['statuses'] }); setEditingId(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('statuses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['statuses'] }); setConfirmDelete(null) }
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = statuses.findIndex(s => s.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= statuses.length) return
      const a = statuses[idx]
      const b = statuses[swapIdx]
      await supabase.from('statuses').update({ sort_order: b.sort_order }).eq('id', a.id)
      await supabase.from('statuses').update({ sort_order: a.sort_order }).eq('id', b.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statuses'] })
  })

  const startEdit = (s: Status) => { setEditingId(s.id); setEditName(s.name); setEditColour(s.colour) }

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{statuses.length} statuses</p>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Status</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px' }}>
          <input autoFocus type="text" placeholder="Status name..." value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(); if (e.key === 'Escape') { setShowAdd(false); setNewName('') } }} />
          <input type="color" value={newColour} onChange={e => setNewColour(e.target.value)}
            style={{ width: '40px', height: '36px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate()} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {statuses.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: i < statuses.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
            
            {/* Reorder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button className="btn-ghost" style={{ padding: '1px 3px' }} onClick={() => reorderMutation.mutate({ id: s.id, direction: 'up' })} disabled={i === 0}><ChevronUp size={12} /></button>
              <button className="btn-ghost" style={{ padding: '1px 3px' }} onClick={() => reorderMutation.mutate({ id: s.id, direction: 'down' })} disabled={i === statuses.length - 1}><ChevronDown size={12} /></button>
            </div>

            {editingId === s.id ? (
  <>
    <input type="color" value={editColour} onChange={e => setEditColour(e.target.value)}
      style={{ width: '32px', height: '32px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
      onKeyDown={e => { if (e.key === 'Enter') updateMutation.mutate({ id: s.id, name: editName, colour: editColour }); if (e.key === 'Escape') setEditingId(null) }}
      style={{ flex: 1, fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }} />
    <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: s.id, name: editName, colour: editColour })}><Check size={14} style={{ color: '#10b981' }} /></button>
    <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
  </>
) : (
  <>
    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.colour, flexShrink: 0 }} />
    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', cursor: s.is_system ? 'default' : 'pointer' }}
      onClick={() => !s.is_system && startEdit(s)}>{s.name}</span>
    {s.is_system
      ? <span style={{ fontSize: '11px', color: '#9ca3af', padding: '2px 8px', background: '#f3f4f6', borderRadius: '20px' }}>System</span>
      : <>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>click to edit</span>
          {confirmDelete === s.id
            ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(s.id)} onCancel={() => setConfirmDelete(null)} />
            : <button className="btn-ghost" onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
          }
        </>
    }
  </>
)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── STAFF ────────────────────────────────────────────────────
function StaffTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newType, setNewType] = useState<'internal' | 'freelancer'>('internal')
  const [filter, setFilter] = useState<'all' | 'internal' | 'freelancer'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editType, setEditType] = useState<'internal' | 'freelancer'>('internal')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').order('name')
      if (error) throw error
      return data as Staff[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('staff').insert({ name: newName.trim(), email: newEmail.trim() || null, type: newType, active: true })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setNewName(''); setNewEmail(''); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, email, type }: { id: string; name: string; email: string; type: string }) => {
      const { error } = await supabase.from('staff').update({ name, email: email || null, type }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setEditingId(null) }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('staff').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setConfirmDelete(null) }
  })

  const startEdit = (s: Staff) => { setEditingId(s.id); setEditName(s.name); setEditEmail(s.email || ''); setEditType(s.type) }
  const filtered = staff.filter(s => filter === 'all' || s.type === filter)

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'internal', 'freelancer'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', fontSize: '13px', fontWeight: '500', borderRadius: '20px',
              border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: filter === f ? '#ed1c24' : 'white',
              borderColor: filter === f ? '#ed1c24' : '#e5e7eb',
              color: filter === f ? 'white' : '#6b7280'
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Staff</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <input autoFocus type="text" placeholder="Full name..." value={newName} onChange={e => setNewName(e.target.value)} style={{ minWidth: '150px' }} />
          <input type="email" placeholder="Email (optional)..." value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ minWidth: '150px' }} />
          <select value={newType} onChange={e => setNewType(e.target.value as 'internal' | 'freelancer')}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}>
            <option value="internal">Internal</option>
            <option value="freelancer">Freelancer</option>
          </select>
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate()} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {filtered.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No staff found</div>
          : filtered.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', opacity: s.active ? 1 : 0.5 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: s.type === 'internal' ? '#dbeafe' : '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: s.type === 'internal' ? '#1d4ed8' : '#be185d' }}>
                {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>

              {editingId === s.id ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    style={{ fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '120px' }} />
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '150px' }} />
                  <select value={editType} onChange={e => setEditType(e.target.value as 'internal' | 'freelancer')}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="internal">Internal</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                  <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: s.id, name: editName, email: editEmail, type: editType })}><Check size={14} style={{ color: '#10b981' }} /></button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => startEdit(s)}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{s.name}</div>
                    {s.email && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.email}</div>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 10px', borderRadius: '20px', background: s.type === 'internal' ? '#dbeafe' : '#fce7f3', color: s.type === 'internal' ? '#1d4ed8' : '#be185d' }}>{s.type}</span>
                  <button className="btn-ghost" onClick={() => toggleActiveMutation.mutate({ id: s.id, active: !s.active })} style={{ fontSize: '12px', color: s.active ? '#10b981' : '#9ca3af' }}>{s.active ? 'Active' : 'Inactive'}</button>
                  {confirmDelete === s.id
                    ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(s.id)} onCancel={() => setConfirmDelete(null)} />
                    : <button className="btn-ghost" onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  }
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ── NON-WORK DAYS ────────────────────────────────────────────
function NonWorkDaysTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'public_holiday' | 'company_holiday'>('public_holiday')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'public_holiday' | 'company_holiday'>('public_holiday')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: days = [] } = useQuery({
    queryKey: ['non_work_days'],
    queryFn: async () => {
      const { data, error } = await supabase.from('non_work_days').select('*').order('date')
      if (error) throw error
      return data as NonWorkDay[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('non_work_days').insert({ date: newDate, name: newName.trim(), type: newType })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['non_work_days'] }); setNewDate(''); setNewName(''); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, type }: { id: string; name: string; type: string }) => {
      const { error } = await supabase.from('non_work_days').update({ name, type }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['non_work_days'] }); setEditingId(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('non_work_days').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['non_work_days'] }); setConfirmDelete(null) }
  })

  const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{days.length} non-work days</p>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Day</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }} />
          <input autoFocus type="text" placeholder="e.g. Christmas Day..." value={newName} onChange={e => setNewName(e.target.value)} style={{ minWidth: '200px' }} />
          <select value={newType} onChange={e => setNewType(e.target.value as 'public_holiday' | 'company_holiday')}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}>
            <option value="public_holiday">Public Holiday</option>
            <option value="company_holiday">Company Holiday</option>
          </select>
          <button className="btn-primary" onClick={() => newDate && newName.trim() && addMutation.mutate()} disabled={!newDate || !newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewDate('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {days.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No non-work days added yet</div>
          : days.map((day, i) => (
            <div key={day.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < days.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              {editingId === day.id ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    style={{ fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '180px' }} />
                  <select value={editType} onChange={e => setEditType(e.target.value as 'public_holiday' | 'company_holiday')}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="public_holiday">Public Holiday</option>
                    <option value="company_holiday">Company Holiday</option>
                  </select>
                  <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: day.id, name: editName, type: editType })}><Check size={14} style={{ color: '#10b981' }} /></button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setEditingId(day.id); setEditName(day.name); setEditType(day.type) }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{day.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(day.date)}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 10px', borderRadius: '20px', background: day.type === 'public_holiday' ? '#fef3c7' : '#dbeafe', color: day.type === 'public_holiday' ? '#92400e' : '#1d4ed8' }}>
                    {day.type === 'public_holiday' ? 'Public Holiday' : 'Company Holiday'}
                  </span>
                  {confirmDelete === day.id
                    ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(day.id)} onCancel={() => setConfirmDelete(null)} />
                    : <button className="btn-ghost" onClick={() => setConfirmDelete(day.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  }
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ── USERS ────────────────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: users = [] } = useQuery({
    queryKey: ['app_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_users').select('*').order('name')
      if (error) throw error
      return data as AppUser[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('app_users').insert({ name: newName.trim(), email: newEmail.trim() })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app_users'] }); setNewName(''); setNewEmail(''); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, email }: { id: string; name: string; email: string }) => {
      const { error } = await supabase.from('app_users').update({ name, email }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app_users'] }); setEditingId(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_users').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app_users'] }); setConfirmDelete(null) }
  })

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{users.length} users</p>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add User</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px' }}>
          <input autoFocus type="text" placeholder="Full name..." value={newName} onChange={e => setNewName(e.target.value)} />
          <input type="email" placeholder="Email address..." value={newEmail} onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim() && newEmail.trim()) addMutation.mutate(); if (e.key === 'Escape') { setShowAdd(false); setNewName(''); setNewEmail('') } }} />
          <button className="btn-primary" onClick={() => newName.trim() && newEmail.trim() && addMutation.mutate()} disabled={!newName.trim() || !newEmail.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewEmail('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {users.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No users added yet</div>
          : users.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: 'white' }}>
                {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>

              {editingId === u.id ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    style={{ fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '130px' }} />
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '180px' }} />
                  <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: u.id, name: editName, email: editEmail })}><Check size={14} style={{ color: '#10b981' }} /></button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setEditingId(u.id); setEditName(u.name); setEditEmail(u.email) }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{u.email}</div>
                  </div>
                  {confirmDelete === u.id
                    ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(u.id)} onCancel={() => setConfirmDelete(null)} />
                    : <button className="btn-ghost" onClick={() => setConfirmDelete(u.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  }
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}