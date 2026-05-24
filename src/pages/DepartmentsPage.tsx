import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, FolderOpen, Archive, MoreVertical, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Department {
  id: string
  name: string
  archived: boolean
  sort_order: number
  created_at: string
}

export default function DepartmentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('sort_order', { ascending: true })
      if (error) throw error
      return data as Department[]
    }
  })

  const { data: projectCounts = {} } = useQuery({
    queryKey: ['project-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('department_id').eq('archived', false)
      if (error) throw error
      const counts: Record<string, number> = {}
      data.forEach((p: { department_id: string }) => { counts[p.department_id] = (counts[p.department_id] || 0) + 1 })
      return counts
    }
  })

  const { data: deptWarnings = [] } = useQuery({
    queryKey: ['dept-warnings'],
    queryFn: async () => {
      if (departments.length === 0) return []
      const deptIds = departments.map(d => d.id)
      const { data: projs } = await supabase.from('projects').select('id, department_id, planned_start_date, planned_end_date').in('department_id', deptIds)
      if (!projs?.length) return []
      const projIds = projs.map(p => p.id)
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projIds)
      if (!comps?.length) return []
      const compIds = comps.map(c => c.id)
      const { data: issuesList } = await supabase.from('issues').select('id, component_id').in('component_id', compIds)
      if (!issuesList?.length) return []
      const issueIds = issuesList.map(i => i.id)
      const { data: fields } = await supabase.from('issue_fields').select('issue_id, start_date, end_date').in('issue_id', issueIds)
      if (!fields?.length) return []
      const compToProject: Record<string, string> = {}
      comps.forEach(c => { compToProject[c.id] = c.project_id })
      const issueToProject: Record<string, string> = {}
      issuesList.forEach(i => { issueToProject[i.id] = compToProject[i.component_id] })
      const warningDeptIds = new Set<string>()
      fields.forEach(f => {
        const proj = projs.find(p => p.id === issueToProject[f.issue_id])
        if (!proj) return
        if (proj.planned_start_date && f.start_date && f.start_date < proj.planned_start_date) warningDeptIds.add(proj.department_id)
        if (proj.planned_end_date && f.end_date && f.end_date > proj.planned_end_date) warningDeptIds.add(proj.department_id)
      })
      return Array.from(warningDeptIds)
    },
    enabled: departments.length > 0
  })

  const { data: deptProgress = {} } = useQuery({
    queryKey: ['dept-progress'],
    queryFn: async () => {
      if (departments.length === 0) return {}
      const deptIds = departments.map(d => d.id)
      const { data: projs } = await supabase.from('projects').select('id, department_id').in('department_id', deptIds).eq('archived', false)
      if (!projs?.length) return {}
      const projIds = projs.map(p => p.id)
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projIds)
      if (!comps?.length) return {}
      const compIds = comps.map(c => c.id)
      const { data: issuesList } = await supabase.from('issues').select('id, component_id').in('component_id', compIds)
      if (!issuesList?.length) return {}
      const issueIds = issuesList.map(i => i.id)
      const { data: fields } = await supabase.from('issue_fields').select('issue_id, status_id').in('issue_id', issueIds)
      if (!fields?.length) return {}
      const { data: completeStatus } = await supabase.from('statuses').select('id').eq('name', 'Complete').single()
      if (!completeStatus) return {}
  
      const compToProject: Record<string, string> = {}
      comps.forEach(c => { compToProject[c.id] = c.project_id })
      const issueToComp: Record<string, string> = {}
      issuesList.forEach(i => { issueToComp[i.id] = i.component_id })
      const projToDept: Record<string, string> = {}
      projs.forEach(p => { projToDept[p.id] = p.department_id })
  
      const issueProgress: Record<string, number> = {}
      const issueFieldMap: Record<string, { total: number; complete: number }> = {}
      fields.forEach(f => {
        if (!issueFieldMap[f.issue_id]) issueFieldMap[f.issue_id] = { total: 0, complete: 0 }
        issueFieldMap[f.issue_id].total++
        if (f.status_id === completeStatus.id) issueFieldMap[f.issue_id].complete++
      })
      Object.entries(issueFieldMap).forEach(([issueId, { total, complete }]) => {
        issueProgress[issueId] = total > 0 ? Math.round((complete / total) * 100) : 0
      })
  
      const compProgress: Record<string, number> = {}
      comps.forEach(c => {
        const compIssues = issuesList.filter(i => i.component_id === c.id)
        if (compIssues.length === 0) { compProgress[c.id] = 0; return }
        compProgress[c.id] = Math.round(compIssues.reduce((sum, i) => sum + (issueProgress[i.id] || 0), 0) / compIssues.length)
      })
  
      const projProgress: Record<string, number> = {}
      projs.forEach(p => {
        const projComps = comps.filter(c => c.project_id === p.id)
        if (projComps.length === 0) { projProgress[p.id] = 0; return }
        projProgress[p.id] = Math.round(projComps.reduce((sum, c) => sum + (compProgress[c.id] || 0), 0) / projComps.length)
      })
  
      const deptProgressMap: Record<string, number> = {}
      deptIds.forEach(deptId => {
        const deptProjs = projs.filter(p => p.department_id === deptId)
        if (deptProjs.length === 0) { deptProgressMap[deptId] = 0; return }
        deptProgressMap[deptId] = Math.round(deptProjs.reduce((sum, p) => sum + (projProgress[p.id] || 0), 0) / deptProjs.length)
      })
      return deptProgressMap
    },
    enabled: departments.length > 0
  })

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('departments').insert({ name, sort_order: departments.length })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setNewName(''); setShowAdd(false)
    }
  })

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from('departments').update({ archived }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setMenuOpen(null)
    }
  })

  const active = departments.filter(d => !d.archived)
  const archived = departments.filter(d => d.archived)

  if (isLoading) {
    return <div className="spinner-wrap"><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">{active.length} active department{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="add-form" style={{ marginBottom: '24px' }}>
          <input autoFocus type="text" placeholder="Department name..." value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName.trim())
              if (e.key === 'Escape') { setShowAdd(false); setNewName('') }
            }} />
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate(newName.trim())} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      {/* Active Departments */}
      {active.length === 0 && !showAdd ? (
        <div className="empty-state">
          <Building2 size={32} style={{ color: '#d1d5db', margin: '0 auto' }} />
          <p>No departments yet</p>
          <span>Add your first department to get started</span>
        </div>
      ) : (
        <div className="cards-grid" style={{ marginBottom: '32px' }}>
          {active.map(dept => (
            <div key={dept.id} className="dept-card" onClick={() => navigate(`/departments/${dept.id}`)}>
              <button className="btn-ghost card-menu-btn"
                onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === dept.id ? null : dept.id) }}>
                <MoreVertical size={16} />
              </button>

              {menuOpen === dept.id && (
                <div className="dropdown">
                  <button className="dropdown-item"
                    onClick={e => { e.stopPropagation(); archiveMutation.mutate({ id: dept.id, archived: true }) }}>
                    <Archive size={14} /> Archive
                  </button>
                </div>
              )}

              <div className="dept-card-header">
                <div className="dept-icon"><Building2 size={18} /></div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="dept-name">{dept.name}</div>
                    {deptWarnings.includes(dept.id) && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
                  </div>
                  <div className="dept-meta">{projectCounts[dept.id] || 0} project{(projectCounts[dept.id] || 0) !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <div className="progress-wrap">
  <div className="progress-label">
    <span>Progress</span>
    <span>{deptProgress[dept.id] || 0}%</span>
  </div>
  <div className="progress-track">
    <div className="progress-bar" style={{ width: `${deptProgress[dept.id] || 0}%` }} />
  </div>
</div>

              <div className="dept-card-footer">
                <FolderOpen size={12} />
                <span>Click to view projects</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div>
          <p className="section-label">Archived</p>
          <div className="cards-grid">
            {archived.map(dept => (
              <div key={dept.id} className="dept-card archived">
                <button className="btn-ghost card-menu-btn"
                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === dept.id ? null : dept.id) }}>
                  <MoreVertical size={16} />
                </button>
                {menuOpen === dept.id && (
                  <div className="dropdown">
                    <button className="dropdown-item" onClick={() => archiveMutation.mutate({ id: dept.id, archived: false })}>
                      <Archive size={14} /> Unarchive
                    </button>
                  </div>
                )}
                <div className="dept-card-header">
                  <div className="dept-icon" style={{ background: '#e5e7eb' }}>
                    <Building2 size={18} style={{ color: '#9ca3af' }} />
                  </div>
                  <div>
                    <div className="dept-name" style={{ color: '#9ca3af' }}>{dept.name}</div>
                    <div className="dept-meta">Archived</div>
                  </div>
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