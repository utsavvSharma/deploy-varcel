"use client"

import { useEffect, useState } from 'react'
import { Card } from './ui'

interface Metrics {
  totalLeads: number
  freshLeads: number
  oldLeads: number
  convertedLeads: number
  publicLeads: number
  leadsByStatus: {
    new: number
    contacted: number
    interested: number
    converted: number
  }
  leadsByPriority: {
    low: number
    medium: number
    high: number
  }
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/metrics')
      const data = await res.json()
      if (data.ok) {
        setMetrics(data.metrics)
      }
    } catch (err) {
      console.error('Failed to load metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading metrics...</div>
  if (!metrics) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Leads"
        value={metrics.totalLeads}
        description="Total number of leads"
      />
      <MetricCard
        title="Fresh Leads"
        value={metrics.freshLeads}
        description="Leads less than 6 months old"
      />
      <MetricCard
        title="Old Leads"
        value={metrics.oldLeads}
        description="Leads more than 6 months old"
      />
      <MetricCard
        title="Converted"
        value={metrics.convertedLeads}
        description="Successfully converted leads"
      />
      
      <div className="md:col-span-2">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Lead Status Distribution</h3>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(metrics.leadsByStatus).map(([status, count]) => (
              <div key={status}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-500 capitalize">{status}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Lead Priority</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(metrics.leadsByPriority).map(([priority, count]) => (
              <div key={priority}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-500 capitalize">{priority}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="text-3xl font-bold mt-2">{value}</div>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Card>
  )
}