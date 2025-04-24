import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import Registration from './components/Registration';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CompetitionsList from './components/CompetitionsList';
import CompetitionCreate from './components/CompetitionCreate';
import CompetitionDetails from './components/CompetitionDetails';
import ApplicationsManagement from './components/ApplicationsManagement';
import TeamsList from './components/TeamsList'; 
import TeamDetails from './components/TeamDetails';
import Profile from './components/Profile';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import CompetitionEdit from './components/CompetitionEdit';
import CompetitionResultsForm from './components/CompetitionResultsForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AdminPanel from './components/AdminPanel';

const PrivateRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    };
    
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );
    
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/competitions/:id/results" element={<CompetitionResultsForm />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        
        <Route path="/competitions" element={
          <PrivateRoute>
            <CompetitionsList />
          </PrivateRoute>
        } />
        
        <Route path="/competitions/create" element={
          <PrivateRoute>
            <CompetitionCreate />
          </PrivateRoute>
        } />
        
        <Route path="/competitions/:id" element={
          <PrivateRoute>
            <CompetitionDetails />
          </PrivateRoute>
        } />
        
        <Route path="/competitions/:id/applications" element={
          <PrivateRoute>
            <ApplicationsManagement />
          </PrivateRoute>
        } />
        
        <Route path="/teams" element={
          <PrivateRoute>
            <TeamsList />
          </PrivateRoute>
        } />
        
        <Route path="/teams/:id" element={
          <PrivateRoute>
            <TeamDetails />
          </PrivateRoute>
        } />
        
        <Route path="/profile" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } />
        
        <Route path="/competitions/:id/edit" element={
          <PrivateRoute>
            <CompetitionEdit />
          </PrivateRoute>
        } />
        
        <Route path="/analytics" element={
          <PrivateRoute>
            <AnalyticsDashboard />
          </PrivateRoute>
        } />
        
        <Route path="/admin-panel" element={
          <PrivateRoute>
            <AdminPanel />
          </PrivateRoute>
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-lg mb-6">Страница не найдена</p>
              <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                На главную
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default App;