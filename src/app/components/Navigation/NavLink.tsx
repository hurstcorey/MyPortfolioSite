"use client";
import Link from "next/link";

type NavLinkProps = {
    title: string;
    href: string;
  };

/** Fired on in-page nav clicks so sections can react (e.g. Engineer selects the Skills tab). */
export const NAV_HASH_EVENT = "nav-hash";

const NavLink = ({ title, href} : NavLinkProps) => {
  const handleClick = () => {
    const hash = href.split("#")[1];
    if (hash) {
      window.dispatchEvent(new CustomEvent(NAV_HASH_EVENT, { detail: hash }));
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="block py-2 pl-3 pr-4 text-[#ADB7BE] sm:text-xl rounded md:p-0 hover:text-white"
    >
      {title}
    </Link>
  );
};

export default NavLink;
