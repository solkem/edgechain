import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const MenuItem = ({ label, href }: { label: String; href: String }) => {
  return (
    <Link className=" relative group " to={href}>
      <span className="group-hover:text-white transition-all duration-300 text-black z-20 relative">
        {label}
      </span>
      <div className="w-0 h-full absolute top-0 right-0 bg-black transition-all duration-300 group-hover:w-full group-hover:left-0 z-10"></div>
    </Link>
  );
};

const MobileMenuItem = ({
  label,
  href,
  activeView,
}: {
  label: String;
  href: String;
  activeView: String;
}) => {
  return (
    <Link className={`relative group overflow-hidden`} to={href}>
      <div
        className={`group-hover:text-white transition-all duration-300 z-20 relative pe-5 ${activeView === href ? " px-3 translate-x-0" : " -translate-x-5"} overflow-hidden flex items-center gap-2`}
      >
        <div
          className={`w-3 h-3 bg-black group-hover:bg-white rotate-45 `}
        ></div>
        <span>{label}</span>
      </div>
      <div
        className={`w-0 h-full absolute top-0 right-0 bg-black transition-all duration-300 group-hover:w-full group-hover:left-0 z-10`}
      ></div>
      {activeView === href && (
        <div className="absolute w-[1vw] h-[1vw] rotate-45 bg-white z-20 -bottom-[0.5vw] -right-[0.5vw] "></div>
      )}
    </Link>
  );
};

const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("/");

  const menuItems = [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "About",
      href: "/about",
    },

    {
      label: "Contact",
      href: "/contact",
    },
  ];

  useEffect(()=>{
  }, [])

  return (
    <>
      <div className="flex justify-center items-center absolute top-0 left-0 w-full z-40">
        <div className="mx-7 my-4 w-full flex items-center justify-between h-full relative">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="nav-left px-3 py-1 border-[0.6px] border-gray-300 hover:border-gray-800 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Menu strokeWidth={1} color="black" />
            </div>
          </button>
          <div className="nav-middle md:flex flex-1 justify-center items-center border-t border-b border-gray-300 px-3 py-2 gap-3 uppercase text-xs hidden">
            {menuItems.map((item, index) => (
              <MenuItem key={index} label={item.label} href={item.href} />
            ))}
          </div>
          <button className="nav-right border-[0.6px] border-black bg-[#0000ff] hover:bg-white hover:text-black text-white transition-all duration-300 px-3 py-1 cursor-pointer">
            <Link to={"/register"}>Login</Link>
          </button>
        </div>
      </div>

      <div
        className={`nav-mobile ${isSidebarOpen ? "md:w-2/3 xl:w-1/2 w-full opacity-100" : "w-0 opacity-0"} transition-all duration-300 absolute top-0 left-0 h-full overflow-hidden z-50 `}
      >
        <div className="w-full h-full px-7 py-4">
          <div className="nav-mobile-content grid grid-cols-12 gap-2 justify-center bg-white h-full rounded-xl rounded-tl-none border-[0.6px] border-gray-300">
            <div className="col-span-2 p-4 hidden md:block"></div>
            <div className="nav-mobile-content-item flex flex-col gap-2 text-black text-3xl md:text-5xl uppercase w-fit h-full col-span-10 md:col-span-8 p-4 overflow-hidden">
              {menuItems.map((item, index) => (
                <MobileMenuItem
                  key={index}
                  label={item.label}
                  href={item.href}
                  activeView={activeView}
                />
              ))}
            </div>
            <div className="flex justify-end col-span-2 md:col-span-2">
              <div className="border-s-[0.6px] border-black">
                <div className="border-b-[0.6px] border-black">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="nav-mobile-close h-fit cursor-pointer p-4 hover:rotate-180 transition-all duration-300"
                  >
                    <X />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
