import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CategoryProvider } from './context/CategoryContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import WorkflowManagement from './pages/WorkflowManagement';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowEditor from './pages/WorkflowEditor';
import VersionCompare from './pages/VersionCompare';
import AgentList from './pages/AgentList';
import AgentDetail from './pages/AgentDetail';
import DataSourceList from './pages/DataSourceList';
import DataSourceDetail from './pages/DataSourceDetail';
import InstanceDetail from './pages/InstanceDetail';
import Settings from './pages/Settings';

function ProtectedRoutes() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WorkflowManagement />} />
        <Route path="/workflows/:id" element={<WorkflowDetail />} />
        <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
        <Route path="/workflows/:id/versions" element={<VersionCompare />} />
        <Route path="/workflows/new" element={<WorkflowEditor />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/datasources" element={<DataSourceList />} />
        <Route path="/datasources/:id" element={<DataSourceDetail />} />
        <Route path="/instances/:id" element={<InstanceDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CategoryProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </CategoryProvider>
    </AuthProvider>
  );
}

export default App;
