import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Search from './pages/Search';
import BookDetail from './pages/BookDetail';
import Profile from './pages/Profile';
import ClubShelf from './pages/ClubShelf';
import Wrapped from './pages/Wrapped';
import Swap from './pages/Swap';
import Events from './pages/Events';
import MyShelf from './pages/MyShelf';
import Welcome from './pages/Welcome';

// While Supabase checks the session, show nothing (avoids flash to /login)
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center gap-3">
      <div className="text-3xl animate-pulse">📚</div>
      <p className="text-sm text-earth-400 font-medium">One More Chapter</p>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, initialized, needsProfileSetup } = useApp();
  if (!initialized) return <LoadingScreen />;
  if (needsProfileSetup) return <Navigate to="/welcome" replace />;
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { currentUser, initialized } = useApp();

  // Don't render routes at all until the session is resolved
  if (!initialized) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login"    element={currentUser ? <Navigate to="/feed" replace /> : <Login />} />
      <Route path="/welcome"  element={<Welcome />} />
      <Route path="/register/:inviteCode" element={<Register />} />
      <Route path="/feed"          element={<PrivateRoute><Feed /></PrivateRoute>} />
      <Route path="/search"        element={<PrivateRoute><Search /></PrivateRoute>} />
      <Route path="/book/:id"      element={<PrivateRoute><BookDetail /></PrivateRoute>} />
      <Route path="/profile"       element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/profile/:username" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/voting"        element={<Navigate to="/club" replace />} />
      <Route path="/club"          element={<PrivateRoute><ClubShelf /></PrivateRoute>} />
      <Route path="/wrapped"       element={<PrivateRoute><Wrapped /></PrivateRoute>} />
      <Route path="/swap"          element={<PrivateRoute><Swap /></PrivateRoute>} />
      <Route path="/events"        element={<PrivateRoute><Events /></PrivateRoute>} />
      <Route path="/notifications" element={<Navigate to="/feed" replace />} />
      <Route path="/shelf"         element={<PrivateRoute><MyShelf /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={currentUser ? '/feed' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
