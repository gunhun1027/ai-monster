// 整体布局组件 - 包含 Header 和内容区域
import { ReactNode } from 'react'
import Header from './Header'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      {/* 顶部导航栏 */}
      <Header />
      {/* 内容区域 */}
      <main className="app-main">{children}</main>
    </div>
  )
}
