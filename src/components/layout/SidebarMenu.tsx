import type { CategoryConfig } from "../../types/app";

type SidebarMenuProps = {
  categories: CategoryConfig[];
  activeKey: string;
  sidebarCollapsed: boolean;
  isMobile?: boolean;
  authSession?: { username: string; cabang?: string } | null;
  onToggle: () => void;
  onResize?: (width: number) => void;
  onCloseMobile?: () => void;
  onSelect: (key: string) => void;
};

export function SidebarMenu({
  categories,
  activeKey,
  sidebarCollapsed,
  isMobile = false,
  authSession,
  onToggle,
  onResize,
  onCloseMobile,
  onSelect,
}: SidebarMenuProps) {
  return (
    <aside className={`sidebar-kaiadmin ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-kaiadmin-inner">
        {/* Brand Header */}
        <div className="sidebar-brand-wrap">
          <div className="d-flex align-items-center gap-2.5 w-100 min-w-0">
            <div className="sidebar-brand-mark" title="KBM-Qu Portal">
              <i className="bi bi-mortarboard-fill" />
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar-brand-text flex-grow-1 min-w-0">
                <div className="sidebar-brand-title">KBM-Qu</div>
                <div className="sidebar-brand-tagline">Sistem Penjadwalan & KBM</div>
              </div>
            )}
            {isMobile && onCloseMobile ? (
              <button
                type="button"
                className="btn btn-sm sidebar-kaiadmin-toggle"
                onClick={onCloseMobile}
                aria-label="Tutup menu"
              >
                <i className="bi bi-x-lg" />
              </button>
            ) : null}
          </div>

          {/* User Account Info Card */}
          {!sidebarCollapsed && authSession?.username && (
            <div className="sidebar-user-card">
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
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="sidebar-section-label">
            <span>Menu Navigasi</span>
            <span className="sidebar-section-count">{categories.length}</span>
          </div>
        )}

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
                className={`sidebar-nav-item ${sidebarCollapsed ? "justify-content-center" : "justify-content-start"} ${
                  isActive ? "active" : ""
                }`}
              >
                <span className="sidebar-nav-icon">
                  <i className={`bi ${category.icon}`} />
                </span>
                <span className="sidebar-label">{category.name}</span>
                {isActive && !sidebarCollapsed && (
                  <span className="sidebar-active-indicator" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}