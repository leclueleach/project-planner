import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ArrowLeft, FolderOpen, Archive, MoreVertical, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Department { id: string; name: string; archived: boolean }
interface Project {
  id: string
  department_id: string
  name: string
  planned_start_date: string | null
  planned_end_date: string | null
  archived: boolean
  sort_order: number
}

function ConfirmAction({ label = 'Confirm?', onConfirm, onCancel }: { label?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: '#ef4444' }}>{label}</span>
      <button className="btn-ghost" onClick={onConfirm}>✓</button>
      <button className="btn-ghost" onClick={onCancel}>✕</button>
    </div>
  )
}

export default function DepartmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)

  const { data: department } = useQuery({
    queryKey: ['department', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('id', id).single()
      if (error) throw error
      return data as Department
    }
  })

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('department_id', id).order('sort_order')
      if (error) throw error
      return data as Project[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('projects').insert({
        name,
        department_id: id,
        sort_order: projects.length,
        archived: false,
        planned_start_date: newStartDate || null,
        planned_end_date: newEndDate || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      setNewName(''); setNewStartDate(''); setNewEndDate(''); setShowAdd(false)
    }
  })

  const archiveMutation = useMutation({
    mutationFn: async ({ projectId, archived }: { projectId: string; archived: boolean }) => {
      const { error } = await supabase.from('projects').update({ archived }).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      setConfirmArchive(null)
      setMenuOpen(null)
    }
  })

  const active = projects.filter(p => !p.archived)
  const archived = projects.filter(p => p.archived)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (isLoading) {
    return <div className="spinner-wrap"><div className="spinner" /></div>
  }

  const headerCols = '2fr 110px 110px 110px 110px 150px 44px'

  return (
    <div>
      <button className="btn-ghost" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>
        <ArrowLeft size={16} /> Back to Departments
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{department?.name}</h1>
          <p className="page-subtitle">{active.length} active project{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Project
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="add-form" style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
          <input
            autoFocus type="text" placeholder="Project name..."
            value={newName} onChange={e => setNewName(e.target.value)}
            style={{ minWidth: '200px' }}
            onKeyDown={e => { if (e.key === 'Escape') { setShowAdd(false); setNewName('') } }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Planned Start</label>
            <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Planned End</label>
            <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate(newName.trim())} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewStartDate(''); setNewEndDate('') }}>Cancel</button>
        </div>
      )}

      {/* Active Projects */}
      {active.length === 0 && !showAdd ? (
        <div className="empty-state">
          <FolderOpen size={32} style={{ color: '#d1d5db', margin: '0 auto' }} />
          <p>No projects yet</p>
          <span>Add your first project to get started</span>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'visible', marginBottom: '32px' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Project', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>

          {active.map((project, i) => (
            <div
              key={project.id}
              style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '14px 20px', borderBottom: i < active.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
              onClick={() => navigate(`/projects/${project.id}`)}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight size={14} style={{ color: '#9ca3af' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c2c2b' }}>{project.name}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_start_date)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_end_date)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>—</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>—</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', borderRadius: '999px', width: '0%' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#2c2c2b', minWidth: '32px', textAlign: 'right' }}>0%</span>
              </div>

              {/* Menu */}
              <div style={{ position: 'relative', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                <button className="btn-ghost" onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}>
                  <MoreVertical size={15} />
                </button>
                {menuOpen === project.id && (
                  <div className="dropdown" style={{ right: 0, left: 'auto', zIndex: 20 }}>
                    {confirmArchive === project.id ? (
                      <div style={{ padding: '8px 12px' }}>
                        <ConfirmAction
                          label="Archive?"
                          onConfirm={() => archiveMutation.mutate({ projectId: project.id, archived: true })}
                          onCancel={() => setConfirmArchive(null)}
                        />
                      </div>
                    ) : (
                      <button className="dropdown-item" onClick={() => setConfirmArchive(project.id)}>
                        <Archive size={14} /> Archive
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived Projects */}
      {archived.length > 0 && (
        <div>
          <p className="section-label">Archived Projects</p>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            {archived.map((project, i) => (
              <div key={project.id} style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '14px 20px', borderBottom: i < archived.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', opacity: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChevronRight size={14} style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>{project.name}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_start_date)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_end_date)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>—</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>—</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Archived</div>
                <div style={{ position: 'relative', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                  <button className="btn-ghost" onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}>
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === project.id && (
                    <div className="dropdown" style={{ right: 0, left: 'auto', zIndex: 20 }}>
                      <button className="dropdown-item" onClick={() => archiveMutation.mutate({ projectId: project.id, archived: false })}>
                        <Archive size={14} /> Unarchive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(null)} />}
    </div>
  )
}