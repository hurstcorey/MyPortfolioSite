import React from "react";
import NavLink from "./NavLink";
import Link from "next/link";

type NavLinkProps = {
    links:Array<Link>;

  };

type Link = {
    title: string;
    path: string;
    };

const MenuOverlay = ({ links } : NavLinkProps) => {
  return (
    <ul className="flex flex-col py-4 items-center">
      {links.map((link, index) => (
        <li key={link.path}>
          <NavLink href={link.path} title={link.title} />
        </li>
      ))}
    </ul>
  );
};

export default MenuOverlay;
