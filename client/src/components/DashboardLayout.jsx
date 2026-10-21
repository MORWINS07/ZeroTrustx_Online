import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import PageHeader from './PageHeader';

export default function DashboardLayout({ children, title, subtitle, actions, badge }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <TopNav />
        <main className="page-container">
          {(title || subtitle || actions) && (
            <PageHeader
              title={title}
              subtitle={subtitle}
              badge={badge}
              actions={actions}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
