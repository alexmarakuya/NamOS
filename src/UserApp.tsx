import React from 'react';
import UserManagementPage from './components/UserManagementPage';

function UserApp() {
  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-x-auto">
        <div className="p-6">
          <UserManagementPage />
        </div>
      </div>
    </div>
  );
}

export default UserApp;
