import { describe, it, expect } from 'vitest'
import { ipToInt, parseCIDR, ipInCIDR, isValidIPv4, findBestCollectionForIP } from '../App.jsx'

describe('CIDR helpers', () => {
  it('converts IP to integer and back conceptually', () => {
    expect(ipToInt('0.0.0.0')).toBe(0)
    expect(ipToInt('255.255.255.255')).toBe(4294967295)
    expect(ipToInt('192.168.1.1')).toBeGreaterThan(0)
  })

  it('parses CIDR and identifies network/mask/prefix', () => {
    const p = parseCIDR('192.168.1.0/24')
    expect(p).toHaveProperty('network')
    expect(p).toHaveProperty('mask')
    expect(p.prefix).toBe(24)
  })

  it('identifies IPs inside CIDR ranges', () => {
    expect(ipInCIDR('192.168.1.5', '192.168.1.0/24')).toBe(true)
    expect(ipInCIDR('192.168.2.5', '192.168.1.0/24')).toBe(false)
  })

  it('validates IPv4 strings correctly', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true)
    expect(isValidIPv4('256.0.0.1')).toBe(false)
    expect(isValidIPv4('not.an.ip')).toBe(false)
    expect(isValidIPv4('')).toBe(false)
  })

  it('finds most-specific collection for an IP', () => {
    const collections = [
      { id: 1, name: 'net16', cidr: '192.168.0.0/16' },
      { id: 2, name: 'subnet', cidr: '192.168.1.0/24' },
      { id: 3, name: 'other', cidr: '10.0.0.0/8' }
    ]
    expect(findBestCollectionForIP('192.168.1.5', collections)).toBe(String(2))
    expect(findBestCollectionForIP('192.168.2.5', collections)).toBe(String(1))
    expect(findBestCollectionForIP('10.5.6.7', collections)).toBe(String(3))
    expect(findBestCollectionForIP('8.8.8.8', collections)).toBe(null)
  })
})
