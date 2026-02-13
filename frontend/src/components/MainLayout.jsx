import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="relative">
        <Header title={title} subtitle={subtitle} />
        <main className="px-8 py-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
