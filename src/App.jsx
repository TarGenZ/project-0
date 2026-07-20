import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import CartDrawer from './components/plans/CartDrawer.jsx';

// Home loads eagerly (it's the landing page, needed immediately).
// Everything else is code-split so first-time visitors don't pay for
// dashboard/auth/legal-page code they may never touch — better Core Web
// Vitals, which factors into search ranking.
const Login = lazy(() => import('./auth/pages/Login.jsx'));
const Signup = lazy(() => import('./auth/pages/Signup.jsx'));
const ForgotPassword = lazy(() => import('./auth/pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./auth/pages/ResetPassword.jsx'));
const AuthCallback = lazy(() => import('./auth/pages/AuthCallback.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Plans = lazy(() => import('./pages/Plans.jsx'));
const FreeResources = lazy(() => import('./pages/FreeResources.jsx'));
const NeetMarksCalculator = lazy(() => import('./pages/tools/NeetMarksCalculator.jsx'));
const Privacy = lazy(() => import('./pages/legal/Privacy.jsx'));
const Terms = lazy(() => import('./pages/legal/Terms.jsx'));
const RefundPolicy = lazy(() => import('./pages/legal/RefundPolicy.jsx'));
const Contact = lazy(() => import('./pages/legal/Contact.jsx'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/plans" element={<Plans />} />
          <Route path="/free-resources" element={<FreeResources />} />
          <Route path="/tools/neet-marks-calculator" element={<NeetMarksCalculator />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </Suspense>
      <CartDrawer />
    </>
  );
}
