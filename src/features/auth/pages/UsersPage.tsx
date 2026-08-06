import { useState, useEffect } from 'react'
import { listUsers, createUser, updateUser, deleteUser, UserRecord } from '../api/auth.api'
import { useAuth } from '../../../contexts/AuthContext'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [form, setForm] = useState({ email: '', password: '', role: 'member' as 'member' | 'org_admin', first_name: '', last_name: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listUsers().then(setUsers).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const u = await createUser(form)
      setUsers(prev => [u, ...prev])
      setShowCreate(false)
      setForm({ email: '', password: '', role: 'member', first_name: '', last_name: '' })
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(u: UserRecord, role: 'org_admin' | 'member') {
    try {
      const updated = await updateUser(u.user_id, { role })
      setUsers(prev => prev.map(x => x.user_id === u.user_id ? updated : x))
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleToggleActive(u: UserRecord) {
    try {
      const updated = await updateUser(u.user_id, { is_active: !u.is_active })
      setUsers(prev => prev.map(x => x.user_id === u.user_id ? updated : x))
    } catch (err: any) {
      alert(err.message)
    }
  }

  function handleDelete(u: UserRecord) { setDeleteTarget(u) }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteUser(deleteTarget.user_id)
      setUsers(prev => prev.filter(x => x.user_id !== deleteTarget.user_id))
      setDeleteTarget(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const roleColor = (role: string) => role === 'super_admin' ? '#a78bfa' : role === 'org_admin' ? 'var(--blue)' : 'rgba(255,255,255,0.45)'
  const inp: React.CSSProperties = {
    padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text-main)' }}>Team Members</h1>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>
            Manage users in your organization
          </div>
        </div>
        {(currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin') && (
          <button onClick={() => setShowCreate(!showCreate)} style={{
            padding: '9px 18px', background: 'var(--blue)', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            + Invite User
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>Invite a new team member</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="First name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            <input style={{ ...inp, flex: 1 }} placeholder="Last name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <input style={inp} type="email" placeholder="Email address" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input style={inp} type="password" placeholder="Temporary password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <select style={inp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
            <option value="member">Member</option>
            <option value="org_admin">Org Admin</option>
          </select>
          {formError && <div style={{ color: '#f87171', fontSize: 12 }}>{formError}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ padding: '8px 18px', background: 'var(--blue)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Adding...' : 'Add User'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-sub)', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* User list */}
      {loading ? (
        <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '14px 18px',
              opacity: u.is_active ? 1 : 0.5,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'rgba(29,95,250,0.15)',
                border: '1px solid rgba(29,95,250,0.3)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 600, fontSize: 13, color: 'var(--blue)', flexShrink: 0,
              }}>
                {(u.first_name?.[0] || u.email[0]).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-main)' }}>
                  {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.email}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 1 }}>{u.email}</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                background: 'rgba(255,255,255,0.06)', color: roleColor(u.role),
                border: `1px solid ${roleColor(u.role)}40`,
              }}>
                {u.role.replace('_', ' ')}
              </span>
              {u.user_id !== currentUser?.user_id && (currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin') && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={u.role === 'super_admin' ? 'super_admin' : u.role}
                    disabled={u.role === 'super_admin'}
                    onChange={e => handleRoleChange(u, e.target.value as any)}
                    style={{ ...inp, fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="member">Member</option>
                    <option value="org_admin">Org Admin</option>
                    {u.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                  </select>
                  <button onClick={() => handleToggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'none', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer',
                  }}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(u)} title="Remove user" style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)',
                    background: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer',
                  }}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <div style={{ color: 'var(--text-sub)', fontSize: 14, textAlign: 'center', padding: 40 }}>
              No team members yet. Invite someone to get started.
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Remove ${deleteTarget.email} from the organization? They will lose access immediately.`}
          confirmLabel="Remove User"
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
