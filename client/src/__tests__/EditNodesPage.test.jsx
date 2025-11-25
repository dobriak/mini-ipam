import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, vi, expect } from 'vitest'
import EditNodesPage from '../pages/EditNodesPage.jsx'

describe('EditNodesPage wiring', () => {
  it('renders inputs and calls onBlur handler for IP input', () => {
    const handleIPBlur = vi.fn()
    const handleChange = vi.fn()
    const handleSubmit = vi.fn((e) => e.preventDefault())

    const collections = [ { id: 1, name: 'office', cidr: '192.168.1.0/24' } ]
    const nodes = []
    const formData = { ip_address: '', port: '', collection_id: '', name: '', notes: '' }

    render(<EditNodesPage
      editingId={null}
      formData={formData}
      handleChange={handleChange}
      handleIPBlur={handleIPBlur}
      handleSubmit={handleSubmit}
      collections={collections}
      nodes={nodes}
      handleEdit={() => {}}
      handleDelete={() => {}}
      handleCancel={() => {}}
    />)

    const ipInput = screen.getByPlaceholderText(/IP Address/i)
    expect(ipInput).toBeInTheDocument()

    // blur should call provided handler
    fireEvent.blur(ipInput)
    expect(handleIPBlur).toHaveBeenCalled()

    // collections rendering
    const option = screen.getByText(/office \(192.168.1.0\/24\)/i)
    expect(option).toBeInTheDocument()
  })
})
