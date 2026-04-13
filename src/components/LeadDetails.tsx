"use client"

import { useEffect, useState } from 'react'
import { Button, Card, LoadingSpinner } from './ui'
import { formatDate } from '@/utils/date'

interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  status: string
  stage: string
  score: number
  priority: string
  isPublic: boolean
  assignedTo?: string
  notes: Note[]
  activities: Activity[]
  followUpDate?: string
  createdAt: string
  updatedAt: string
}

interface Note {
  id: string
  text: string
  userId: string
  user: { name: string }
  createdAt: string
}

interface Activity {
  id: string
  type: string
  detail: string
  createdAt: string
}

export function LeadDetails({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    fetchLead()
  }, [leadId])

  async function fetchLead() {
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      const data = await res.json()
      if (data.ok) {
        setLead(data.lead)
      } else {
        setError(data.message || 'Failed to load lead')
      }
    } catch (err) {
      setError('Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  async function addNote() {
    if (!newNote.trim()) return
    
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote })
      })
      
      if (res.ok) {
        setNewNote('')
        fetchLead()
      }
    } catch (err) {
      setError('Failed to add note')
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">{error}</div>
  if (!lead) return <div>Lead not found</div>

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-4">{lead.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p>{lead.email || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <p>{lead.phone || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <p className="capitalize">{lead.status}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Priority</label>
            <p className="capitalize">{lead.priority}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4">Notes</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <Button onClick={addNote}>Add Note</Button>
          </div>
          
          <div className="space-y-2">
            {lead.notes.map((note) => (
              <div key={note.id} className="border-b pb-2">
                <p>{note.text}</p>
                <p className="text-sm text-gray-500">
                  By {note.user.name} on {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4">Activity Timeline</h3>
        <div className="space-y-2">
          {lead.activities.map((activity) => (
            <div key={activity.id} className="flex gap-2 items-start">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div>
                <p className="capitalize">{activity.detail}</p>
                <p className="text-sm text-gray-500">
                  {formatDate(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}