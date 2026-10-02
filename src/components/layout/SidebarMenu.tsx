import { motion, AnimatePresence } from "motion/react";
import type { CategoryConfig } from "../../types/app";

type SidebarMenuProps = {
  categories: CategoryConfig[];
  activeKey: string;
  navigatingKey?: string;
  sidebarCollapsed: boolean;
  isMobile?: boolean;
  authSession?: { username: string; cabang?: string } | null;
  badges?: Record<string, number>;
  onToggle: () => void;
  onResize?: (width: number) => void;
  onCloseMobile?: () => void;
  onSelect: (key: string) => void;
  onChangePassword?: () => void;
};

export function SidebarMenu({
  categories,
  activeKey,
  navigatingKey,
  sidebarCollapsed,
  isMobile = false,
  authSession,
  badges,
  onToggle,
  onResize,
  onCloseMobile,
  onSelect,
  onChangePassword,
}: SidebarMenuProps) {
  return (
    <motion.aside
      className={`sidebar-kaiadmin ${sidebarCollapsed ? "is-collapsed" : ""}`}
      layout
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 32,
        mass: 0.8,
      }}
    >
      <div className="sidebar-kaiadmin-inner">
        {/* Brand Header */}
        <div className="sidebar-brand-wrap">
          <div className="d-flex align-items-center justify-content-between gap-2 w-100 min-w-0">
            <div className="d-flex align-items-center gap-2.5 min-w-0 flex-grow-1">
              <div
                className="sidebar-brand-mark flex-shrink-0 cursor-pointer"
                title={sidebarCollapsed ? "Klik untuk memperluas menu" : "KBM-Qu Portal"}
                onClick={() => {
                  if (!isMobile && onToggle) {
                    onToggle();
                  }
                }}
              >
                <i className="bi bi-mortarboard-fill" />
              </div>
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    key="brand-text"
                    initial={{ opacity: 0, width: 0, x: -10 }}
                    animate={{ opacity: 1, width: "auto", x: 0 }}
                    exit={{ opacity: 0, width: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="sidebar-brand-text flex-grow-1 min-w-0 overflow-hidden text-nowrap"
                  >
                    <div className="sidebar-brand-title">KBM-Qu</div>
                    <div className="sidebar-brand-tagline">Sistem Penjadwalan & KBM</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toggle / Close Buttons */}
            {isMobile && onCloseMobile ? (
              <button
                type="button"
                className="btn btn-sm sidebar-kaiadmin-toggle flex-shrink-0"
                onClick={onCloseMobile}
                aria-label="Tutup menu"
              >
                <i className="bi bi-x-lg" />
              </button>
            ) : !isMobile && onToggle ? (
              <button
                type="button"
                className="btn btn-sm sidebar-kaiadmin-toggle flex-shrink-0 p-1 rounded-circle"
                onClick={onToggle}
                title={sidebarCollapsed ? "Buka Sidebar" : "Ciutkan Sidebar"}
                aria-label={sidebarCollapsed ? "Buka Sidebar" : "Ciutkan Sidebar"}
                style={{ width: 28, height: 28 }}
              >
                <motion.i
                  animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="bi bi-chevron-left"
                />
              </button>
            ) : null}
          </div>

          {/* User Account Info Card */}
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && authSession?.username && (
              <motion.div
                key="user-card"
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="sidebar-user-card d-flex align-items-center justify-content-between overflow-hidden"
              >
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <div className="sidebar-user-avatar">
                    <span>{authSession.username.slice(0, 2).toUpperCase()}</span>
                    <span className="sidebar-user-status" />
                  </div>
                  <div className="sidebar-user-info min-w-0">
                    <div className="sidebar-user-name" title={authSession.username}>
                      {authSession.username}
                    </div>
                    <div className="sidebar-user-role" title={authSession.cabang ? `Cabang: ${authSession.cabang}` : "Akun Aktif"}>
                      <i className="bi bi-geo-alt me-1 text-primary" />
                      {authSession.cabang || "Pusat"}
                    </div>
                  </div>
                </div>
                {onChangePassword && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary border-0 p-1.5 rounded-circle ms-1 d-flex align-items-center justify-content-center flex-shrink-0"
                    title="Ganti Password Akun"
                    aria-label="Ganti Password Akun"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangePassword();
                      if (isMobile && onCloseMobile) {
                        onCloseMobile();
                      }
                    }}
                  >
                    <i className="bi bi-key-fill text-primary" style={{ fontSize: "0.9rem" }} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section Label */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              key="section-label"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="sidebar-section-label overflow-hidden text-nowrap"
            >
              <span>Menu Navigasi</span>
              <span className="sidebar-section-count">{categories.length}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isMobile ? (
          <div
            className="sidebar-resize-handle"
            title="Tarik untuk mengubah lebar sidebar"
            onMouseDown={(event) => {
              event.preventDefault();
              const startX = event.clientX;
              const startWidth = event.currentTarget.closest('.sidebar-kaiadmin')?.clientWidth ?? 240;
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const nextWidth = startWidth + (moveEvent.clientX - startX);
                onResize?.(nextWidth);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          />
        ) : null}

        <div className="sidebar-nav-list">
          {categories.map((category) => {
            const isActive = activeKey === category.key;
            const badgeCount = badges?.[category.key] || 0;

            return (
              <button
                key={category.key}
                type="button"
                onClick={() => {
                  onSelect(category.key);
                  if (isMobile && onCloseMobile) {
                    onCloseMobile();
                  }
                }}
                title={category.name}
                aria-label={category.name}
                className={`sidebar-nav-item ${sidebarCollapsed ? "justify-content-center position-relative" : "justify-content-start"} ${
                  isActive ? "active" : ""
                }`}
              >
                <span className="sidebar-nav-icon position-relative flex-shrink-0">
                  <i className={`bi ${category.icon}`} />
                  {sidebarCollapsed && badgeCount > 0 && (
                    <span
                      className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white fw-bold shadow-sm"
                      style={{ fontSize: "0.6rem", padding: "0.15em 0.38em", transform: "translate(-20%, -20%)" }}
                    >
                      {badgeCount}
                    </span>
                  )}
                </span>

                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span
                      key="nav-label"
                      initial={{ opacity: 0, width: 0, x: -6 }}
                      animate={{ opacity: 1, width: "auto", x: 0 }}
                      exit={{ opacity: 0, width: 0, x: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="sidebar-label overflow-hidden text-nowrap flex-grow-1 text-start"
                    >
                      {category.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {navigatingKey === category.key ? (
                  <span
                    className="spinner-border spinner-border-sm text-primary ms-auto flex-shrink-0"
                    style={{ width: "12px", height: "12px", borderWidth: "1.5px" }}
                  />
                ) : !sidebarCollapsed && badgeCount > 0 ? (
                  <span className="badge rounded-pill bg-danger ms-auto text-xxs px-2 py-0.5 shadow-xs fw-bold flex-shrink-0">
                    {badgeCount}
                  </span>
                ) : null}

                {isActive && !sidebarCollapsed && (
                  <span className="sidebar-active-indicator" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}