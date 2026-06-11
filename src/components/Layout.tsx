import { useLocation } from 'react-router-dom';
import Nav from './Nav';

interface Props {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
  noPadding?: boolean;
}

export default function Layout({ children, title, headerRight, noPadding }: Props) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-earth-50">
      <Nav />
      <div className="md:pl-56">
        {title && (
          <header className="bg-white border-b border-earth-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <h2 className="font-serif font-bold text-earth-800 text-xl">{title}</h2>
            {headerRight && <div>{headerRight}</div>}
          </header>
        )}
        <main
          key={pathname}
          className={`page-enter ${noPadding ? 'pb-20 md:pb-0' : 'px-4 md:px-6 py-6 pb-24 md:pb-6 max-w-2xl mx-auto md:mx-0'}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
