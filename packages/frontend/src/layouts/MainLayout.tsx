import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import templateLogo from '/template-logo.png';
import { useAuth } from '../contexts/AuthContext';
import { isEmbedded } from '../core/DiscordSDK';

const getNavLinkClassName = ({ isActive, isPending }: { isActive: boolean, isPending: boolean }) => {
  const className = "flex items-center justify-center flex-grow hover:bg-gray-700 transition-colors duration-100 w-full border-b border-gray-700";
  return (isActive)
    ? className + " bg-gray-800 hover:bg-gray-800 transition-colors duration-100 w-full border-b border-gray-700"
    : className;
};

function MainLayout() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div className={`text-slate-200 h-screen flex flex-col ${(isLoading) ? "cursor-wait" : ""}` }>
      <header className="w-full flex">
        {/* Logo */}
        <Link to={'/'}>
          <img src={templateLogo} className="logo h-28 m-auto p-6" alt="Logo" />
        </Link>

        {/* Login / Register / Profile */}
        <div className="p-8 flex-end ml-auto my-auto">
          AUTH IS DISABLED
        </div>
        <div className="ml-auto p-8 flex-end my-auto hidden">
          {(isEmbedded)
            ? user?.name || "Loading..."
            : (isLoading)
              ? "Loading..."
              : (user)
                ? <>
                    <Link to={'/profile'} className="underline">{user.name || user.email || "Anonymous"}</Link> (<Link to={'/'} onClick={logout} className="text-yellow-500">Logout</Link>)
                  </>
                : <>
                    <Link to={'/sign-in'}>Sign in</Link> | <Link to={'/create-account'}>Create account</Link>
                  </>}
        </div>
      </header>

      <main className="flex flex-grow overflow-hidden">
        <div className="flex w-48 border-t border-gray-700">
          <nav className="flex flex-col h-full flex-grow justify-between items-center">
            <NavLink className={getNavLinkClassName} to={'/page1'}>Page 1</NavLink>
            <NavLink className={getNavLinkClassName} to={'/leaderboard'}>Leaderboard</NavLink>
            <NavLink className={getNavLinkClassName} to={'/'}>Play</NavLink>
            <NavLink className={getNavLinkClassName} to={'/settings'}>Settings</NavLink>
            <NavLink className={getNavLinkClassName} to={'/credits'}>Credits</NavLink>
          </nav>
        </div>

        <section className="flex-grow bg-gray-800 p-8 w-full h-full overflow-auto">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

export default MainLayout