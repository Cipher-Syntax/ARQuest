import { Save } from 'lucide-react'
import { Card, Toggle, Button, Input } from '../components/ui'
import { useState } from 'react'

export default function Settings() {
  const [toggles, setToggles] = useState({
    gps: true,
    qr: true,
    arSelfie: true,
    accreditation: false,
    trivia: true,
  })

  const set = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-500 mt-1">Configure and update system features and behaviors.</p>
      </div>

      <Card>
        <h3 className="text-sm font-bold text-gray-900 mb-5">Feature Toggles</h3>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">GPS Geofencing</p>
              <p className="text-xs text-gray-500 mt-0.5">Enable location-based building detection.</p>
            </div>
            <Toggle checked={toggles.gps} onChange={() => set('gps')} />
          </div>
          <div className="h-px bg-brand-border" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">QR Verification</p>
              <p className="text-xs text-gray-500 mt-0.5">Allow QR code scanning for building check-in.</p>
            </div>
            <Toggle checked={toggles.qr} onChange={() => set('qr')} />
          </div>
          <div className="h-px bg-brand-border" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">AR Selfie Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">Let students take AR-enhanced selfies on campus.</p>
            </div>
            <Toggle checked={toggles.arSelfie} onChange={() => set('arSelfie')} />
          </div>
          <div className="h-px bg-brand-border" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Accreditation Access</p>
              <p className="text-xs text-gray-500 mt-0.5">Show accreditation data within building pages.</p>
            </div>
            <Toggle checked={toggles.accreditation} onChange={() => set('accreditation')} />
          </div>
          <div className="h-px bg-brand-border" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Trivia System</p>
              <p className="text-xs text-gray-500 mt-0.5">Display trivia facts to students on building entry.</p>
            </div>
            <Toggle checked={toggles.trivia} onChange={() => set('trivia')} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2 px-8">
          <Save size={18} />
          Save Changes
        </Button>
      </div>
    </div>
  )
}