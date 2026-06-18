import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import Header from '../components/common/Header'
import { theme } from '../theme'

const DashboardLayout = () => {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.colors.background
      }}
    >
      <Sidebar />
      <div
        style={{
          marginLeft: '240px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            padding: theme.spacing.lg
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
