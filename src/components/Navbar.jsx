import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';

  const linkClass = onHome
    ? 'text-white/70 hover:text-white'
    : 'text-neutral-500 hover:text-neutral-900';

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 px-8 md:px-16 py-6 flex items-center justify-between">
      <div className={`absolute inset-0 transition-colors ${onHome ? '' : 'bg-[#F2F0ED]/90 backdrop-blur-sm border-b border-neutral-900/5'}`} />
      <div className="relative hidden md:block w-32" />

      <ul className="relative flex items-center gap-8 md:gap-12">
        <li>
          <a href="/#our-mission" className={`text-[11px] font-bold tracking-widest uppercase transition-colors ${linkClass}`}>
            Our Mission
          </a>
        </li>
        <li>
          <Link to="/tools" className={`text-[11px] font-bold tracking-widest uppercase transition-colors ${linkClass}`}>
            Tools
          </Link>
        </li>
        <li className="relative group">
          <span className={`text-[11px] font-bold tracking-widest uppercase cursor-pointer py-6 transition-colors ${linkClass}`}>
            Resources
          </span>
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 w-48 bg-[#1A1A1A] border border-neutral-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-2xl z-50">
            <div className="flex flex-col py-2 text-center">
              <a href="#" className="px-6 py-3 text-white text-[10px] tracking-widest uppercase hover:bg-neutral-800 transition-colors font-bold">Research</a>
              <a href="#" className="px-6 py-3 text-white text-[10px] tracking-widest uppercase hover:bg-neutral-800 transition-colors font-bold">Testimonials</a>
              <a href="#" className="px-6 py-3 text-white text-[10px] tracking-widest uppercase hover:bg-neutral-800 transition-colors font-bold">FAQ</a>
            </div>
          </div>
        </li>
        <li>
          <a href="/#about-us" className={`text-[11px] font-bold tracking-widest uppercase transition-colors ${linkClass}`}>
            About Us
          </a>
        </li>
      </ul>

      <div className="relative hidden md:block w-32" />
    </nav>
  );
}