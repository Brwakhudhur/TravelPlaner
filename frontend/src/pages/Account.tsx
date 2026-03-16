import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import api from '../services/api';

interface AccountProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

const Account: React.FC<AccountProps> = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadUserData();
  }, [isAuthenticated, navigate]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
      setFormData({
        displayName: response.data.user.displayName,
        email: response.data.user.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setError('');
    } catch (err: any) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password match if changing password
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setUpdating(true);

      const updateData: any = {
        displayName: formData.displayName,
        email: formData.email,
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      await api.put(`/auth/update-profile`, updateData);

      // Update localStorage
      const updatedUser = { ...user, displayName: formData.displayName, email: formData.email };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccess('Profile updated successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Log user out after 1.5 seconds so they can sign in with new credentials
      setTimeout(() => {
        onLogout();
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>Account Settings</h1>
      <p className="muted" style={{ marginBottom: '32px' }}>
        Update your profile information and password
      </p>

      {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}
      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Profile Information</h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              minLength={2}
              placeholder="Your display name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="your@email.com"
            />
          </div>

          <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

          <h2 style={{ marginBottom: '16px' }}>Change Password</h2>
          <p className="muted" style={{ marginBottom: '24px', fontSize: '14px' }}>
            Leave blank if you don't want to change your password
          </p>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              minLength={8}
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={updating}
          >
            {updating ? 'Updating...' : 'Save Changes'}
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => navigate('/search')}
            style={{ width: '100%', marginTop: '12px' }}
            disabled={updating}
          >
            Cancel
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '24px', backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>Account Information</h3>
        <p className="muted" style={{ fontSize: '14px', marginBottom: '8px' }}>
          <strong>User ID:</strong> {user?.id}
        </p>
        <p className="muted" style={{ fontSize: '14px', marginBottom: '8px' }}>
          <strong>Role:</strong> {user?.role}
        </p>
        <p className="muted" style={{ fontSize: '14px' }}>
          <strong>Member since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default Account;
