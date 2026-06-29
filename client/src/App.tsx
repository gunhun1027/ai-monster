// App根组件 - 路由配置
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Home = lazy(() => import('./pages/Home'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const WrongAnswers = lazy(() => import('./pages/WrongAnswers'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Shop = lazy(() => import('./pages/Shop'))
const Challenges = lazy(() => import('./pages/Challenges'))
const StoryMap = lazy(() => import('./pages/StoryMap'))
const CardCollection = lazy(() => import('./pages/CardCollection'))
const StudyGroups = lazy(() => import('./pages/StudyGroups'))
const StudyGroupDetail = lazy(() => import('./pages/StudyGroupDetail'))

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loading-spinner"></div>
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  // 已登录用户 - 仪表盘等
  if (user) {
    const adminElement = user.role === 'admin' ? <Admin /> : <Navigate to="/dashboard" replace />

    return (
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/story" element={<StoryMap />} />
            <Route path="/cards" element={<CardCollection />} />
            <Route path="/groups" element={<StudyGroups />} />
            <Route path="/groups/:groupId" element={<StudyGroupDetail />} />
            <Route path="/wrong-answers" element={<WrongAnswers />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={adminElement} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    )
  }

  // 未登录用户 - 介绍页 + 登录
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
