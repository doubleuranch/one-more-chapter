import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserAvatar from './UserAvatar';

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);
const ShelfIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
  </svg>
);
const MyShelfIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4zm0 16V13.93l2.5-1.43 2.5 1.43V20H6zm12 0h-5v-6.07l2.5-1.43 2.5 1.43V20zm0-8h-5V4h5v8z" />
  </svg>
);
const SwapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
  </svg>
);
const EventsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
  </svg>
);
const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
  </svg>
);

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function NavItem({ to, icon, label, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative ${
          isActive ? 'text-terracotta-600' : 'text-earth-400 hover:text-earth-600'
        }`
      }
    >
      <div className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center bg-terracotta-500 text-white text-[9px] font-bold rounded-full px-0.5">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}

export default function Nav() {
  const navigate = useNavigate();
  const { currentUser, unreadCount } = useApp();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-earth-200 fixed left-0 top-0 h-full z-20">
        <div className="p-5 border-b border-earth-100">
          <h1 className="font-serif font-bold text-earth-800 text-lg leading-tight">
            One More<br />Chapter
          </h1>
          <p className="text-xs text-earth-400 mt-1 leading-snug">Discover your next favorite book through the people you trust most.</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { to: '/feed', icon: <HomeIcon />, label: 'Activity' },
            { to: '/search', icon: <SearchIcon />, label: 'Search' },
            { to: '/shelf', icon: <MyShelfIcon />, label: 'My Shelf' },
            { to: '/club', icon: <ShelfIcon />, label: 'Nominations' },
            { to: '/events', icon: <EventsIcon />, label: 'Meetings' },
            { to: '/swap', icon: <SwapIcon />, label: 'Borrow' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-terracotta-50 text-terracotta-600' : 'text-earth-500 hover:bg-earth-50 hover:text-earth-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* For You — bell badge links to Activity */}
          {unreadCount > 0 && (
            <NavLink
              to="/feed"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-terracotta-50 text-terracotta-600' : 'text-earth-500 hover:bg-earth-50 hover:text-earth-700'
                }`
              }
            >
              <div className="relative">
                <BellIcon />
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center bg-terracotta-500 text-white text-[9px] font-bold rounded-full px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
              <span>For You</span>
              <span className="ml-auto text-xs font-semibold bg-terracotta-100 text-terracotta-600 rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            </NavLink>
          )}
        </nav>
        {currentUser && (
          <div className="p-3 border-t border-earth-100">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-earth-50 transition-colors"
            >
              <UserAvatar initials={currentUser.avatarInitials} color={currentUser.avatarColor} src={currentUser.avatarUrl} size="sm" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-earth-800 truncate">{currentUser.displayName}</p>
                <p className="text-xs text-earth-400">@{currentUser.username}</p>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-earth-200 z-20 flex justify-around px-2 pb-safe">
        <NavItem to="/feed" icon={<HomeIcon />} label="Activity" />
        <NavItem to="/shelf" icon={<MyShelfIcon />} label="My Shelf" />
        <NavItem to="/club" icon={<ShelfIcon />} label="Nominate" />
        <NavItem to="/search" icon={<SearchIcon />} label="Search" />
        {currentUser && (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative ${isActive ? 'text-terracotta-600' : 'text-earth-400'}`
            }
          >
            <div className="relative">
              <UserAvatar initials={currentUser.avatarInitials} color={currentUser.avatarColor} src={currentUser.avatarUrl} size="xs" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-terracotta-500 rounded-full ring-1 ring-white" />
              )}
            </div>
            <span className="text-xs font-medium">Me</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}
